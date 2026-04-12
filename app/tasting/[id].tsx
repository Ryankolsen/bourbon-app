import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useTasting, useUpdateTasting } from "@/hooks/use-tastings";
import { useAuth } from "@/hooks/use-auth";

const RATING_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export default function TastingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: tasting, isLoading, isError } = useTasting(id);
  const updateTasting = useUpdateTasting();

  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [nose, setNose] = useState("");
  const [palate, setPalate] = useState("");
  const [finish, setFinish] = useState("");
  const [overallNotes, setOverallNotes] = useState("");

  useEffect(() => {
    if (tasting) {
      setRating(tasting.rating ?? null);
      setNose(tasting.nose ?? "");
      setPalate(tasting.palate ?? "");
      setFinish(tasting.finish ?? "");
      setOverallNotes(tasting.overall_notes ?? "");
    }
  }, [tasting]);

  function startEditing() {
    setEditing(true);
  }

  function cancelEditing() {
    if (tasting) {
      setRating(tasting.rating ?? null);
      setNose(tasting.nose ?? "");
      setPalate(tasting.palate ?? "");
      setFinish(tasting.finish ?? "");
      setOverallNotes(tasting.overall_notes ?? "");
    }
    setEditing(false);
  }

  function handleSave() {
    if (!id) return;
    updateTasting.mutate(
      {
        id,
        updates: {
          rating,
          nose: nose.trim() || null,
          palate: palate.trim() || null,
          finish: finish.trim() || null,
          overall_notes: overallNotes.trim() || null,
        },
      },
      {
        onSuccess: () => setEditing(false),
        onError: () => Alert.alert("Error", "Failed to save changes."),
      }
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center">
        <ActivityIndicator color="#e39e38" size="large" />
      </View>
    );
  }

  if (isError || !tasting) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center px-8">
        <Text className="text-red-400 text-center">Failed to load tasting.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-bourbon-400 text-sm">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bourbon = (tasting as any).bourbons;
  const isOwner = user?.id === tasting.user_id;
  const formattedDate = new Date(tasting.tasted_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <View className="flex-1 bg-bourbon-900">
      {/* Header */}
      <View className="px-4 pt-4 pb-2 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-bourbon-400 text-base">← Back</Text>
        </TouchableOpacity>
        {isOwner && !editing && (
          <TouchableOpacity onPress={startEditing}>
            <Text className="text-bourbon-400 text-base">Edit</Text>
          </TouchableOpacity>
        )}
        {editing && (
          <View className="flex-row gap-4">
            <TouchableOpacity onPress={cancelEditing}>
              <Text className="text-bourbon-400 text-base">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={updateTasting.isPending}>
              <Text className="text-bourbon-400 text-base">
                {updateTasting.isPending ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8">
        {/* Title */}
        <View className="mb-6">
          <Text className="text-bourbon-100 text-2xl font-bold">
            {bourbon?.name ?? "Tasting Note"}
          </Text>
          {bourbon?.distillery && (
            <Text className="text-bourbon-400 text-base mt-0.5">{bourbon.distillery}</Text>
          )}
          <Text className="text-bourbon-600 text-xs mt-1">{formattedDate}</Text>
        </View>

        {/* Rating */}
        <View className="bg-bourbon-800 rounded-2xl p-4 mb-4">
          <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Rating (0–100)
          </Text>
          {editing ? (
            <View className="flex-row flex-wrap gap-2">
              {RATING_STEPS.map((r) => (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRating(rating === r ? null : r)}
                  className={`px-3 py-2 rounded-xl ${
                    rating === r ? "bg-bourbon-500" : "bg-bourbon-700"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      rating === r ? "text-white" : "text-bourbon-300"
                    }`}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text className="text-bourbon-100 text-2xl font-bold">
              {rating !== null ? `${rating}/100` : "—"}
            </Text>
          )}
        </View>

        {/* Notes */}
        <NoteField
          label="Nose"
          value={nose}
          onChange={setNose}
          editing={editing}
          placeholder="Aromas you detect on the nose..."
        />
        <NoteField
          label="Palate"
          value={palate}
          onChange={setPalate}
          editing={editing}
          placeholder="Flavors on the palate..."
        />
        <NoteField
          label="Finish"
          value={finish}
          onChange={setFinish}
          editing={editing}
          placeholder="How does it finish?"
        />
        <NoteField
          label="Overall Notes"
          value={overallNotes}
          onChange={setOverallNotes}
          editing={editing}
          placeholder="General impressions..."
          tall
        />

        {editing && (
          <TouchableOpacity
            onPress={handleSave}
            disabled={updateTasting.isPending}
            className="bg-bourbon-600 rounded-2xl py-4 items-center mt-2"
          >
            <Text className="text-white font-semibold text-base">
              {updateTasting.isPending ? "Saving..." : "Save Changes"}
            </Text>
          </TouchableOpacity>
        )}

        {!editing && isOwner && (
          <TouchableOpacity
            onPress={() => router.push(`/bourbon/${tasting.bourbon_id}`)}
            className="mt-4 items-center"
          >
            <Text className="text-bourbon-500 text-sm">View bourbon →</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function NoteField({
  label,
  value,
  onChange,
  editing,
  placeholder,
  tall,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  editing: boolean;
  placeholder: string;
  tall?: boolean;
}) {
  if (!editing && !value) return null;

  return (
    <View className="bg-bourbon-800 rounded-2xl p-4 mb-4">
      <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-2">
        {label}
      </Text>
      {editing ? (
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#7a3c19"
          multiline
          numberOfLines={tall ? 4 : 2}
          textAlignVertical="top"
          className="text-bourbon-100 text-sm leading-relaxed"
          style={{ minHeight: tall ? 80 : 44 }}
        />
      ) : (
        <Text className="text-bourbon-100 text-sm leading-relaxed">{value}</Text>
      )}
    </View>
  );
}
