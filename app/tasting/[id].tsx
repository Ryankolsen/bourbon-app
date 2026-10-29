import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { useTasting, useUpdateTasting } from "@/hooks/use-tastings";
import { useAuth } from "@/hooks/use-auth";
import { colors } from "@/lib/colors";
import { useToast } from "@/lib/toast-provider";
import { AccessiblePressable } from "@/components/AccessiblePressable";
import { Heading } from "@/components/Heading";
import { LabeledTextInput } from "@/components/LabeledTextInput";
import { StarRatingInput, STAR_LABELS } from "@/components/StarRatingInput";

export default function TastingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { data: tasting, isLoading, isError } = useTasting(id);
  const updateTasting = useUpdateTasting();
  const { showToast } = useToast();

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
        onError: () => showToast("Failed to save changes.", "error"),
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

  if (isError || !tasting) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center px-8">
        <Text className="text-red-400 text-center">Failed to load tasting.</Text>
        <AccessiblePressable onPress={() => router.back()} className="mt-4" accessibilityLabel="Go back">
          <Text className="text-brand-400 text-sm">Go back</Text>
        </AccessiblePressable>
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
    <View className="flex-1 bg-brand-900">
      {/* Header */}
      <View
        className="px-4 pb-2 flex-row items-center justify-between"
        style={{ paddingTop: insets.top + 8 }}
      >
        <AccessiblePressable onPress={() => router.back()} hitSlop={8} accessibilityLabel="Back">
          <Text className="text-brand-400 text-base">← Back</Text>
        </AccessiblePressable>
        {isOwner && !editing && (
          <AccessiblePressable onPress={startEditing} accessibilityLabel="Edit">
            <Text className="text-brand-400 text-base">Edit</Text>
          </AccessiblePressable>
        )}
        {editing && (
          <View className="flex-row gap-4">
            <AccessiblePressable onPress={cancelEditing} accessibilityLabel="Cancel">
              <Text className="text-brand-400 text-base">Cancel</Text>
            </AccessiblePressable>
            <AccessiblePressable
              onPress={handleSave}
              disabled={updateTasting.isPending}
              accessibilityLabel="Save"
            >
              <Text className="text-brand-400 text-base">
                {updateTasting.isPending ? "Saving..." : "Save"}
              </Text>
            </AccessiblePressable>
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView contentContainerClassName="px-4 pb-8" keyboardShouldPersistTaps="handled">
        {/* Title */}
        <View className="mb-6">
          <Text className="text-brand-100 text-2xl font-bold">
            {bourbon?.name ?? "Tasting Note"}
          </Text>
          {bourbon?.distillery && (
            <Text className="text-brand-400 text-base mt-0.5">{bourbon.distillery}</Text>
          )}
          <Text className="text-brand-600 text-xs mt-1">{formattedDate}</Text>
        </View>

        {/* Rating */}
        <View className="bg-brand-800 rounded-2xl p-4 mb-4">
          <Heading className="text-brand-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Rating
          </Heading>
          {editing ? (
            <StarRatingInput value={rating} onChange={setRating} labels={STAR_LABELS} />
          ) : (
            <View>
              <Text className="text-brand-100 text-2xl font-bold">
                {rating !== null ? `${rating}/5` : "—"}
              </Text>
              {rating !== null && (
                <Text className="text-brand-400 text-sm mt-0.5">{STAR_LABELS[rating]}</Text>
              )}
            </View>
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
          <AccessiblePressable
            onPress={handleSave}
            disabled={updateTasting.isPending}
            accessibilityLabel="Save Changes"
            className="bg-brand-600 rounded-2xl py-4 items-center mt-2"
          >
            <Text className="text-white font-semibold text-base">
              {updateTasting.isPending ? "Saving..." : "Save Changes"}
            </Text>
          </AccessiblePressable>
        )}

        {!editing && isOwner && (
          <AccessiblePressable
            accessibilityLabel="View bourbon"
            onPress={() => router.push(`/bourbon/${tasting.bourbon_id}`)}
            className="mt-4 items-center"
          >
            <Text className="text-brand-500 text-sm">View bourbon →</Text>
          </AccessiblePressable>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
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
    <View className="bg-brand-800 rounded-2xl p-4 mb-4">
      <Heading className="text-brand-400 text-xs font-semibold uppercase tracking-wider mb-2">
        {label}
      </Heading>
      {editing ? (
        <LabeledTextInput
          label={label}
          hideLabel
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
      ) : (
        <Text className="text-brand-100 text-sm leading-relaxed">{value}</Text>
      )}
    </View>
  );
}
