import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import { useBourbons } from "@/hooks/use-bourbons";
import { useAddToCollection } from "@/hooks/use-collection";
import { useAuth } from "@/hooks/use-auth";

export default function ExploreScreen() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const { data: bourbons, isLoading } = useBourbons(search);
  const addToCollection = useAddToCollection();
  const router = useRouter();

  return (
    <View className="flex-1 bg-bourbon-900">
      <View className="px-4 pt-4 pb-2">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search bourbons..."
          placeholderTextColor="#7a3c19"
          className="bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#e39e38" />
        </View>
      ) : (
        <FlatList
          data={bourbons}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pb-4 gap-3"
          renderItem={({ item }) => (
            <TouchableOpacity
              className="bg-bourbon-800 rounded-2xl p-4"
              onPress={() => router.push(`/bourbon/${item.id}`)}
            >
              <Text className="text-bourbon-100 font-bold text-base">{item.name}</Text>
              <Text className="text-bourbon-400 text-sm mt-0.5">
                {item.distillery ?? "Unknown distillery"}
              </Text>
              <View className="flex-row gap-4 mt-2">
                {item.proof && (
                  <Text className="text-bourbon-400 text-xs">{item.proof} proof</Text>
                )}
                {item.age_statement && (
                  <Text className="text-bourbon-400 text-xs">{item.age_statement} yr</Text>
                )}
                {item.msrp && (
                  <Text className="text-bourbon-400 text-xs">${item.msrp} MSRP</Text>
                )}
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (!user) return;
                  addToCollection.mutate({
                    user_id: user.id,
                    bourbon_id: item.id,
                    bottle_status: "sealed",
                  });
                }}
                disabled={addToCollection.isPending}
                className="mt-3 bg-bourbon-600 rounded-xl py-2 items-center"
              >
                <Text className="text-white font-medium text-sm">
                  {addToCollection.isPending ? "Adding..." : "+ Add to Collection"}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-bourbon-500 text-sm">
                {search ? "No bourbons found." : "No bourbons in the database yet."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
