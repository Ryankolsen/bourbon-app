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
import { useRouter, useLocalSearchParams } from "expo-router";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Dropdown } from "react-native-element-dropdown";
import { useAuth } from "@/hooks/use-auth";
import { useUpdateBourbon, useBourbon } from "@/hooks/use-bourbons";
import { useProfile } from "@/hooks/use-profile";
import { useDistilleries } from "@/hooks/use-distilleries";
import { useToast } from "@/lib/toast-provider";
import { BOURBON_TYPES, BourbonUpdateFormFields } from "@/lib/bourbons";
import { WHISKEY_COUNTRIES, getProvincesForCountry } from "@/lib/location-data";
import { SearchablePicker } from "@/components/SearchablePicker";

/** Optional bourbon fields that regular users can contribute to. */
const OPTIONAL_FIELDS = [
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
  "image_url",
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

// Admin mode requires a non-empty name; user mode pre-fills it from the DB (read-only)
const adminSchema = baseSchema.extend({ name: z.string().min(1, "Name is required") });
const userSchema = baseSchema.extend({ name: z.string().optional() });

const schema = adminSchema;

type FormValues = z.infer<typeof adminSchema>;

export default function EditBourbonScreen() {
  const { id, mode: modeParam } = useLocalSearchParams<{ id: string; mode?: string }>();
  const mode = modeParam === "user" ? "user" : "admin";
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { data: bourbon, isLoading: bourbonLoading } = useBourbon(id);
  const { data: profile } = useProfile(user?.id);
  const updateBourbon = useUpdateBourbon();
  const [distillerySearch, setDistillerySearch] = useState("");
  const { distilleries, isLoading: distilleriesLoading } = useDistilleries(distillerySearch);
  // Tracks which optional fields were null when the bourbon first loaded (user mode only)
  const [nullFields, setNullFields] = useState<Set<string>>(new Set());

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(mode === "user" ? userSchema : adminSchema) as Resolver<FormValues>,
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

      if (mode === "user") {
        const nullSet = new Set<string>();
        for (const field of OPTIONAL_FIELDS) {
          if (bourbon[field] == null) {
            nullSet.add(field);
          }
        }
        setNullFields(nullSet);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bourbonId, reset, mode]);

  const countryValue = watch("country");
  const provinces = getProvincesForCountry(countryValue ?? "");

  const onSubmit = handleSubmit((values) => {
    if (!user || !id) {
      showToast("Not authenticated", "error");
      return;
    }
    // In user mode, only submit fields that were null at load time
    const fieldsToSubmit: BourbonUpdateFormFields =
      mode === "user"
        ? (Object.fromEntries(
            Object.entries(values).filter(([k]) => nullFields.has(k))
          ) as BourbonUpdateFormFields)
        : values;

    updateBourbon.mutate(
      {
        id,
        updatedBy: user.id,
        fields: fieldsToSubmit,
      },
      {
        onSuccess: (bourbon) => {
          showToast(`${bourbon.name} updated`);
          router.replace(`/bourbon/${bourbon.id}`);
        },
        onError: (error) => {
          const msg = error instanceof Error ? error.message : String(error);
          showToast(`Failed to update: ${msg}`, "error");
        },
      }
    );
  });

  if (bourbonLoading || !bourbon) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center">
        <ActivityIndicator color={colors.spinnerDefault} size="large" />
      </View>
    );
  }

  // Admin mode requires is_admin; user mode only requires authentication
  if (mode === "admin" && !profile?.is_admin) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center px-8">
        <Text className="text-red-400 text-center text-base">
          You do not have permission to edit bourbons.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-brand-400 text-sm">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand-900"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerClassName="px-4 py-6 gap-4"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-brand-100 text-2xl font-bold mb-2">
          {mode === "user" ? "Add Missing Info" : "Edit Bourbon"}
        </Text>

        {/* Name — visible in admin mode; hidden-registered in user mode for validation */}
        {mode !== "user" ? (
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

        {(mode !== "user" || nullFields.has("distillery")) && (
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
        )}

        {(mode !== "user" || nullFields.has("proof")) && (
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
        )}

        {(mode !== "user" || nullFields.has("type")) && (
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
        )}

        {(mode !== "user" || nullFields.has("age_statement")) && (
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
        )}

        {(mode !== "user" || nullFields.has("mashbill")) && (
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
        )}

        {(mode !== "user" || nullFields.has("msrp")) && (
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
        )}

        {(mode !== "user" || nullFields.has("description")) && (
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
        )}

        {(mode !== "user" || nullFields.has("image_url")) && (
          <Field label="Image URL" error={errors.image_url?.message}>
            <Controller
              control={control}
              name="image_url"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
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

        {(mode !== "user" || nullFields.has("country")) && (
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
        )}

        {provinces && (mode !== "user" || nullFields.has("state")) && (
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

        {(mode !== "user" || nullFields.has("city")) && (
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
        )}

        <TouchableOpacity
          onPress={onSubmit}
          disabled={updateBourbon.isPending}
          className="mt-4 bg-brand-600 rounded-xl py-4 items-center"
        >
          {updateBourbon.isPending ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text className="text-white font-semibold text-base">Save Changes</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
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
