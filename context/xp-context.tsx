/**
 * XpContext — client-side XP notification system.
 *
 * Owns the entire XP notification lifecycle:
 * 1. Calls check_in() RPC once per authenticated session
 * 2. Subscribes to xp_events Realtime channel for INSERT events
 * 3. Deduplicates notifications from both paths via a seen-IDs set
 * 4. Manages the sequential display queue
 * 5. Invalidates user-xp TanStack Query cache on each event
 * 6. Emits a latestPromotion signal for belt-up events
 *
 * daily_checkin is routed to dailyBonus state (not the toast queue).
 * All other XP events continue through the toast queue.
 *
 * Public interface: { current, advance, latestPromotion, dailyBonus, claimDailyBonus }
 * enqueue is an internal detail — callers never push directly.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/query-client";
import { getXpEventLabel } from "@/lib/belt-config";
import { useAuth } from "@/hooks/use-auth";
import { TomorrowXp } from "@/lib/streak-utils";
import { evaluateDailyBonus, DailyBonusDecision } from "@/lib/daily-bonus";

// ── Types ────────────────────────────────────────────────────────────────────

export interface XpNotification {
  id: string;
  xpAwarded: number;
  eventType: string;
  label: string;
  promoted: boolean;
  newBelt: number;
  streakDays?: number;
  isReset?: boolean;
  tomorrowXp?: TomorrowXp | null;
}

interface XpContextValue {
  /** The currently-displayed notification, or null when the queue is empty. */
  current: XpNotification | null;
  /** Advance the queue — called by XpToast after the toast auto-dismisses. */
  advance: () => void;
  /**
   * The most recent belt promotion event, or null if none has occurred this
   * session. Independent of the display queue — advance() does not clear it.
   */
  latestPromotion: { belt: number; id: string } | null;
  /** Set when check_in() returns xp_awarded > 0. Cleared by claimDailyBonus(). */
  dailyBonus: DailyBonusDecision | null;
  /** Dismiss the daily-bonus screen (called by DailyBonusScreen Claim button). */
  claimDailyBonus: () => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

const XpContext = createContext<XpContextValue>({
  current: null,
  advance: () => {},
  latestPromotion: null,
  dailyBonus: null,
  claimDailyBonus: () => {},
});

export function useXpNotification(): XpContextValue {
  return useContext(XpContext);
}

// ── Provider ─────────────────────────────────────────────────────────────────

let _notifSeq = 0;
function nextNotifId(): string {
  return `xp-notif-${++_notifSeq}`;
}

export function XpProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [queue, setQueue] = useState<XpNotification[]>([]);
  const [latestPromotion, setLatestPromotion] = useState<{ belt: number; id: string } | null>(null);
  const [dailyBonus, setDailyBonus] = useState<DailyBonusDecision | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  /** Tracks notification IDs already processed (deduplication). */
  const seenIds = useRef<Set<string>>(new Set());

  const advance = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  const claimDailyBonus = useCallback(() => {
    setDailyBonus(null);
  }, []);

  // ── check_in() RPC ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    const today = new Date().toISOString().slice(0, 10);
    const checkInId = `daily_checkin-${today}`;

    // Pre-register the date-keyed ID before the async RPC resolves so a
    // concurrent Realtime event with the same ID doesn't produce a duplicate.
    if (seenIds.current.has(checkInId)) return;
    seenIds.current.add(checkInId);

    let cancelled = false;

    async function runCheckIn() {
      const { data, error } = await supabase.rpc("check_in");
      if (cancelled) return;
      if (error || !data || data.length === 0) return;

      const row = data[0];

      const promoted: boolean = row.promoted ?? false;
      const newBelt: number = row.new_belt ?? 1;

      if (promoted) {
        setLatestPromotion({ belt: newBelt, id: checkInId });
      }

      const decision = evaluateDailyBonus({ checkInResult: row, today });
      if (decision.shouldShow) {
        setDailyBonus(decision);
      }

      queryClient.invalidateQueries({ queryKey: ["user-xp", userId] });
    }

    runCheckIn();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // ── Realtime subscription ─────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`xp_events:${user.id}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "xp_events",
          filter: `user_id=eq.${user.id}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const row = payload.new;
          if (!row || row.xp_awarded === 0) return;

          // daily_checkin is handled exclusively via check_in() RPC; skip here.
          if (row.event_type === "daily_checkin") return;

          const notifId: string = (row.id as string) ?? nextNotifId();

          if (seenIds.current.has(notifId)) return;
          seenIds.current.add(notifId);

          const promoted = (row.promoted as boolean) ?? false;
          const newBelt = (row.new_belt as number) ?? 1;

          const notification: XpNotification = {
            id: notifId,
            xpAwarded: row.xp_awarded as number,
            eventType: row.event_type as string,
            label: getXpEventLabel(row.event_type as string),
            promoted,
            newBelt,
          };

          if (promoted) {
            setLatestPromotion({ belt: newBelt, id: notifId });
          }

          setQueue((prev) => [...prev, notification]);

          queryClient.invalidateQueries({ queryKey: ["user-xp", user.id] });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id]);

  const current = queue[0] ?? null;

  return (
    <XpContext.Provider value={{ current, advance, latestPromotion, dailyBonus, claimDailyBonus }}>
      {children}
    </XpContext.Provider>
  );
}
