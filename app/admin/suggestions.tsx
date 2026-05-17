import { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/hooks/use-auth";
import { isAdmin } from "@/lib/admin";
import {
  useBourbonSuggestions,
  useApproveSuggestion,
  useRejectSuggestion,
  type SuggestionRow,
} from "@/hooks/use-bourbon-suggestions";
import { useTheme } from "@/lib/theme-provider";
import { colors } from "@/lib/colors";
import { useToast } from "@/lib/toast-provider";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayValue(value: string | null): string {
  if (value === null || value === "") return "(empty)";
  return value;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface ConflictGroup {
  /** Key = `${bourbon_id}:${field_name}` */
  key: string;
  bourbonName: string;
  fieldName: string;
  suggestions: SuggestionRow[];
}

// ── Grouping ──────────────────────────────────────────────────────────────────

/**
 * Groups suggestions by bourbon_id + field_name (conflict detection).
 * Groups are ordered by the earliest created_at in each group (oldest first).
 */
function groupSuggestions(rows: SuggestionRow[]): ConflictGroup[] {
  const map = new Map<string, ConflictGroup>();

  for (const row of rows) {
    const key = `${row.bourbon_id}:${row.field_name}`;
    const existing = map.get(key);
    if (existing) {
      existing.suggestions.push(row);
    } else {
      map.set(key, {
        key,
        bourbonName: row.bourbons?.name ?? row.bourbon_id,
        fieldName: row.field_name,
        suggestions: [row],
      });
    }
  }

  return Array.from(map.values());
}

// ── SuggestionCard ────────────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  onApprove,
  onReject,
  isConflicting,
}: {
  suggestion: SuggestionRow;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isConflicting: boolean;
}) {
  const submitter =
    suggestion.profiles?.display_name ?? suggestion.submitted_by ?? "Unknown";

  return (
    <View
      className="bg-brand-800 rounded-2xl p-4 mb-2"
      testID="suggestion-card"
    >
      {isConflicting && (
        <View className="bg-brand-700 rounded-lg px-2 py-1 self-start mb-2">
          <Text className="text-surface-text text-xs font-medium">⚠️ Conflicting</Text>
        </View>
      )}

      <View className="flex-row items-start mb-2">
        <View className="flex-1">
          <Text className="text-brand-100 text-sm font-semibold">
            {displayValue(suggestion.old_value)}
            {" → "}
            <Text className="text-brand-400">{displayValue(suggestion.new_value)}</Text>
          </Text>
          <Text className="text-brand-400 text-xs mt-1">
            by {submitter} · {formatDate(suggestion.created_at)}
          </Text>
        </View>
      </View>

      <View className="flex-row gap-3 mt-1">
        <TouchableOpacity
          onPress={() => onApprove(suggestion.id)}
          className="flex-1 bg-brand-600 rounded-xl py-2 items-center"
          testID="approve-button"
          accessibilityLabel="Approve suggestion"
        >
          <Text className="text-white font-semibold text-sm">Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onReject(suggestion.id)}
          className="flex-1 bg-brand-800 border border-brand-600 rounded-xl py-2 items-center"
          testID="reject-button"
          accessibilityLabel="Reject suggestion"
        >
          <Text className="text-brand-300 font-semibold text-sm">Reject</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── GroupSection ──────────────────────────────────────────────────────────────

function GroupSection({
  group,
  onApprove,
  onReject,
}: {
  group: ConflictGroup;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const isConflicting = group.suggestions.length > 1;

  return (
    <View className="mb-4 mx-4">
      {/* Group header */}
      <View className="mb-2">
        <Text className="text-brand-100 font-bold text-base">{group.bourbonName}</Text>
        <Text className="text-brand-400 text-xs capitalize">{group.fieldName.replace(/_/g, " ")}</Text>
      </View>

      {group.suggestions.map((s) => (
        <SuggestionCard
          key={s.id}
          suggestion={s}
          onApprove={onApprove}
          onReject={onReject}
          isConflicting={isConflicting}
        />
      ))}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function SuggestionsScreen() {
  const { user } = useAuth();
  const { activeTheme } = useTheme();
  const c = activeTheme.colors;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const adminUser = !!(user?.email && isAdmin(user.email));

  const { showToast } = useToast();
  const { data: suggestions = [], isLoading } = useBourbonSuggestions();
  const approve = useApproveSuggestion();
  const reject = useRejectSuggestion();

  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const groups = groupSuggestions(suggestions);

  function handleApprove(suggestionId: string) {
    setPendingAction(suggestionId);
    approve.mutate(
      { suggestionId },
      {
        onSuccess: () => showToast("Suggestion approved"),
        onError: (err) => showToast(err instanceof Error ? err.message : "Failed to approve", "error"),
        onSettled: () => setPendingAction(null),
      }
    );
  }

  function handleReject(suggestionId: string) {
    if (!user?.id) return;
    Alert.alert("Reject suggestion", "Are you sure you want to reject this suggestion?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: () => {
          setPendingAction(suggestionId);
          reject.mutate(
            { suggestionId, reviewedBy: user.id },
            {
              onSuccess: () => showToast("Suggestion rejected"),
              onError: (err) => showToast(err instanceof Error ? err.message : "Failed to reject", "error"),
              onSettled: () => setPendingAction(null),
            }
          );
        },
      },
    ]);
  }

  // Non-admins should never reach this screen (tab is hidden), but guard anyway.
  if (!adminUser) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-900">
        <Text className="text-brand-400 text-base">Access denied.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-900" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3 border-b"
        style={{ borderBottomColor: c.tabBorder }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3"
          accessibilityLabel="Go back"
        >
          <Text className="text-brand-400 text-base">‹ Back</Text>
        </TouchableOpacity>
        <Text className="text-brand-100 text-lg font-bold flex-1">
          Pending Suggestions
        </Text>
        {suggestions.length > 0 && (
          <View
            style={{
              backgroundColor: colors.badgeError,
              borderRadius: 10,
              minWidth: 20,
              height: 20,
              paddingHorizontal: 5,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "bold" }}>
              {suggestions.length}
            </Text>
          </View>
        )}
      </View>

      {isLoading || pendingAction !== null ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.spinnerDefault} />
        </View>
      ) : groups.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-4xl mb-4">✅</Text>
          <Text className="text-brand-100 text-xl font-bold mb-2">All caught up!</Text>
          <Text className="text-brand-400 text-center text-sm">
            No pending suggestions to review.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.key}
          renderItem={({ item: group }) => (
            <GroupSection
              group={group}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        />
      )}
    </View>
  );
}
