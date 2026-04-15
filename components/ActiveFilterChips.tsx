import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { BourbonFilterState, BourbonTypeValue, DEFAULT_BOURBON_FILTERS, getBourbonTypeLabel } from "@/lib/bourbons";

export interface ActiveFilterChipsProps {
  filters: BourbonFilterState;
  onClearType: (type: BourbonTypeValue) => void;
  onClearProof: () => void;
  onClearAge: () => void;
  onClearDistillery: () => void;
  onClearSort: () => void;
}

/**
 * Horizontally scrollable row of chips showing active filters.
 * Controlled — holds no internal state. Returns null when no filters are active.
 */
export function ActiveFilterChips({
  filters,
  onClearType,
  onClearProof,
  onClearAge,
  onClearDistillery,
  onClearSort,
}: ActiveFilterChipsProps) {
  const chips: React.ReactNode[] = [];

  // Type chips — one per selected type
  for (const type of filters.types) {
    chips.push(
      <Chip
        key={`type-${type}`}
        label={getBourbonTypeLabel(type)}
        clearTestId={`clear-type-${type}`}
        onClear={() => onClearType(type)}
      />
    );
  }

  // Proof range chip
  const hasProof = filters.proofMin !== null || filters.proofMax !== null;
  if (hasProof) {
    const label =
      filters.proofMin !== null && filters.proofMax !== null
        ? `${filters.proofMin}–${filters.proofMax} proof`
        : filters.proofMin !== null
        ? `≥${filters.proofMin} proof`
        : `≤${filters.proofMax} proof`;
    chips.push(
      <Chip
        key="proof"
        label={label}
        clearTestId="clear-proof"
        onClear={onClearProof}
      />
    );
  }

  // Age / NAS chip
  if (filters.nasOnly) {
    chips.push(
      <Chip
        key="nas"
        label="NAS only"
        clearTestId="clear-age"
        onClear={onClearAge}
      />
    );
  } else if (filters.ageMin !== null || filters.ageMax !== null) {
    const label =
      filters.ageMin !== null && filters.ageMax !== null
        ? `${filters.ageMin}–${filters.ageMax} yr`
        : filters.ageMin !== null
        ? `≥${filters.ageMin} yr`
        : `≤${filters.ageMax} yr`;
    chips.push(
      <Chip
        key="age"
        label={label}
        clearTestId="clear-age"
        onClear={onClearAge}
      />
    );
  }

  // Distillery chip
  if (filters.distillery !== null) {
    chips.push(
      <Chip
        key="distillery"
        label={filters.distillery}
        clearTestId="clear-distillery"
        onClear={onClearDistillery}
      />
    );
  }

  // Sort chip
  if (filters.sortField !== null) {
    const isSocial = filters.sortField === "social";
    const direction = filters.sortAscending ? "↑" : "↓";
    const label = isSocial
      ? "Sort: Social activity"
      : `Sort: ${filters.sortField} ${direction}`;
    chips.push(
      <Chip
        key="sort"
        label={label}
        clearTestId="clear-sort"
        onClear={onClearSort}
      />
    );
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <ScrollView
      testID="active-filter-chips"
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="px-4 py-1 gap-2"
      style={{ flexGrow: 0 }}
    >
      {chips}
    </ScrollView>
  );
}

// ── Internal chip ─────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  clearTestId: string;
  onClear: () => void;
}

function Chip({ label, clearTestId, onClear }: ChipProps) {
  return (
    <View className="flex-row items-center bg-bourbon-700 rounded-full px-3 py-1 gap-1">
      <Text className="text-bourbon-100 text-xs">{label}</Text>
      <TouchableOpacity testID={clearTestId} onPress={onClear} hitSlop={4}>
        <Text className="text-bourbon-400 text-xs">×</Text>
      </TouchableOpacity>
    </View>
  );
}
