import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
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

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile(user?.id);
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();

  const [editing, setEditing] = useState(false);
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
      Alert.alert("Error", message);
    }
  }

  async function handleAvatarPress() {
    if (!user?.id) return;
    try {
      await uploadAvatar.mutateAsync({ userId: user.id });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to upload avatar";
      Alert.alert("Error", message);
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center">
        <ActivityIndicator color="#c8a96e" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bourbon-900"
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
              <View className="w-24 h-24 rounded-full bg-bourbon-700 items-center justify-center">
                <Text className="text-bourbon-300 text-3xl font-bold">
                  {(profile?.display_name ?? user?.email ?? "?")[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-bourbon-500 rounded-full w-7 h-7 items-center justify-center">
              {uploadAvatar.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white text-xs font-bold">✎</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text className="text-bourbon-400 text-xs mt-2">Tap to change photo</Text>
        </View>

        {/* Profile Info / Edit Form */}
        <View className="bg-bourbon-800 rounded-2xl p-5 mb-4">
          {editing ? (
            <>
              <Text className="text-bourbon-400 text-xs uppercase tracking-widest mb-1">
                Display Name
              </Text>
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your display name"
                placeholderTextColor="#6b5c45"
                className="text-bourbon-100 text-base border-b border-bourbon-600 pb-2 mb-4"
              />

              <Text className="text-bourbon-400 text-xs uppercase tracking-widest mb-1">
                Username
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="your_username"
                placeholderTextColor="#6b5c45"
                autoCapitalize="none"
                autoCorrect={false}
                className="text-bourbon-100 text-base border-b border-bourbon-600 pb-2"
              />

              <View className="flex-row gap-3 mt-5">
                <TouchableOpacity
                  onPress={cancelEditing}
                  className="flex-1 border border-bourbon-600 rounded-xl py-3 items-center"
                >
                  <Text className="text-bourbon-400 font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveProfile}
                  disabled={updateProfile.isPending}
                  className="flex-1 bg-bourbon-500 rounded-xl py-3 items-center"
                >
                  {updateProfile.isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold">Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text className="text-bourbon-400 text-xs uppercase tracking-widest mb-1">
                Display Name
              </Text>
              <Text className="text-bourbon-100 font-semibold text-base mb-4">
                {profile?.display_name ?? "—"}
              </Text>

              <Text className="text-bourbon-400 text-xs uppercase tracking-widest mb-1">
                Username
              </Text>
              <Text className="text-bourbon-100 font-semibold text-base mb-4">
                {profile?.username ? `@${profile.username}` : "—"}
              </Text>

              <Text className="text-bourbon-400 text-xs uppercase tracking-widest mb-1">
                Email
              </Text>
              <Text className="text-bourbon-100 font-semibold text-base">
                {user?.email ?? "—"}
              </Text>

              <TouchableOpacity
                onPress={startEditing}
                className="mt-5 border border-bourbon-500 rounded-xl py-3 items-center"
              >
                <Text className="text-bourbon-300 font-semibold">Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={signOut}
          className="bg-red-900/60 border border-red-800 rounded-2xl py-4 items-center"
        >
          <Text className="text-red-300 font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
