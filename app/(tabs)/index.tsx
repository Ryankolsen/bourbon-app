import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useCollection } from "@/hooks/use-collection";
import { useBourbonFilters } from "@/hooks/use-bourbon-filters";
import { useUserRatings, useAllBourbonRatingStats } from "@/hooks/use-ratings";
import { FilterSheet } from "@/components/FilterSheet";
import { ActiveFilterChips } from "@/components/ActiveFilterChips";
import { BourbonCard } from "@/components/BourbonCard";
import { BourbonFilterState } from "@/lib/bourbons";

export default function CollectionScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const {
    filters,
    hasActiveFilters,
    setTypes,
    setProofMin,
    setProofMax,
    setAgeMin,
    setAgeMax,
    setNasOnly,
    setDistillery,
    setSortField,
    setSortAscending,
    clearFilters,
  } = useBourbonFilters();

  const { data: collection, isLoading, isError } = useCollection(user?.id, filters);
  const { data: userRatings } = useUserRatings(user?.id);
  const { data: allRatingStats } = useAllBourbonRatingStats();
  const communityRatingsMap = new Map(
    (allRatingStats ?? []).map((s) => [s.bourbon_id, s.avg_rating])
  );

  function handleApplyFilters(newFilters: BourbonFilterState) {
    setTypes(newFilters.types);
    setProofMin(newFilters.proofMin);
    setProofMax(newFilters.proofMax);
    setAgeMin(newFilters.ageMin);
    setAgeMax(newFilters.ageMax);
    setNasOnly(newFilters.nasOnly);
    setDistillery(newFilters.distillery);
    setSortField(newFilters.sortField);
    setSortAscending(newFilters.sortAscending);
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center">
        <ActivityIndicator color="#e39e38" size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center px-8">
        <Text className="text-red-400 text-center">Failed to load collection.</Text>
      </View>
    );
  }

  const isEmpty = !collection || collection.length === 0;

  return (
    <View className="flex-1 bg-bourbon-900">
      {/* Filter icon row */}
      <View className="px-4 pt-4 pb-2 flex-row justify-end">
        <TouchableOpacity
          onPress={() => setFilterSheetVisible(true)}
          className={`rounded-xl px-3 py-2 items-center justify-center ${
            hasActiveFilters ? "bg-bourbon-600" : "bg-bourbon-800"
          }`}
        >
          <Text className="text-xl">⚙️</Text>
          {hasActiveFilters && (
            <View className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
          )}
        </TouchableOpacity>
      </View>

      {/* Active filter chips */}
      <ActiveFilterChips
        filters={filters}
        onClearType={(type) => setTypes(filters.types.filter((t) => t !== type))}
        onClearProof={() => { setProofMin(null); setProofMax(null); }}
        onClearAge={() => { setAgeMin(null); setAgeMax(null); setNasOnly(false); }}
        onClearDistillery={() => setDistillery(null)}
        onClearSort={() => setSortField(null)}
      />

      {isEmpty ? (
        <View className="flex-1 items-center justify-center px-8">
          {hasActiveFilters ? (
            <>
              <Text className="text-bourbon-500 text-sm text-center">
                No bourbons in your collection match the active filters.
              </Text>
              <TouchableOpacity onPress={clearFilters} className="mt-2">
                <Text className="text-bourbon-400 text-sm underline">Clear filters</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text className="text-5xl mb-4">🥃</Text>
              <Text className="text-bourbon-100 text-xl font-bold mb-2">
                Your vault is empty
              </Text>
              <Text className="text-bourbon-400 text-center text-sm">
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
            <Text className="text-bourbon-500 text-xs pt-1 pb-1">
              {collection.length} {collection.length === 1 ? "bottle" : "bottles"}
              {hasActiveFilters ? " (filtered)" : ""}
            </Text>
          }
          renderItem={({ item }) => {
            const bourbon = (item as any).bourbons;
            return (
              <BourbonCard
                name={bourbon?.name ?? "Unknown"}
                distillery={bourbon?.distillery ?? null}
                type={bourbon?.type ?? null}
                proof={bourbon?.proof ?? null}
                age={bourbon?.age_statement ?? null}
                personalRating={userRatings?.get(item.bourbon_id) ?? null}
                communityRating={communityRatingsMap.get(item.bourbon_id) ?? null}
                onPress={() => router.push(`/bourbon/${item.bourbon_id}`)}
              />
            );
          }}
        />
      )}

      <FilterSheet
        visible={filterSheetVisible}
        filters={filters}
        onApply={handleApplyFilters}
        onClose={() => setFilterSheetVisible(false)}
      />
    </View>
  );
}
