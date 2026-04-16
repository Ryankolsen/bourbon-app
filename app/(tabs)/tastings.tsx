import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useTastings } from "@/hooks/use-tastings";
import { colors } from "@/lib/colors";

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TastingsScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: tastings, isLoading, isError } = useTastings(user?.id);

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
        <Text className="text-red-400 text-center">Failed to load tastings.</Text>
      </View>
    );
  }

  if (!tastings || tastings.length === 0) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center px-8">
        <Text className="text-5xl mb-4">📓</Text>
        <Text className="text-brand-100 text-xl font-bold mb-2">No tastings yet</Text>
        <Text className="text-brand-400 text-center text-sm">
          Open a bourbon's detail page to log your first tasting note.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-900">
      <FlatList
        data={tastings}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-4 gap-3"
        renderItem={({ item }) => {
          const bourbon = (item as any).bourbons;
          return (
            <TouchableOpacity
              className="bg-brand-800 rounded-2xl p-4"
              onPress={() => router.push(`/tasting/${item.id}`)}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className="flex-1 mr-3">
                  <Text className="text-brand-100 font-bold text-base">
                    {bourbon?.name ?? "Unknown Bourbon"}
                  </Text>
                  {bourbon?.distillery && (
                    <Text className="text-brand-400 text-xs mt-0.5">
                      {bourbon.distillery}
                    </Text>
                  )}
                </View>
                {item.rating !== null && (
                  <View className="bg-brand-600 px-3 py-1 rounded-full">
                    <Text className="text-white text-sm font-bold">{item.rating}</Text>
                  </View>
                )}
              </View>

              {item.nose && (
                <NoteRow label="Nose" value={item.nose} />
              )}
              {item.palate && (
                <NoteRow label="Palate" value={item.palate} />
              )}
              {item.finish && (
                <NoteRow label="Finish" value={item.finish} />
              )}
              {item.overall_notes && (
                <NoteRow label="Notes" value={item.overall_notes} />
              )}

              <Text className="text-brand-600 text-xs mt-2">
                {formatDate(item.tasted_at)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function NoteRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-1 mb-1">
      <Text className="text-brand-500 text-xs w-14">{label}:</Text>
      <Text className="text-brand-300 text-xs flex-1" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
