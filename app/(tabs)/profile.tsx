import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "@/hooks/use-auth";
import {
  useProfile,
  useUpdateProfile,
  useUploadAvatar,
} from "@/hooks/use-profile";
import { useFollowerCount, useFollowingCount } from "@/hooks/use-follows";
import { useUserXp } from "@/hooks/use-user-xp";
import { colors } from "@/lib/colors";
import { useTheme } from "@/lib/theme-provider";
import { type ThemeMode } from "@/lib/themes";
import { useToast } from "@/lib/toast-provider";
import { BeltBadge } from "@/components/BeltBadge";
import { XpProgressBar } from "@/components/XpProgressBar";
import { StreakCard } from "@/components/StreakCard";
import { DojoGuideModal } from "@/components/DojoGuideModal";
import { getTomorrowXp } from "@/lib/streak-utils";

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: "System", value: "system" },
  { label: "Light",  value: "light" },
  { label: "Dark",   value: "dark" },
  { label: "A11y",   value: "accessible" },
];

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const { data: followerCount } = useFollowerCount(user?.id);
  const { data: followingCount } = useFollowingCount(user?.id);
  const { themeMode, setThemeMode } = useTheme();
  const { showToast } = useToast();
  const xp = useUserXp(user?.id);

  const [editing, setEditing] = useState(false);
  const [dojoGuideVisible, setDojoGuideVisible] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  function startEditing() {
    setDisplayName(profile?.display_name ?? "");
    setUsername(profile?.username ?? "");
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
  }

  async function saveProfile() {
    if (!user?.id) return;
    try {
      await updateProfile.mutateAsync({
        userId: user.id,
        updates: {
          display_name: displayName.trim() || null,
          username: username.trim() || null,
        },
      });
      setEditing(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      showToast(message, "error");
    }
  }

  async function handleAvatarPress() {
    if (!user?.id) return;
    try {
      await uploadAvatar.mutateAsync({ userId: user.id });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload avatar";
      showToast(message, "error");
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center">
        <ActivityIndicator color={colors.spinnerAmber} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-brand-900"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, paddingTop: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View className="items-center mb-6">
          <TouchableOpacity
            onPress={handleAvatarPress}
            disabled={uploadAvatar.isPending}
            className="relative"
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <View className="w-24 h-24 rounded-full bg-brand-700 items-center justify-center">
                <Text className="text-brand-300 text-3xl font-bold">
                  {(profile?.display_name ?? user?.email ?? "?")[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-brand-500 rounded-full w-7 h-7 items-center justify-center">
              {uploadAvatar.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text className="text-white text-xs font-bold">✎</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text className="text-brand-400 text-xs mt-2">Tap to change photo</Text>
        </View>

        {/* Bourbon Dojo */}
        <View className="bg-brand-800 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-brand-400 text-xs uppercase tracking-widest">
              Bourbon Dojo
            </Text>
            <TouchableOpacity
              testID="dojo-guide-trigger"
              onPress={() => setDojoGuideVisible(true)}
              accessibilityLabel="Bourbon Dojo Guide"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-brand-400 text-base">ⓘ</Text>
            </TouchableOpacity>
          </View>
          {xp.isLoading ? (
            <ActivityIndicator color={colors.spinnerAmber} />
          ) : (
            <>
              <View className="flex-row items-center gap-2 mb-3">
                <BeltBadge level={xp.currentBelt} size={36} />
                <Text className="text-brand-100 font-bold text-base">
                  {xp.beltName}
                </Text>
              </View>
              <XpProgressBar totalXp={xp.totalXp} currentBelt={xp.currentBelt} />
              <View className="mt-3">
                <StreakCard
                  streakDays={xp.streakDays}
                  lastCheckinDate={xp.lastCheckinDate}
                  tomorrowXp={getTomorrowXp(xp.streakDays)}
                  isReset={false}
                />
              </View>
            </>
          )}
        </View>

        {/* Follower / following counts */}
        <View className="flex-row bg-brand-800 rounded-2xl p-4 mb-4 justify-around">
          <View className="items-center">
            <Text className="text-brand-100 text-xl font-bold">
              {followerCount ?? 0}
            </Text>
            <Text className="text-brand-400 text-xs mt-0.5">Followers</Text>
          </View>
          <View className="w-px bg-brand-700" />
          <View className="items-center">
            <Text className="text-brand-100 text-xl font-bold">
              {followingCount ?? 0}
            </Text>
            <Text className="text-brand-400 text-xs mt-0.5">Following</Text>
          </View>
        </View>

        {/* Profile Info / Edit Form */}
        <View className="bg-brand-800 rounded-2xl p-5 mb-4">
          {editing ? (
            <>
              <Text className="text-brand-400 text-xs uppercase tracking-widest mb-1">
                Display Name
              </Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your display name"
                placeholderTextColor={colors.placeholderMuted}
                className="text-brand-100 text-base border-b border-brand-600 pb-2 mb-4"
              />

              <Text className="text-brand-400 text-xs uppercase tracking-widest mb-1">
                Username
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="your_username"
                placeholderTextColor={colors.placeholderMuted}
                autoCapitalize="none"
                autoCorrect={false}
                className="text-brand-100 text-base border-b border-brand-600 pb-2"
              />

              <View className="flex-row gap-3 mt-5">
                <TouchableOpacity
                  onPress={cancelEditing}
                  className="flex-1 border border-brand-600 rounded-xl py-3 items-center"
                >
                  <Text className="text-brand-400 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveProfile}
                  disabled={updateProfile.isPending}
                  className="flex-1 bg-brand-500 rounded-xl py-3 items-center"
                >
                  {updateProfile.isPending ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text className="text-white font-semibold">Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text className="text-brand-400 text-xs uppercase tracking-widest mb-1">
                Display Name
              </Text>
              <Text className="text-brand-100 font-semibold text-base mb-4">
                {profile?.display_name ?? "—"}
              </Text>

              <Text className="text-brand-400 text-xs uppercase tracking-widest mb-1">
                Username
              </Text>
              <Text className="text-brand-100 font-semibold text-base mb-4">
                {profile?.username ? `@${profile.username}` : "—"}
              </Text>

              <Text className="text-brand-400 text-xs uppercase tracking-widest mb-1">
                Email
              </Text>
              <Text className="text-brand-100 font-semibold text-base">
                {user?.email ?? "—"}
              </Text>

              <TouchableOpacity
                onPress={startEditing}
                className="mt-5 border border-brand-500 rounded-xl py-3 items-center"
              >
                <Text className="text-brand-300 font-semibold">Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Theme Selector */}
        <View className="bg-brand-800 rounded-2xl p-5 mb-4">
          <Text className="text-brand-400 text-xs uppercase tracking-widest mb-3">
            Appearance
          </Text>
          <View className="flex-row gap-2">
            {THEME_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setThemeMode(opt.value)}
                className={`flex-1 py-2 rounded-xl items-center border ${
                  themeMode === opt.value
                    ? "bg-brand-500 border-brand-500"
                    : "border-brand-600"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    themeMode === opt.value ? "text-white" : "text-brand-400"
                  }`}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={signOut}
          className="bg-red-900/60 border border-red-800 rounded-2xl py-4 items-center"
        >
          <Text className="text-red-300 font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <DojoGuideModal
        visible={dojoGuideVisible}
        totalXp={xp.totalXp}
        onClose={() => setDojoGuideVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
