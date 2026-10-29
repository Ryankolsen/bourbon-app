import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useState, useMemo } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useCollection, useRemoveFromCollection } from "@/hooks/use-collection";
import { useBourbonFilters } from "@/hooks/use-bourbon-filters";
import { useUserRatings, useAllBourbonRatingStats } from "@/hooks/use-ratings";
import { AccessiblePressable } from "@/components/AccessiblePressable";
import { FilterButton } from "@/components/FilterButton";
import { FilterSheet } from "@/components/FilterSheet";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import { BourbonCard } from "@/components/BourbonCard";
import { ConfirmationModal } from "@/components/ConfirmationModal";
import { useToast } from "@/lib/toast-provider";
import { colors } from "@/lib/colors";

export default function CollectionTab() {
  const { user } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const removeFromCollection = useRemoveFromCollection();
  const [confirmRemoveItem, setConfirmRemoveItem] = useState<{ id: string; bourbonName: string } | null>(null);

  const {
    filters,
    hasActiveFilters,
    activeFilterCount,
    applyFilters,
    patchFilters,
    resetFilters,
    filterItems,
  } = useBourbonFilters();

  const { data: collectionRaw, isLoading, isError } = useCollection(user?.id);
  const collection = useMemo(
    () => filterItems(collectionRaw ?? []),
    [collectionRaw, filterItems],
  );
  const { data: userRatings } = useUserRatings(user?.id);
  const { data: allRatingStats } = useAllBourbonRatingStats();
  const communityRatingsMap = new Map(
    (allRatingStats ?? []).map((s) => [s.bourbon_id, s.avg_rating])
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center">
        <ActivityIndicator color={colors.spinnerDefault} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center px-8">
        <Text className="text-red-400 text-center">Failed to load collection.</Text>
      </View>
    );
  }

  const isEmpty = collection.length === 0;

  return (
    <View className="flex-1 bg-brand-900">
      {/* Filter icon row */}
      <View className="px-4 pt-4 pb-2 flex-row justify-end">
        <FilterButton
          activeFilterCount={activeFilterCount}
          onPress={() => setFilterSheetVisible(true)}
        />
      </View>

      {/* Active filter chips */}
      <ActiveFilterChips
        filters={filters}
        onClearType={(type) => patchFilters({ types: filters.types.filter((t) => t !== type) })}
        onClearProof={() => patchFilters({ proofMin: null, proofMax: null })}
        onClearAge={() => patchFilters({ ageMin: null, ageMax: null, nasOnly: false })}
        onClearDistillery={() => patchFilters({ distillery: null })}
        onClearSort={() => patchFilters({ sortField: null })}
      />

      {isEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          {hasActiveFilters ? (
            <>
              <Text className="text-brand-500 text-sm text-center">
                No bourbons in your collection match the active filters.
              </Text>
              <AccessiblePressable accessibilityLabel="Clear filters" onPress={resetFilters} className="mt-2">
                <Text className="text-brand-400 text-sm underline">Clear filters</Text>
              </AccessiblePressable>
            </>
          ) : (
            <>
              <Text className="text-5xl mb-4">🥃</Text>
              <Text className="text-brand-100 text-xl font-bold mb-2">
                Your vault is empty
              </Text>
              <Text className="text-brand-400 text-center text-sm">
                Head to Explore to add bourbons to your collection.
              </Text>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={collection}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4 gap-3"
          ListHeaderComponent={
            <Text className="text-brand-500 text-xs pt-1 pb-1">
              {collection.length} {collection.length === 1 ? "bottle" : "bottles"}
              {hasActiveFilters ? " (filtered)" : ""}
            </Text>
          }
          renderItem={({ item }) => {
            const bourbon = (item as any).bourbons;
            const bourbonName = bourbon?.name ?? "Unknown";
            return (
              <BourbonCard
                name={bourbonName}
                distillery={bourbon?.distillery ?? null}
                type={bourbon?.type ?? null}
                proof={bourbon?.proof ?? null}
                age={bourbon?.age_statement ?? null}
                personalRating={userRatings?.get(item.bourbon_id) ?? null}
                communityRating={communityRatingsMap.get(item.bourbon_id) ?? null}
                onPress={() => router.push(`/bourbon/${item.bourbon_id}`)}
              >
                <AccessiblePressable
                  accessibilityLabel={`Remove ${bourbonName} from vault`}
                  onPress={() => {
                    if (!user) return;
                    setConfirmRemoveItem({ id: item.id, bourbonName });
                  }}
                  className="mt-3 px-3 py-1.5 rounded-xl bg-brand-600 items-center"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text className="text-white text-xs font-medium">Remove from Vault</Text>
                </AccessiblePressable>
              </BourbonCard>
            );
          }}
        />
      )}

      <FilterSheet
        visible={filterSheetVisible}
        filters={filters}
        onApply={applyFilters}
        onClose={() => setFilterSheetVisible(false)}
      />

      <ConfirmationModal
        visible={confirmRemoveItem !== null}
        title="Remove from Vault"
        message={confirmRemoveItem ? `Remove ${confirmRemoveItem.bourbonName} from your vault?` : ""}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          if (!user || !confirmRemoveItem) return;
          const { id, bourbonName: _ } = confirmRemoveItem;
          setConfirmRemoveItem(null);
          removeFromCollection.mutate(
            { id, userId: user.id },
            {
              onSuccess: () => showToast("Removed from vault", "success"),
              onError: () => showToast("Failed to remove", "error"),
            }
          );
        }}
        onCancel={() => setConfirmRemoveItem(null)}
      />
    </View>
  );
}
