import { colors } from "@/lib/colors";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import React, { useEffect, useState } from "react";
import { Dropdown } from "react-native-element-dropdown";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateBourbon, useBourbon } from "@/hooks/use-bourbons";
import { useProfile } from "@/hooks/use-profile";
import { useDistilleries } from "@/hooks/use-distilleries";
import { useToast } from "@/lib/toast-provider";
import { BOURBON_TYPES, BourbonUpdateFormFields } from "@/lib/bourbons";
import { WHISKEY_COUNTRIES, getProvincesForCountry } from "@/lib/location-data";
import { SearchablePicker } from "@/components/SearchablePicker";
import { useSubmitBourbonSuggestion, type BourbonSuggestion } from "@/hooks/use-bourbon-suggestions";
import { isFieldBlank } from "@/lib/blank-field-rules";

/** Community-editable fields (excludes name and image_url). */
const COMMUNITY_FIELDS = [
  "distillery",
  "proof",
  "type",
  "age_statement",
  "mashbill",
  "msrp",
  "description",
  "city",
  "state",
  "country",
] as const;

const baseSchema = z.object({
  distillery: z.string().optional(),
  proof: z
    .string()
    .optional()
    .refine((v) => !v || !isNaN(parseFloat(v)), { message: "Proof must be a number" }),
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
  image_url: z.string().optional(),
});

// Admin mode requires a non-empty name
const adminSchema = baseSchema.extend({ name: z.string().min(1, "Name is required") });
const communitySchema = baseSchema.extend({ name: z.string().optional() });

type FormValues = z.infer<typeof adminSchema>;

export default function EditBourbonScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: bourbon, isLoading: bourbonLoading } = useBourbon(id);
  const { data: profile, isLoading: profileLoading } = useProfile(user?.id);
  const isAdmin = profile?.is_admin ?? false;
  const mode = isAdmin ? "admin" : "community";
  const updateBourbon = useUpdateBourbon();
  const submitSuggestion = useSubmitBourbonSuggestion();
  const [distillerySearch, setDistillerySearch] = useState("");
  const { distilleries, isLoading: distilleriesLoading } = useDistilleries(distillerySearch);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(mode === "admin" ? adminSchema : communitySchema) as Resolver<FormValues>,
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
      image_url: "",
    },
  });

  // Pre-fill form once bourbon data loads. Depend on bourbon.id so this only
  // fires when a different bourbon is loaded, not on every render.
  const bourbonId = bourbon?.id;
  useEffect(() => {
    if (bourbon) {
      reset({
        name: bourbon.name ?? "",
        distillery: bourbon.distillery ?? "",
        proof: bourbon.proof != null ? String(bourbon.proof) : "",
        type: bourbon.type ?? "",
        age_statement: bourbon.age_statement != null ? String(bourbon.age_statement) : "",
        mashbill: bourbon.mashbill ?? "",
        msrp: bourbon.msrp != null ? String(bourbon.msrp) : "",
        description: bourbon.description ?? "",
        city: bourbon.city ?? "",
        state: bourbon.state ?? "",
        country: bourbon.country ?? "",
        image_url: bourbon.image_url ?? "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bourbonId, reset]);

  const countryValue = watch("country");
  const provinces = getProvincesForCountry(countryValue ?? "");

  const onSubmit = handleSubmit(async (values) => {
    if (!user || !id) {
      showToast("Not authenticated", "error");
      return;
    }

    if (mode === "admin") {
      updateBourbon.mutate(
        { id, updatedBy: user.id, fields: values },
        {
          onSuccess: (updated) => {
            showToast(`${updated.name} updated`);
            router.back();
          },
          onError: (error) => {
            const msg = error instanceof Error ? error.message : (error as any)?.message ?? String(error);
            showToast(`Failed to update: ${msg}`, "error");
          },
        }
      );
      return;
    }

    // Community mode: classify each changed field as Tier 1 or Tier 2
    const tier1Fields: BourbonUpdateFormFields = {};
    const tier2Suggestions: BourbonSuggestion[] = [];

    for (const fieldName of COMMUNITY_FIELDS) {
      const formValue = (values[fieldName] ?? "") as string;
      const originalValue = bourbon![fieldName as keyof typeof bourbon];
      const originalStr = originalValue != null ? String(originalValue) : "";

      // Skip unchanged fields
      if (formValue === originalStr) continue;

      if (isFieldBlank(fieldName, originalValue)) {
        // Tier 1: field was blank — write directly
        tier1Fields[fieldName] = formValue;
      } else {
        // Tier 2: field had a real value — queue for review
        tier2Suggestions.push({
          fieldName,
          oldValue: originalStr,
          newValue: formValue || null,
        });
      }
    }

    if (Object.keys(tier1Fields).length === 0 && tier2Suggestions.length === 0) {
      showToast("No changes to save");
      return;
    }

    try {
      const promises: Promise<unknown>[] = [];

      if (Object.keys(tier1Fields).length > 0) {
        promises.push(updateBourbon.mutateAsync({ id, updatedBy: user.id, fields: tier1Fields }));
      }

      if (tier2Suggestions.length > 0) {
        promises.push(
          submitSuggestion.mutateAsync({
            bourbonId: id,
            submittedBy: user.id,
            suggestions: tier2Suggestions,
          })
        );
      }

      await Promise.all(promises);

      const tier1Count = Object.keys(tier1Fields).length;
      const tier2Count = tier2Suggestions.length;
      const messages: string[] = [];
      if (tier1Count > 0) messages.push(`${tier1Count} field${tier1Count !== 1 ? "s" : ""} saved`);
      if (tier2Count > 0)
        messages.push(`${tier2Count} change${tier2Count !== 1 ? "s" : ""} submitted for review`);
      showToast(messages.join(" • "));
      router.back();
    } catch (error) {
      const msg = error instanceof Error ? error.message : (error as any)?.message ?? String(error);
      showToast(`Failed to update: ${msg}`, "error");
    }
  });

  if (bourbonLoading || !bourbon || (user && profileLoading)) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center">
        <ActivityIndicator color={colors.spinnerDefault} size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center px-8">
        <Text className="text-red-400 text-center text-base">
          You must be signed in to edit bourbons.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-brand-400 text-sm">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPending = updateBourbon.isPending || submitSuggestion.isPending;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand-900"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="px-4 py-6 gap-4"
        contentContainerStyle={{ paddingTop: insets.top + 8 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-brand-100 text-2xl font-bold mb-2">Edit Bourbon</Text>

        {/* Name — admin only */}
        {mode === "admin" ? (
          <Field label="Name *" error={errors.name?.message}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-brand-800 text-brand-100 rounded-xl px-4 py-3 text-base"
                  placeholderTextColor={colors.placeholderDark}
                  placeholder="e.g. Blanton's Original"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </Field>
        ) : (
          // Register name so Zod validation can use the pre-filled bourbon name value
          <Controller control={control} name="name" render={() => <></>} />
        )}

        <Field label="Distillery" error={errors.distillery?.message}>
          <Controller
            control={control}
            name="distillery"
            render={({ field: { onChange, value } }) => (
              <SearchablePicker
                testID="distillery-picker"
                data={distilleries}
                value={value ?? ""}
                onChange={onChange}
                onSearchChange={setDistillerySearch}
                allowCreate
                placeholder="e.g. Buffalo Trace"
                isLoading={distilleriesLoading}
              />
            )}
          />
        </Field>

        <Field label="Proof" error={errors.proof?.message}>
          <Controller
            control={control}
            name="proof"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-brand-800 text-brand-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor={colors.placeholderDark}
                placeholder="e.g. 93"
                keyboardType="decimal-pad"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        <Field label="Type" error={errors.type?.message}>
          <Controller
            control={control}
            name="type"
            render={({ field: { onChange, value } }) => (
              <View className="flex-row flex-wrap gap-2">
                {BOURBON_TYPES.map(({ label, value: typeValue }) => (
                  <TouchableOpacity
                    key={typeValue}
                    onPress={() => onChange(value === typeValue ? "" : typeValue)}
                    className={`px-3 py-1.5 rounded-lg border ${
                      value === typeValue
                        ? "bg-brand-600 border-brand-500"
                        : "bg-brand-800 border-brand-700"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        value === typeValue ? "text-white" : "text-brand-400"
                      }`}
                    >
                      {label}
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
                className="bg-brand-800 text-brand-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor={colors.placeholderDark}
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
                className="bg-brand-800 text-brand-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor={colors.placeholderDark}
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
                className="bg-brand-800 text-brand-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor={colors.placeholderDark}
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
                className="bg-brand-800 text-brand-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor={colors.placeholderDark}
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

        {/* Image URL — admin only */}
        {mode === "admin" && (
          <Field label="Image URL" error={errors.image_url?.message}>
            <Controller
              control={control}
              name="image_url"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  testID="image-url-input"
                  className="bg-brand-800 text-brand-100 rounded-xl px-4 py-3 text-base"
                  placeholderTextColor={colors.placeholderDark}
                  placeholder="https://..."
                  autoCapitalize="none"
                  keyboardType="url"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                />
              )}
            />
          </Field>
        )}

        <Field label="Country" error={errors.country?.message}>
          <Controller
            control={control}
            name="country"
            render={({ field: { onChange, value } }) => (
              <Dropdown
                testID="country-dropdown"
                data={WHISKEY_COUNTRIES}
                labelField="label"
                valueField="value"
                value={value ?? null}
                onChange={(item) => {
                  onChange(item.value);
                  setValue("state", "");
                }}
                placeholder="Select country"
                style={dropdownStyle}
                placeholderStyle={dropdownPlaceholderStyle}
                selectedTextStyle={dropdownSelectedTextStyle}
                containerStyle={dropdownContainerStyle}
                itemTextStyle={dropdownItemTextStyle}
              />
            )}
          />
        </Field>

        {provinces && (
          <Field label="State / Province" error={errors.state?.message}>
            <Controller
              control={control}
              name="state"
              render={({ field: { onChange, value } }) => (
                <Dropdown
                  testID="state-dropdown"
                  data={provinces}
                  labelField="label"
                  valueField="value"
                  value={value || null}
                  onChange={(item) => onChange(item.value)}
                  placeholder="Select state / province"
                  style={dropdownStyle}
                  placeholderStyle={dropdownPlaceholderStyle}
                  selectedTextStyle={dropdownSelectedTextStyle}
                  containerStyle={dropdownContainerStyle}
                  itemTextStyle={dropdownItemTextStyle}
                />
              )}
            />
          </Field>
        )}

        <Field label="City" error={errors.city?.message}>
          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-brand-800 text-brand-100 rounded-xl px-4 py-3 text-base"
                placeholderTextColor={colors.placeholderDark}
                placeholder="e.g. Frankfort"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
              />
            )}
          />
        </Field>

        <TouchableOpacity
          onPress={onSubmit}
          disabled={isPending}
          className="mt-4 bg-brand-600 rounded-xl py-4 items-center"
        >
          {isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="text-white font-semibold text-base">Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { reset(); router.back(); }}
          className="py-3 items-center"
        >
          <Text className="text-brand-400 text-sm">Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const dropdownStyle = {
  backgroundColor: colors.brand800,
  borderRadius: 12,
  paddingHorizontal: 16,
  paddingVertical: 4,
};

const dropdownPlaceholderStyle = {
  color: colors.placeholderDark,
  fontSize: 16,
};

const dropdownSelectedTextStyle = {
  color: colors.brand100,
  fontSize: 16,
};

const dropdownContainerStyle = {
  backgroundColor: colors.brand800,
  borderRadius: 12,
  borderColor: colors.brand700,
};

const dropdownItemTextStyle = {
  color: colors.brand100,
  fontSize: 14,
};

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
      <Text className="text-brand-300 text-sm font-medium">{label}</Text>
      {children}
      {error ? <Text className="text-red-400 text-xs">{error}</Text> : null}
    </View>
  );
}
