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
import { useState } from "react";
import { useBourbon } from "@/hooks/use-bourbons";
import { useLogTasting } from "@/hooks/use-tastings";
import { useAuth } from "@/hooks/use-auth";

const RATING_STEPS = [1, 2, 3, 4, 5];
const STAR_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Great",
  5: "Exceptional",
};

export default function NewTastingScreen() {
  const { bourbonId } = useLocalSearchParams<{ bourbonId: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { data: bourbon, isLoading } = useBourbon(bourbonId);
  const logTasting = useLogTasting();

  const [rating, setRating] = useState<number | null>(null);
  const [nose, setNose] = useState("");
  const [palate, setPalate] = useState("");
  const [finish, setFinish] = useState("");
  const [overallNotes, setOverallNotes] = useState("");

  function handleSubmit() {
    if (!user || !bourbonId) return;
    logTasting.mutate(
      {
        user_id: user.id,
        bourbon_id: bourbonId,
        rating,
        nose: nose.trim() || null,
        palate: palate.trim() || null,
        finish: finish.trim() || null,
        overall_notes: overallNotes.trim() || null,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: (err) => {
          Alert.alert("Error", "Failed to save tasting. Please try again.");
          console.error(err);
        },
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

  return (
    <View className="flex-1 bg-bourbon-900">
      {/* Header */}
      <View className="px-4 pt-4 pb-2 flex-row items-center gap-3">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-bourbon-400 text-base">← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8">
        {/* Title */}
        <View className="mb-6">
          <Text className="text-bourbon-100 text-2xl font-bold">Log Tasting</Text>
          {bourbon && (
            <Text className="text-bourbon-400 text-base mt-1">{bourbon.name}</Text>
          )}
        </View>

        {/* Rating */}
        <View className="bg-bourbon-800 rounded-2xl p-4 mb-4">
          <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Rating
          </Text>
          <View className="flex-row gap-3 justify-center">
            {RATING_STEPS.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => setRating(rating === r ? null : r)}
                className="items-center"
              >
                <Text className={`text-3xl ${rating !== null && r <= rating ? "opacity-100" : "opacity-30"}`}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {rating !== null && (
            <Text className="text-bourbon-300 text-sm mt-3 text-center">
              {rating}/5 — {STAR_LABELS[rating]}
            </Text>
          )}
        </View>

        {/* Nose */}
        <NoteField
          label="Nose"
          placeholder="Aromas you detect on the nose..."
          value={nose}
          onChange={setNose}
        />

        {/* Palate */}
        <NoteField
          label="Palate"
          placeholder="Flavors on the palate..."
          value={palate}
          onChange={setPalate}
        />

        {/* Finish */}
        <NoteField
          label="Finish"
          placeholder="How does it finish?"
          value={finish}
          onChange={setFinish}
        />

        {/* Overall Notes */}
        <NoteField
          label="Overall Notes"
          placeholder="General impressions, food pairings, context..."
          value={overallNotes}
          onChange={setOverallNotes}
          tall
        />

        {/* Save */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={logTasting.isPending}
          className="bg-bourbon-600 rounded-2xl py-4 items-center mt-2"
        >
          <Text className="text-white font-semibold text-base">
            {logTasting.isPending ? "Saving..." : "Save Tasting"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function NoteField({
  label,
  placeholder,
  value,
  onChange,
  tall,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  tall?: boolean;
}) {
  return (
    <View className="bg-bourbon-800 rounded-2xl p-4 mb-4">
      <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-2">
        {label}
      </Text>
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
    </View>
  );
}
