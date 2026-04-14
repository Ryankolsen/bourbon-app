import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Slider } from "@miblanchard/react-native-slider";
import { SearchablePicker } from "@/components/SearchablePicker";
import { useDistilleries } from "@/hooks/use-distilleries";
import {
  BOURBON_TYPES,
  BourbonFilterState,
  BourbonTypeValue,
  DEFAULT_BOURBON_FILTERS,
} from "@/lib/bourbons";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FilterSheetProps {
  visible: boolean;
  filters: BourbonFilterState;
  onApply: (filters: BourbonFilterState) => void;
  onClose: () => void;
  /** When true, renders the "Social activity" sort option (Explore only). */
  showSocialSort?: boolean;
}

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

const BASE_SORT_FIELDS: { label: string; value: string }[] = [
  { label: "Name", value: "name" },
  { label: "Proof", value: "proof" },
  { label: "Age", value: "age_statement" },
  { label: "Avg Rating", value: "avg_rating" },
];

const SOCIAL_SORT_FIELD = { label: "Social activity", value: "social" };

// ---------------------------------------------------------------------------
// Constants for slider bounds
// ---------------------------------------------------------------------------

const PROOF_MIN = 0;
const PROOF_MAX = 200;
const AGE_MIN = 0;
const AGE_MAX = 30;

// ---------------------------------------------------------------------------
// FilterSheet
// ---------------------------------------------------------------------------

/**
 * Bottom sheet (slide-up Modal) containing all bourbon filter and sort controls.
 * Operates on a local copy of filter state; changes are applied only when the
 * user taps Apply.
 */
export function FilterSheet({ visible, filters, onApply, onClose, showSocialSort = false }: FilterSheetProps) {
  const insets = useSafeAreaInsets();

  // ---- Local draft state (committed to parent only on Apply) ----
  const [draft, setDraft] = useState<BourbonFilterState>(filters);
  const [distillerySearch, setDistillerySearch] = useState(draft.distillery ?? "");

  const { distilleries, isLoading: distilleriesLoading } = useDistilleries(distillerySearch);

  // Reset draft whenever sheet opens so it reflects current applied state.
  // We use onShow via the visible prop flip rather than an effect to avoid
  // drift when the sheet is closed without applying.
  function handleShow() {
    setDraft(filters);
    setDistillerySearch(filters.distillery ?? "");
  }

  // ---- Type chips ----
  function toggleType(value: BourbonTypeValue) {
    setDraft((d) => {
      const next = d.types.includes(value)
        ? d.types.filter((t) => t !== value)
        : [...d.types, value];
      return { ...d, types: next };
    });
  }

  // ---- Proof slider ----
  function handleProofChange(values: number[]) {
    setDraft((d) => ({
      ...d,
      proofMin: values[0] === PROOF_MIN ? null : values[0],
      proofMax: values[1] === PROOF_MAX ? null : values[1],
    }));
  }

  const proofSliderValue = [
    draft.proofMin ?? PROOF_MIN,
    draft.proofMax ?? PROOF_MAX,
  ];

  // ---- Age slider ----
  function handleAgeChange(values: number[]) {
    setDraft((d) => ({
      ...d,
      ageMin: values[0] === AGE_MIN ? null : values[0],
      ageMax: values[1] === AGE_MAX ? null : values[1],
    }));
  }

  const ageSliderValue = [
    draft.ageMin ?? AGE_MIN,
    draft.ageMax ?? AGE_MAX,
  ];

  // ---- Distillery ----
  function handleDistilleryChange(value: string) {
    setDistillerySearch(value);
    setDraft((d) => ({ ...d, distillery: value || null }));
  }

  const sortFields = showSocialSort
    ? [...BASE_SORT_FIELDS, SOCIAL_SORT_FIELD]
    : BASE_SORT_FIELDS;

  // ---- Sort ----
  function selectSortField(field: string) {
    setDraft((d) => ({
      ...d,
      sortField: d.sortField === field ? null : field,
    }));
  }

  function toggleSortDirection() {
    setDraft((d) => ({ ...d, sortAscending: !d.sortAscending }));
  }

  // ---- Actions ----
  function handleApply() {
    onApply(draft);
    onClose();
  }

  function handleClear() {
    setDraft(DEFAULT_BOURBON_FILTERS);
    setDistillerySearch("");
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleShow}
    >
      <TouchableOpacity
        className="flex-1 justify-end bg-black/60"
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Prevent taps inside the sheet from propagating to the overlay */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          className="bg-bourbon-900 rounded-t-2xl"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 pt-4 pb-3 border-b border-bourbon-700">
            <Text className="text-bourbon-100 text-lg font-bold">Filter & Sort</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text className="text-bourbon-400 text-xl">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="px-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ---- Type ---- */}
            <Section label="Type">
              <View className="flex-row flex-wrap gap-2">
                {BOURBON_TYPES.map(({ label, value }) => {
                  const selected = draft.types.includes(value);
                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => toggleType(value)}
                      className={`px-3 py-1.5 rounded-full border ${
                        selected
                          ? "bg-bourbon-600 border-bourbon-600"
                          : "bg-bourbon-800 border-bourbon-700"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          selected ? "text-white" : "text-bourbon-300"
                        }`}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>

            {/* ---- Proof ---- */}
            <Section label={`Proof: ${proofSliderValue[0]}–${proofSliderValue[1]}`}>
              <Slider
                value={proofSliderValue}
                minimumValue={PROOF_MIN}
                maximumValue={PROOF_MAX}
                step={1}
                onValueChange={(values) =>
                  handleProofChange(Array.isArray(values) ? values : [values])
                }
                minimumTrackTintColor="#c47b2a"
                maximumTrackTintColor="#3a2a1a"
                thumbTintColor="#e39e38"
              />
            </Section>

            {/* ---- Age ---- */}
            <Section label="Age">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-bourbon-300 text-sm">NAS only</Text>
                <Switch
                  value={draft.nasOnly}
                  onValueChange={(v) => setDraft((d) => ({ ...d, nasOnly: v }))}
                  trackColor={{ false: "#3a2a1a", true: "#c47b2a" }}
                  thumbColor="#e39e38"
                />
              </View>
              {!draft.nasOnly && (
                <>
                  <Text className="text-bourbon-400 text-xs mb-1">
                    {ageSliderValue[0]}–{ageSliderValue[1]} yr
                  </Text>
                  <Slider
                    value={ageSliderValue}
                    minimumValue={AGE_MIN}
                    maximumValue={AGE_MAX}
                    step={1}
                    onValueChange={(values) =>
                      handleAgeChange(Array.isArray(values) ? values : [values])
                    }
                    minimumTrackTintColor="#c47b2a"
                    maximumTrackTintColor="#3a2a1a"
                    thumbTintColor="#e39e38"
                  />
                </>
              )}
            </Section>

            {/* ---- Distillery ---- */}
            <Section label="Distillery">
              <SearchablePicker
                data={distilleries}
                value={distillerySearch}
                onChange={handleDistilleryChange}
                placeholder="Search distillery..."
                isLoading={distilleriesLoading}
              />
            </Section>

            {/* ---- Sort ---- */}
            <Section label="Sort by">
              <View className="flex-row flex-wrap gap-2 mb-3">
                {sortFields.map((sf) => {
                  const selected = draft.sortField === sf.value;
                  return (
                    <TouchableOpacity
                      key={sf.value}
                      onPress={() => selectSortField(sf.value)}
                      className={`px-3 py-1.5 rounded-full border ${
                        selected
                          ? "bg-bourbon-600 border-bourbon-600"
                          : "bg-bourbon-800 border-bourbon-700"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          selected ? "text-white" : "text-bourbon-300"
                        }`}
                      >
                        {sf.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {draft.sortField && draft.sortField !== "social" && (
                <TouchableOpacity
                  onPress={toggleSortDirection}
                  className="flex-row items-center gap-2"
                >
                  <Text className="text-bourbon-400 text-sm">
                    {draft.sortAscending ? "↑ Ascending" : "↓ Descending"}
                  </Text>
                </TouchableOpacity>
              )}
            </Section>

            {/* Spacer so content clears the action buttons */}
            <View className="h-4" />
          </ScrollView>

          {/* ---- Action buttons ---- */}
          <View className="flex-row gap-3 px-4 pt-3 border-t border-bourbon-700">
            <TouchableOpacity
              onPress={handleClear}
              className="flex-1 border border-bourbon-600 rounded-xl py-3 items-center"
            >
              <Text className="text-bourbon-300 font-medium">Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              className="flex-1 bg-bourbon-600 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-bold">Apply</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Section helper
// ---------------------------------------------------------------------------

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mt-4">
      <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wide mb-2">
        {label}
      </Text>
      {children}
    </View>
  );
}
