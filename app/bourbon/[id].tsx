import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useBourbon } from "@/hooks/use-bourbons";
import { useAddToCollection } from "@/hooks/use-collection";
import { useAuth } from "@/hooks/use-auth";

export default function BourbonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: bourbon, isLoading, isError } = useBourbon(id);
  const { user } = useAuth();
  const addToCollection = useAddToCollection();

  if (isLoading) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center">
        <ActivityIndicator color="#e39e38" size="large" />
      </View>
    );
  }

  if (isError || !bourbon) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center px-8">
        <Text className="text-red-400 text-center text-base">
          Failed to load bourbon details.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-bourbon-400 text-sm">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bourbon-900">
      {/* Header */}
      <View className="px-4 pt-4 pb-2 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-bourbon-400 text-base">← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8">
        {/* Title block */}
        <View className="mb-6">
          <Text className="text-bourbon-100 text-2xl font-bold">{bourbon.name}</Text>
          {bourbon.distillery && (
            <Text className="text-bourbon-400 text-base mt-1">{bourbon.distillery}</Text>
          )}
          {bourbon.type && (
            <View className="mt-2 self-start bg-bourbon-700 px-3 py-1 rounded-full">
              <Text className="text-bourbon-200 text-xs font-medium capitalize">
                {bourbon.type}
              </Text>
            </View>
          )}
        </View>

        {/* Stats grid */}
        <View className="bg-bourbon-800 rounded-2xl p-4 mb-4">
          <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Specs
          </Text>
          <View className="flex-row flex-wrap gap-y-4">
            {bourbon.proof != null && (
              <StatItem label="Proof" value={`${bourbon.proof}`} />
            )}
            {bourbon.age_statement != null && (
              <StatItem label="Age" value={`${bourbon.age_statement} yr`} />
            )}
            {bourbon.msrp != null && (
              <StatItem label="MSRP" value={`$${bourbon.msrp}`} />
            )}
            {bourbon.mashbill && (
              <StatItem label="Mashbill" value={bourbon.mashbill} wide />
            )}
          </View>
          {!bourbon.proof && !bourbon.age_statement && !bourbon.msrp && !bourbon.mashbill && (
            <Text className="text-bourbon-500 text-sm">No spec data available yet.</Text>
          )}
        </View>

        {/* Description */}
        {bourbon.description && (
          <View className="bg-bourbon-800 rounded-2xl p-4 mb-4">
            <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-2">
              About
            </Text>
            <Text className="text-bourbon-200 text-sm leading-relaxed">
              {bourbon.description}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View className="gap-3 mt-2">
          <TouchableOpacity
            onPress={() => {
              if (!user) return;
              addToCollection.mutate(
                {
                  user_id: user.id,
                  bourbon_id: bourbon.id,
                  bottle_status: "sealed",
                },
                { onSuccess: () => router.back() }
              );
            }}
            disabled={addToCollection.isPending}
            className="bg-bourbon-600 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-base">
              {addToCollection.isPending ? "Adding..." : "+ Add to Collection"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/tasting/new?bourbonId=${bourbon.id}`)}
            className="bg-bourbon-800 border border-bourbon-600 rounded-2xl py-4 items-center"
          >
            <Text className="text-bourbon-200 font-semibold text-base">📓 Log Tasting</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

function StatItem({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View className={wide ? "w-full" : "w-1/2"}>
      <Text className="text-bourbon-500 text-xs mb-0.5">{label}</Text>
      <Text className="text-bourbon-100 text-sm font-medium">{value}</Text>
    </View>
  );
}
