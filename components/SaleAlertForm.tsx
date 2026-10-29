import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/lib/theme-provider";
import { colors } from "@/lib/colors";
import { useSearchSimilarBourbons } from "@/hooks/use-bourbons";
import { useCreateSaleAlert } from "@/hooks/use-sale-alerts";
import { searchPlaces, hasPlacesApiKey } from "@/lib/places";
import type { PlacePrediction } from "@/lib/places";
import { useToast } from "@/lib/toast-provider";
import { AccessiblePressable } from "@/components/AccessiblePressable";
import { Heading } from "@/components/Heading";
import { LabeledTextInput } from "@/components/LabeledTextInput";

interface SaleAlertFormProps {
  groupId: string;
  userId: string;
  visible: boolean;
  onClose: () => void;
}

interface SelectedBourbon {
  id: string;
  name: string;
  distillery: string | null;
}

const PLACES_DEBOUNCE_MS = 400;

export function SaleAlertForm({ groupId, userId, visible, onClose }: SaleAlertFormProps) {
  const { activeTheme } = useTheme();
  const { showToast } = useToast();
  const createAlert = useCreateSaleAlert();

  // Bourbon search state
  const [bourbonQuery, setBourbonQuery] = useState("");
  const [selectedBourbon, setSelectedBourbon] = useState<SelectedBourbon | null>(null);
  const [showBourbonResults, setShowBourbonResults] = useState(false);

  // Store search state
  const [storeQuery, setStoreQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<PlacePrediction | null>(null);
  const [showPlaceResults, setShowPlaceResults] = useState(false);
  const [placeResults, setPlaceResults] = useState<PlacePrediction[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  // Manual fallback state (when no Places API key)
  const [manualStoreName, setManualStoreName] = useState("");
  const [manualStoreAddress, setManualStoreAddress] = useState("");

  const usePlacesAutocomplete = hasPlacesApiKey();

  // Price + note
  const [price, setPrice] = useState("");
  const [note, setNote] = useState("");

  const [submitAttempted, setSubmitAttempted] = useState(false);

  const placesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bourbonSearchQuery = useSearchSimilarBourbons(
    showBourbonResults || !selectedBourbon ? bourbonQuery : ""
  );

  function reset() {
    setBourbonQuery("");
    setSelectedBourbon(null);
    setShowBourbonResults(false);
    setStoreQuery("");
    setSelectedPlace(null);
    setShowPlaceResults(false);
    setPlaceResults([]);
    setManualStoreName("");
    setManualStoreAddress("");
    setPrice("");
    setNote("");
    setSubmitAttempted(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  // Places autocomplete debounce
  useEffect(() => {
    if (!usePlacesAutocomplete) return;
    if (placesDebounceRef.current) clearTimeout(placesDebounceRef.current);

    if (storeQuery.trim().length < 3) {
      setPlaceResults([]);
      setShowPlaceResults(false);
      return;
    }

    placesDebounceRef.current = setTimeout(async () => {
      setPlacesLoading(true);
      try {
        const results = await searchPlaces(storeQuery);
        setPlaceResults(results);
        setShowPlaceResults(results.length > 0);
      } finally {
        setPlacesLoading(false);
      }
    }, PLACES_DEBOUNCE_MS);

    return () => {
      if (placesDebounceRef.current) clearTimeout(placesDebounceRef.current);
    };
  }, [storeQuery, usePlacesAutocomplete]);

  function handleSelectBourbon(bourbon: SelectedBourbon) {
    setSelectedBourbon(bourbon);
    setBourbonQuery(bourbon.name);
    setShowBourbonResults(false);
  }

  function handleSelectPlace(place: PlacePrediction) {
    setSelectedPlace(place);
    setStoreQuery(place.place_name);
    setShowPlaceResults(false);
    setPlaceResults([]);
  }

  function handleBourbonQueryChange(text: string) {
    setBourbonQuery(text);
    if (selectedBourbon && text !== selectedBourbon.name) {
      setSelectedBourbon(null);
    }
    setShowBourbonResults(text.trim().length >= 3);
  }

  function handleStoreQueryChange(text: string) {
    setStoreQuery(text);
    if (selectedPlace && text !== selectedPlace.place_name) {
      setSelectedPlace(null);
    }
  }

  // Validation
  const hasPlace = usePlacesAutocomplete
    ? selectedPlace !== null
    : manualStoreName.trim().length > 0 && manualStoreAddress.trim().length > 0;

  const canSubmit =
    selectedBourbon !== null &&
    hasPlace &&
    price.trim().length > 0 &&
    !createAlert.isPending;

  const errors = submitAttempted
    ? {
        bourbon: selectedBourbon === null ? "Bourbon is required" : undefined,
        store: usePlacesAutocomplete
          ? selectedPlace === null
            ? "Store is required"
            : undefined
          : undefined,
        storeName:
          !usePlacesAutocomplete && manualStoreName.trim().length === 0
            ? "Store name is required"
            : undefined,
        storeAddress:
          !usePlacesAutocomplete && manualStoreAddress.trim().length === 0
            ? "Store address is required"
            : undefined,
        price: price.trim().length === 0 ? "Price is required" : undefined,
      }
    : {};

  function handleSubmit() {
    if (createAlert.isPending) return;
    if (!canSubmit || !selectedBourbon) {
      setSubmitAttempted(true);
      return;
    }

    const placeId = selectedPlace?.place_id ?? `manual-${Date.now()}`;
    const placeName = selectedPlace?.place_name ?? manualStoreName.trim();
    const placeAddress = selectedPlace?.place_address ?? manualStoreAddress.trim();

    const priceFormatted = price.trim().startsWith("$")
      ? price.trim()
      : `$${price.trim()}`;

    createAlert.mutate(
      {
        groupId,
        bourbonId: selectedBourbon.id,
        userId,
        price: priceFormatted,
        placeId,
        placeName,
        placeAddress,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          showToast("Sale alert posted!", "success");
          handleClose();
        },
        onError: (err) => {
          showToast(
            err instanceof Error ? err.message : "Failed to post sale alert.",
            "error"
          );
        },
      }
    );
  }

  const bourbonResults = bourbonSearchQuery.data ?? [];
  const bourbonLoading = bourbonSearchQuery.isFetching;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
      testID="sale-alert-form-modal"
    >
      <SafeAreaView className="flex-1 bg-brand-900">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-brand-700">
            <Heading className="text-brand-100 font-bold text-base">Add Sale Alert</Heading>
            <AccessiblePressable onPress={handleClose} accessibilityLabel="Close" testID="sale-alert-form-close">
              <Text className="text-brand-400 text-base">✕</Text>
            </AccessiblePressable>
          </View>

          <ScrollView
            className="flex-1 px-4 pt-4"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 32 }}
          >
            {/* ── Bourbon search ──────────────────────────────────────────── */}
            <LabeledTextInput
              label="Bourbon *"
              labelClassName="text-brand-300 text-sm font-semibold"
              value={bourbonQuery}
              onChangeText={handleBourbonQueryChange}
              placeholder="Search bourbons…"
              placeholderTextColor={activeTheme.colors.placeholderGroup}
              className="bg-brand-800 rounded-xl px-4 py-3 text-brand-100 text-sm mb-1"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="search"
              error={errors.bourbon}
              testID="bourbon-search-input"
            />

            {/* Bourbon results */}
            {showBourbonResults && (
              <View
                className="bg-brand-800 rounded-xl mb-3 overflow-hidden border border-brand-700"
                testID="bourbon-results-list"
              >
                {bourbonLoading ? (
                  <View className="py-4 items-center">
                    <ActivityIndicator color={colors.spinnerDefault} size="small" />
                  </View>
                ) : bourbonResults.length === 0 ? (
                  <View className="py-4 px-4">
                    <Text className="text-brand-500 text-sm">No results</Text>
                  </View>
                ) : (
                  <FlatList
                    data={bourbonResults}
                    keyExtractor={(b) => b.id}
                    scrollEnabled={false}
                    renderItem={({ item: b }) => (
                      <AccessiblePressable
                        className="px-4 py-3 border-b border-brand-700"
                        onPress={() =>
                          handleSelectBourbon({
                            id: b.id,
                            name: b.name,
                            distillery: b.distillery ?? null,
                          })
                        }
                        accessibilityLabel={b.name}
                        testID={`bourbon-result-${b.id}`}
                      >
                        <Text className="text-brand-100 text-sm font-semibold">
                          {b.name}
                        </Text>
                        {b.distillery ? (
                          <Text className="text-brand-400 text-xs mt-0.5">
                            {b.distillery}
                          </Text>
                        ) : null}
                      </AccessiblePressable>
                    )}
                  />
                )}
              </View>
            )}

            {selectedBourbon && !showBourbonResults ? (
              <View className="flex-row items-center bg-brand-800/60 rounded-xl px-3 py-2 mb-3 border border-amber-600/40">
                <Text className="text-amber-500 text-xs mr-1">✓</Text>
                <Text className="text-brand-100 text-sm flex-1" numberOfLines={1}>
                  {selectedBourbon.name}
                </Text>
                <AccessiblePressable
                  onPress={() => {
                    setSelectedBourbon(null);
                    setBourbonQuery("");
                  }}
                  accessibilityLabel="Clear bourbon"
                  testID="bourbon-clear"
                >
                  <Text className="text-brand-500 text-xs">Clear</Text>
                </AccessiblePressable>
              </View>
            ) : null}

            {/* ── Store search ─────────────────────────────────────────────── */}
            <Text className="text-brand-300 text-sm font-semibold mb-1 mt-2">
              Store *
            </Text>

            {usePlacesAutocomplete ? (
              <>
                <LabeledTextInput
                  label="Store search"
                  hideLabel
                  value={storeQuery}
                  onChangeText={handleStoreQueryChange}
                  placeholder="Search for a store…"
                  placeholderTextColor={activeTheme.colors.placeholderGroup}
                  className="bg-brand-800 rounded-xl px-4 py-3 text-brand-100 text-sm mb-1"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="search"
                  error={errors.store}
                  testID="store-search-input"
                />

                {/* Places loading indicator */}
                {placesLoading && (
                  <View className="py-2 items-center mb-1">
                    <ActivityIndicator color={colors.spinnerDefault} size="small" />
                  </View>
                )}

                {/* Place results */}
                {showPlaceResults && !placesLoading && (
                  <View
                    className="bg-brand-800 rounded-xl mb-3 overflow-hidden border border-brand-700"
                    testID="place-results-list"
                  >
                    <FlatList
                      data={placeResults}
                      keyExtractor={(p) => p.place_id}
                      scrollEnabled={false}
                      renderItem={({ item: p }) => (
                        <AccessiblePressable
                          className="px-4 py-3 border-b border-brand-700"
                          onPress={() => handleSelectPlace(p)}
                          accessibilityLabel={p.place_name}
                          testID={`place-result-${p.place_id}`}
                        >
                          <Text className="text-brand-100 text-sm font-semibold">
                            {p.place_name}
                          </Text>
                          {p.place_address ? (
                            <Text className="text-brand-400 text-xs mt-0.5">
                              {p.place_address}
                            </Text>
                          ) : null}
                        </AccessiblePressable>
                      )}
                    />
                  </View>
                )}

                {selectedPlace && !showPlaceResults ? (
                  <View className="flex-row items-center bg-brand-800/60 rounded-xl px-3 py-2 mb-3 border border-amber-600/40">
                    <Text className="text-amber-500 text-xs mr-1">✓</Text>
                    <View className="flex-1">
                      <Text className="text-brand-100 text-sm" numberOfLines={1}>
                        {selectedPlace.place_name}
                      </Text>
                      {selectedPlace.place_address ? (
                        <Text className="text-brand-400 text-xs" numberOfLines={1}>
                          {selectedPlace.place_address}
                        </Text>
                      ) : null}
                    </View>
                    <AccessiblePressable
                      onPress={() => {
                        setSelectedPlace(null);
                        setStoreQuery("");
                      }}
                      accessibilityLabel="Clear store"
                      testID="place-clear"
                    >
                      <Text className="text-brand-500 text-xs">Clear</Text>
                    </AccessiblePressable>
                  </View>
                ) : null}
              </>
            ) : (
              /* Manual fallback when no Places API key */
              <>
                <LabeledTextInput
                  label="Store name"
                  hideLabel
                  value={manualStoreName}
                  onChangeText={setManualStoreName}
                  placeholder="Store name"
                  placeholderTextColor={activeTheme.colors.placeholderGroup}
                  className="bg-brand-800 rounded-xl px-4 py-3 text-brand-100 text-sm mb-2"
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                  error={errors.storeName}
                  testID="manual-store-name-input"
                />
                <LabeledTextInput
                  label="Store address"
                  hideLabel
                  value={manualStoreAddress}
                  onChangeText={setManualStoreAddress}
                  placeholder="Store address"
                  placeholderTextColor={activeTheme.colors.placeholderGroup}
                  className="bg-brand-800 rounded-xl px-4 py-3 text-brand-100 text-sm mb-3"
                  autoCapitalize="sentences"
                  autoCorrect={false}
                  returnKeyType="next"
                  error={errors.storeAddress}
                  testID="manual-store-address-input"
                />
              </>
            )}

            {/* ── Price ──────────────────────────────────────────────────────── */}
            <LabeledTextInput
              label="Price *"
              labelClassName="text-brand-300 text-sm font-semibold mt-2"
              value={price}
              onChangeText={setPrice}
              placeholder="e.g. 49.99"
              placeholderTextColor={activeTheme.colors.placeholderGroup}
              className="bg-brand-800 rounded-xl px-4 py-3 text-brand-100 text-sm mb-3"
              keyboardType="decimal-pad"
              returnKeyType="next"
              error={errors.price}
              testID="price-input"
            />

            {/* ── Note (optional) ─────────────────────────────────────────────── */}
            <Text className="text-brand-300 text-sm font-semibold mb-1">
              Note <Text className="text-brand-600 font-normal">(optional)</Text>
            </Text>
            <LabeledTextInput
              label="Note"
              hideLabel
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Limit 1 per customer"
              placeholderTextColor={activeTheme.colors.placeholderGroup}
              className="bg-brand-800 rounded-xl px-4 py-3 text-brand-100 text-sm mb-6"
              multiline
              numberOfLines={2}
              style={{ textAlignVertical: "top" }}
              returnKeyType="done"
              testID="note-input"
            />

            {/* ── Submit ─────────────────────────────────────────────────────── */}
            <AccessiblePressable
              onPress={handleSubmit}
              disabled={createAlert.isPending}
              className={`rounded-xl py-4 items-center ${canSubmit ? "bg-amber-600" : "bg-brand-800"}`}
              accessibilityLabel="Post Sale Alert"
              testID="submit-sale-alert"
            >
              {createAlert.isPending ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text
                  className={`font-bold text-sm ${canSubmit ? "text-white" : "text-brand-600"}`}
                >
                  Post Sale Alert
                </Text>
              )}
            </AccessiblePressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
