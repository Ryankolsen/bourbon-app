import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAddBourbon, useSearchSimilarBourbons } from "@/hooks/use-bourbons";
import { useToast } from "@/lib/toast-provider";
import { buildBourbonInsertPayload } from "@/lib/bourbons";
import { Database } from "@/types/database";

type BourbonRow = Database["public"]["Tables"]["bourbons"]["Row"];

const BOURBON_TYPES = [
  "traditional",
  "small_batch",
  "single_barrel",
  "wheated",
  "cask_strength",
  "high_rye",
  "rye",
  "bottled_in_bond",
  "straight",
  "blended",
] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  distillery: z.string().min(1, "Distillery is required"),
  proof: z
    .string()
    .min(1, "Proof is required")
    .refine((v) => !isNaN(parseFloat(v)), { message: "Proof must be a number" }),
  type: z.string().optional(),
  age_statement: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(parseFloat(v)), { message: "Age must be a number" }),
  mashbill: z.string().optional(),
  msrp: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(parseFloat(v)), { message: "MSRP must be a number" }),
  description: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewBourbonScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const addBourbon = useAddBourbon();

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      distillery: "",
      proof: "",
      type: "",
      age_statement: "",
      mashbill: "",
      msrp: "",
      description: "",
      city: "",
      state: "",
      country: "",
    },
  });

  const nameValue = watch("name");
  const { data: similarBourbons = [] } = useSearchSimilarBourbons(nameValue);

  const onSubmit = handleSubmit((values) => {
    if (!user) {
      showToast("You must be signed in to add a bourbon", "error");
      return;
    }
    const payload = buildBourbonInsertPayload(user.id, values);
    addBourbon.mutate(payload, {
      onSuccess: (bourbon) => {
        showToast(`${bourbon.name} added to the database`);
        router.replace(`/bourbon/${bourbon.id}`);
      },
      onError: (error) => {
        const msg = error instanceof Error ? error.message : String(error);
        console.error("[AddBourbon] submit failed:", error);
        showToast(`Failed to add bourbon: ${msg}`, "error");
      },
    });
  });

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bourbon-900"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="px-4 py-6 gap-4"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-bourbon-100 text-2xl font-bold mb-2">Add a Bourbon</Text>

        {/* Required fields */}
        <Field label="Name *" error={errors.name?.message}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor="#7a3c19"
                placeholder="e.g. Blanton's Original"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        {similarBourbons.length > 0 && (
          <View className="gap-2">
            <Text className="text-amber-400 text-xs font-semibold uppercase tracking-widest">
              Similar bourbons already in the database
            </Text>
            {similarBourbons.map((bourbon) => (
              <DuplicateCard key={bourbon.id} bourbon={bourbon} />
            ))}
          </View>
        )}

        <Field label="Distillery *" error={errors.distillery?.message}>
          <Controller
            control={control}
            name="distillery"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor="#7a3c19"
                placeholder="e.g. Buffalo Trace"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        <Field label="Proof *" error={errors.proof?.message}>
          <Controller
            control={control}
            name="proof"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor="#7a3c19"
                placeholder="e.g. 93"
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        {/* Optional fields */}
        <Text className="text-bourbon-400 text-xs uppercase tracking-widest mt-2">
          Optional
        </Text>

        <Field label="Type" error={errors.type?.message}>
          <Controller
            control={control}
            name="type"
            render={({ field: { onChange, value } }) => (
              <View className="flex-row flex-wrap gap-2">
                {BOURBON_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => onChange(value === t ? "" : t)}
                    className={`px-3 py-1.5 rounded-lg border ${
                      value === t
                        ? "bg-bourbon-600 border-bourbon-500"
                        : "bg-bourbon-800 border-bourbon-700"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        value === t ? "text-white" : "text-bourbon-400"
                      }`}
                    >
                      {t.replace(/_/g, " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />
        </Field>

        <Field label="Age Statement (years)" error={errors.age_statement?.message}>
          <Controller
            control={control}
            name="age_statement"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor="#7a3c19"
                placeholder="e.g. 12"
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        <Field label="Mashbill" error={errors.mashbill?.message}>
          <Controller
            control={control}
            name="mashbill"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor="#7a3c19"
                placeholder="e.g. 75% corn, 13% rye, 12% barley"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        <Field label="MSRP ($)" error={errors.msrp?.message}>
          <Controller
            control={control}
            name="msrp"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor="#7a3c19"
                placeholder="e.g. 49.99"
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        <Field label="Description" error={errors.description?.message}>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor="#7a3c19"
                placeholder="Brief description of this bourbon"
                multiline
                numberOfLines={3}
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        <Field label="City" error={errors.city?.message}>
          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor="#7a3c19"
                placeholder="e.g. Frankfort"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        <Field label="State" error={errors.state?.message}>
          <Controller
            control={control}
            name="state"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor="#7a3c19"
                placeholder="e.g. Kentucky"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        <Field label="Country" error={errors.country?.message}>
          <Controller
            control={control}
            name="country"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-bourbon-800 text-bourbon-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor="#7a3c19"
                placeholder="e.g. USA"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        <TouchableOpacity
          onPress={onSubmit}
          disabled={addBourbon.isPending}
          className="mt-4 bg-bourbon-600 rounded-xl py-4 items-center"
        >
          {addBourbon.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-base">Add Bourbon</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          className="py-3 items-center"
        >
          <Text className="text-bourbon-400 text-sm">Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-1">
      <Text className="text-bourbon-300 text-sm font-medium">{label}</Text>
      {children}
      {error ? <Text className="text-red-400 text-xs">{error}</Text> : null}
    </View>
  );
}

function DuplicateCard({ bourbon }: { bourbon: BourbonRow }) {
  const [expanded, setExpanded] = useState(false);

  const formatType = (type: string | null) =>
    type ? type.replace(/_/g, " ") : null;

  return (
    <View className="bg-bourbon-800 border border-amber-700 rounded-xl px-4 py-3 gap-1">
      <Text className="text-bourbon-100 font-semibold text-sm">{bourbon.name}</Text>
      <View className="flex-row flex-wrap gap-x-3 gap-y-0.5">
        {bourbon.distillery ? (
          <Text className="text-bourbon-400 text-xs">{bourbon.distillery}</Text>
        ) : null}
        {bourbon.proof != null ? (
          <Text className="text-bourbon-400 text-xs">{bourbon.proof} proof</Text>
        ) : null}
        {bourbon.type ? (
          <Text className="text-bourbon-400 text-xs">{formatType(bourbon.type)}</Text>
        ) : null}
      </View>

      {expanded && (
        <View className="mt-1 gap-0.5">
          {bourbon.age_statement != null ? (
            <Text className="text-bourbon-400 text-xs">Age: {bourbon.age_statement} years</Text>
          ) : null}
          {bourbon.mashbill ? (
            <Text className="text-bourbon-400 text-xs">Mashbill: {bourbon.mashbill}</Text>
          ) : null}
          {bourbon.msrp != null ? (
            <Text className="text-bourbon-400 text-xs">MSRP: ${bourbon.msrp}</Text>
          ) : null}
          {bourbon.city || bourbon.state || bourbon.country ? (
            <Text className="text-bourbon-400 text-xs">
              {[bourbon.city, bourbon.state, bourbon.country].filter(Boolean).join(", ")}
            </Text>
          ) : null}
          {bourbon.description ? (
            <Text className="text-bourbon-400 text-xs">{bourbon.description}</Text>
          ) : null}
        </View>
      )}

      <TouchableOpacity onPress={() => setExpanded((v) => !v)} className="mt-1">
        <Text className="text-amber-500 text-xs">{expanded ? "See less" : "See more"}</Text>
      </TouchableOpacity>
    </View>
  );
}
