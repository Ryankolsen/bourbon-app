import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useBourbon } from "@/hooks/use-bourbons";
import { useLogTasting } from "@/hooks/use-tastings";
import { useAuth } from "@/hooks/use-auth";
import { buildTastingPayload } from "@/lib/tastings";
import { colors } from "@/lib/colors";
import { useToast } from "@/lib/toast-provider";

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
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: bourbon, isLoading } = useBourbon(bourbonId);
  const logTasting = useLogTasting();
  const { showToast } = useToast();

  const [rating, setRating] = useState<number | null>(null);
  const [nose, setNose] = useState("");
  const [palate, setPalate] = useState("");
  const [finish, setFinish] = useState("");
  const [overallNotes, setOverallNotes] = useState("");

  function handleSubmit() {
    if (!user || !bourbonId) return;
    logTasting.mutate(
      buildTastingPayload(user.id, bourbonId, { rating, nose, palate, finish, overallNotes }),
      {
        onSuccess: () => {
          router.back();
        },
        onError: (err) => {
          showToast("Failed to save tasting. Please try again.", "error");
          console.error(err);
        },
      }
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center">
        <ActivityIndicator color={colors.spinnerDefault} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-900">
      {/* Header */}
      <View
        className="px-4 pb-2 flex-row items-center gap-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text className="text-brand-400 text-base">← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8">
        {/* Title */}
        <View className="mb-6">
          <Text className="text-brand-100 text-2xl font-bold">Log Tasting</Text>
          {bourbon && (
            <Text className="text-brand-400 text-base mt-1">{bourbon.name}</Text>
          )}
        </View>

        {/* Rating */}
        <View className="bg-brand-800 rounded-2xl p-4 mb-4">
          <Text className="text-brand-400 text-xs font-semibold uppercase tracking-wider mb-3">
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
            <Text className="text-brand-300 text-sm mt-3 text-center">
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
          className="bg-brand-600 rounded-2xl py-4 items-center mt-2"
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
    <View className="bg-brand-800 rounded-2xl p-4 mb-4">
      <Text className="text-brand-400 text-xs font-semibold uppercase tracking-wider mb-2">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholderDark}
        multiline
        numberOfLines={tall ? 4 : 2}
        textAlignVertical="top"
        className="text-brand-100 text-sm leading-relaxed"
        style={{ minHeight: tall ? 80 : 44 }}
      />
    </View>
  );
}
