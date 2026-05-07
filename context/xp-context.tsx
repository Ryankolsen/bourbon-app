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
 * Public interface: { current, advance, latestPromotion }
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
import { getTomorrowXp, TomorrowXp } from "@/lib/streak-utils";

// ── Types ────────────────────────────────────────────────────────────────────

export interface XpNotification {
  id: string;
  xpAwarded: number;
  eventType: string;
  label: string;
  promoted: boolean;
  newBelt: number;
  /** Streak day count at time of the event (populated for daily_checkin). */
  streakDays?: number;
  /** True when the streak was broken and reset to Day 1 (populated for daily_checkin). */
  isReset?: boolean;
  /** Tomorrow's XP breakdown (populated for daily_checkin). */
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
}

// ── Context ──────────────────────────────────────────────────────────────────

const XpContext = createContext<XpContextValue>({
  current: null,
  advance: () => {},
  latestPromotion: null,
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  /** Tracks notification IDs already added to the queue (deduplication). */
  const seenIds = useRef<Set<string>>(new Set());
  /** Tracks previous streak day count for isReset detection. */
  const prevStreakRef = useRef<number | null>(null);

  const advance = useCallback(() => {
    setQueue((prev) => prev.slice(1));
  }, []);

  // ── check_in() RPC ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;

    const today = new Date().toISOString().slice(0, 10);
    const checkInId = `daily_checkin-${today}`;

    // Pre-register the date-keyed ID before the async RPC resolves. This
    // blocks a concurrent Realtime event (which uses the same date-keyed ID
    // for daily_checkin rows) from producing a duplicate notification.
    // Also handles the rare case where Realtime fired before this effect ran.
    if (seenIds.current.has(checkInId)) return;
    seenIds.current.add(checkInId);

    let cancelled = false;

    async function runCheckIn() {
      const { data, error } = await supabase.rpc("check_in");
      if (cancelled) return;
      if (error || !data || data.length === 0) return;

      const row = data[0];
      if (row.xp_awarded === 0) return;

      const streakDays: number = row.streak_days;
      const prevStreak = prevStreakRef.current;
      const isReset = streakDays === 1 && prevStreak !== null && prevStreak > 1;
      prevStreakRef.current = streakDays;

      const promoted: boolean = row.promoted ?? false;
      const newBelt: number = row.new_belt ?? 1;

      if (promoted) {
        setLatestPromotion({ belt: newBelt, id: checkInId });
      }

      setQueue((prev) => [
        ...prev,
        {
          id: checkInId,
          xpAwarded: row.xp_awarded as number,
          eventType: "daily_checkin",
          label: getXpEventLabel("daily_checkin"),
          promoted,
          newBelt,
          streakDays,
          isReset,
          tomorrowXp: getTomorrowXp(streakDays),
        },
      ]);

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

          // daily_checkin events use the same date-keyed format as the RPC
          // path so both delivery mechanisms share the same dedup ID.
          const today = new Date().toISOString().slice(0, 10);
          const notifId: string =
            row.event_type === "daily_checkin"
              ? `daily_checkin-${today}`
              : (row.id as string) ?? nextNotifId();

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

          // Invalidate the user-xp query so profile displays refresh
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
    <XpContext.Provider value={{ current, advance, latestPromotion }}>
      {children}
    </XpContext.Provider>
  );
}
