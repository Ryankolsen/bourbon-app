import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  FlatList,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useGroup,
  useGroupMembers,
  useInviteToGroup,
  useLeaveGroup,
} from "@/hooks/use-groups";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: members, isLoading: membersLoading } = useGroupMembers(id);
  const inviteToGroup = useInviteToGroup();
  const leaveGroup = useLeaveGroup();

  const [inviteUserId, setInviteUserId] = useState("");

  const isLoading = groupLoading || membersLoading;

  const currentMember = members?.find((m) => m.user_id === user?.id);
  const isOwner = currentMember?.role === "owner";
  const acceptedMembers = members?.filter((m) => m.status === "accepted") ?? [];
  const pendingMembers = members?.filter((m) => m.status === "pending") ?? [];

  function handleInvite() {
    const trimmed = inviteUserId.trim();
    if (!trimmed || !id || !user?.id) return;
    inviteToGroup.mutate(
      { groupId: id, inviteeId: trimmed, inviterId: user.id },
      {
        onSuccess: () => {
          setInviteUserId("");
          Alert.alert("Invited", "Invitation sent.");
        },
        onError: (err) => {
          Alert.alert(
            "Error",
            err instanceof Error ? err.message : "Failed to send invite."
          );
        },
      }
    );
  }

  function handleLeave() {
    if (!id || !user?.id) return;
    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          leaveGroup.mutate(
            { groupId: id, userId: user.id },
            {
              onSuccess: () => router.replace("/(tabs)/groups" as never),
              onError: (err) => {
                Alert.alert(
                  "Error",
                  err instanceof Error ? err.message : "Failed to leave group."
                );
              },
            }
          );
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center">
        <ActivityIndicator color="#e39e38" size="large" />
      </View>
    );
  }

  if (!group) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center px-8">
        <Text className="text-red-400 text-center text-base">
          Group not found.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-bourbon-400 text-sm">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bourbon-900">
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-bourbon-400 text-base">← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8">
        {/* Group name + description */}
        <View className="mt-4 mb-6">
          <Text className="text-bourbon-100 text-2xl font-bold">
            {group.name}
          </Text>
          {group.description ? (
            <Text className="text-bourbon-400 text-sm mt-1">
              {group.description}
            </Text>
          ) : null}
        </View>

        {/* Member count */}
        <View className="bg-bourbon-800 rounded-2xl p-4 mb-4 flex-row items-center justify-between">
          <Text className="text-bourbon-300 text-sm font-semibold">
            Members
          </Text>
          <Text className="text-bourbon-100 text-lg font-bold">
            {acceptedMembers.length}
          </Text>
        </View>

        {/* Accepted members list */}
        <View className="mb-6">
          {acceptedMembers.map((m) => {
            const profile = m.profiles as
              | {
                  display_name: string | null;
                  username: string | null;
                  avatar_url: string | null;
                }
              | null
              | undefined;
            const name =
              profile?.display_name ?? profile?.username ?? "Unknown";
            const initials = name[0]?.toUpperCase() ?? "?";
            return (
              <View
                key={m.user_id}
                className="flex-row items-center bg-bourbon-800 rounded-2xl p-3 mb-2"
              >
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-bourbon-700 items-center justify-center">
                    <Text className="text-bourbon-300 font-bold">{initials}</Text>
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text className="text-bourbon-100 text-sm font-semibold">
                    {name}
                  </Text>
                  {profile?.username ? (
                    <Text className="text-bourbon-400 text-xs">
                      @{profile.username}
                    </Text>
                  ) : null}
                </View>
                {m.role === "owner" && (
                  <View className="bg-bourbon-600 rounded-full px-2 py-0.5">
                    <Text className="text-bourbon-100 text-xs">Owner</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Pending invites (owner only) */}
        {isOwner && pendingMembers.length > 0 && (
          <View className="mb-6">
            <Text className="text-bourbon-400 text-xs font-semibold uppercase mb-2">
              Pending Invites
            </Text>
            {pendingMembers.map((m) => {
              const profile = m.profiles as
                | {
                    display_name: string | null;
                    username: string | null;
                    avatar_url: string | null;
                  }
                | null
                | undefined;
              const name =
                profile?.display_name ?? profile?.username ?? m.user_id;
              return (
                <View
                  key={m.user_id}
                  className="flex-row items-center bg-bourbon-800 rounded-2xl p-3 mb-2"
                >
                  <View className="w-10 h-10 rounded-full bg-bourbon-700 items-center justify-center">
                    <Text className="text-bourbon-300 font-bold">?</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-bourbon-100 text-sm font-semibold">
                      {name}
                    </Text>
                    <Text className="text-bourbon-400 text-xs">Pending</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Invite by user ID (owner only) */}
        {isOwner && (
          <View className="bg-bourbon-800 rounded-2xl p-4 mb-4">
            <Text className="text-bourbon-300 text-sm font-semibold mb-2">
              Invite Member
            </Text>
            <TextInput
              value={inviteUserId}
              onChangeText={setInviteUserId}
              placeholder="User ID (UUID)"
              placeholderTextColor="#7c6a50"
              className="bg-bourbon-700 rounded-xl px-4 py-3 text-bourbon-100 text-sm mb-3"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={handleInvite}
              disabled={!inviteUserId.trim() || inviteToGroup.isPending}
              className="bg-bourbon-600 rounded-xl py-3 items-center"
            >
              {inviteToGroup.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-sm">
                  Send Invite
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Leave group (non-owner accepted members) */}
        {currentMember?.status === "accepted" && !isOwner && (
          <TouchableOpacity
            onPress={handleLeave}
            disabled={leaveGroup.isPending}
            className="border border-red-700 rounded-2xl py-4 items-center"
          >
            {leaveGroup.isPending ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Text className="text-red-400 font-semibold text-base">
                Leave Group
              </Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
