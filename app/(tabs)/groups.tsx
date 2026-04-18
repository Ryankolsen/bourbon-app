import { colors } from "@/lib/colors";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useMyGroups,
  useGroupInvites,
  useCreateGroup,
  useAcceptGroupInvite,
  useDeclineGroupInvite,
} from "@/hooks/use-groups";
import {
  useGroupNotifications,
  useDismissGroupNotification,
  useGroupNotificationsRealtime,
} from "@/hooks/use-group-notifications";
import type { GroupNotificationRow } from "@/hooks/use-group-notifications";
import { useToast } from "@/lib/toast-provider";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export default function GroupsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: myGroups, isLoading: groupsLoading } = useMyGroups(user?.id);
  const { data: invites, isLoading: invitesLoading } = useGroupInvites(
    user?.id
  );
  const { data: notifications } = useGroupNotifications(user?.id);
  const dismissNotification = useDismissGroupNotification(user?.id);
  const { showToast } = useToast();
  const qc = useQueryClient();

  useGroupNotificationsRealtime(user?.id, async (payload) => {
    // Invalidate so the notification card appears immediately
    qc.invalidateQueries({ queryKey: ["group-notifications", user?.id] });

    // Fetch joiner name and group name to show in the toast
    const [profileRes, groupRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, username")
        .eq("id", payload.joiner_id)
        .maybeSingle(),
      supabase
        .from("groups")
        .select("name")
        .eq("id", payload.group_id)
        .maybeSingle(),
    ]);

    const joinerName =
      profileRes.data?.display_name ?? profileRes.data?.username ?? "Someone";
    const groupName = groupRes.data?.name ?? "your group";

    showToast(
      `${joinerName} joined ${groupName}!`,
      "success",
      () => router.push(`/group/${payload.group_id}`)
    );
  });

  const createGroup = useCreateGroup();
  const acceptInvite = useAcceptGroupInvite();
  const declineInvite = useDeclineGroupInvite();

  const [modalVisible, setModalVisible] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");

  const isLoading = groupsLoading || invitesLoading;

  function handleCreate() {
    const name = groupName.trim();
    if (!name || !user?.id) return;
    createGroup.mutate(
      { userId: user.id, name, description: groupDescription.trim() || undefined },
      {
        onSuccess: (group) => {
          setModalVisible(false);
          setGroupName("");
          setGroupDescription("");
          router.push(`/group/${group.id}`);
        },
        onError: (err) => {
          const pgErr = err as any;
          const message =
            pgErr?.message ?? pgErr?.code ?? "Failed to create group.";
          console.error("[createGroup]", pgErr);
          showToast(message, "error");
        },
      }
    );
  }

  function handleAccept(groupId: string) {
    if (!user?.id) return;
    acceptInvite.mutate(
      { groupId, userId: user.id },
      {
        onError: (err) => {
          const pgErr = err as any;
          console.error("[acceptInvite]", pgErr);
          showToast(pgErr?.message ?? pgErr?.code ?? "Failed to accept invite.", "error");
        },
      }
    );
  }

  function handleDecline(groupId: string) {
    if (!user?.id) return;
    declineInvite.mutate(
      { groupId, userId: user.id },
      {
        onError: (err) => {
          const pgErr = err as any;
          console.error("[declineInvite]", pgErr);
          showToast(pgErr?.message ?? pgErr?.code ?? "Failed to decline invite.", "error");
        },
      }
    );
  }

  function handleDismissNotification(notificationId: string) {
    dismissNotification.mutate({ notificationId });
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-brand-900 items-center justify-center">
        <ActivityIndicator color={colors.spinnerDefault} size="large" />
      </View>
    );
  }

  const pendingInvites = invites ?? [];
  const groups = myGroups ?? [];
  const unreadNotifications: GroupNotificationRow[] = notifications ?? [];

  return (
    <View className="flex-1 bg-brand-900">
      <ScrollView contentContainerClassName="p-4 pb-8">

        {/* Join Notifications */}
        {unreadNotifications.length > 0 && (
          <View className="mb-6">
            <Text className="text-brand-400 text-xs font-semibold uppercase mb-3">
              New Members
            </Text>
            {unreadNotifications.map((notif) => {
              const joinerName =
                notif.profiles?.display_name ??
                notif.profiles?.username ??
                "Someone";
              const groupName = notif.groups?.name ?? "your group";
              const groupId = notif.groups?.id ?? notif.group_id;
              return (
                <View
                  key={notif.id}
                  className="bg-brand-800 rounded-2xl p-4 mb-3 flex-row items-start"
                >
                  <View className="flex-1">
                    <Text className="text-brand-100 text-sm font-semibold">
                      {joinerName} joined{" "}
                      <Text className="text-brand-300">{groupName}</Text>
                    </Text>
                    <TouchableOpacity
                      onPress={() => router.push(`/group/${groupId}`)}
                      className="mt-1"
                    >
                      <Text className="text-brand-500 text-xs font-semibold">
                        Manage Group →
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleDismissNotification(notif.id)}
                    className="ml-3 p-1"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text className="text-brand-500 text-base">✕</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <View className="mb-6">
            <Text className="text-brand-400 text-xs font-semibold uppercase mb-3">
              Pending Invites
            </Text>
            {pendingInvites.map((invite) => {
              const group = invite.groups as
                | { id: string; name: string; description: string | null }
                | null
                | undefined;
              const inviterProfile = (invite as any)
                .profiles as
                | {
                    display_name: string | null;
                    username: string | null;
                  }
                | null
                | undefined;
              const inviterName =
                inviterProfile?.display_name ??
                inviterProfile?.username ??
                "Someone";
              return (
                <View
                  key={invite.group_id}
                  className="bg-brand-800 rounded-2xl p-4 mb-3"
                >
                  <Text className="text-brand-100 font-bold text-base">
                    {group?.name ?? "Unknown Group"}
                  </Text>
                  <Text className="text-brand-400 text-xs mt-0.5 mb-3">
                    Invited by {inviterName}
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => handleAccept(invite.group_id)}
                      disabled={acceptInvite.isPending}
                      className="flex-1 bg-brand-600 rounded-xl py-2.5 items-center"
                    >
                      <Text className="text-white font-semibold text-sm">
                        Accept
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDecline(invite.group_id)}
                      disabled={declineInvite.isPending}
                      className="flex-1 border border-brand-600 rounded-xl py-2.5 items-center"
                    >
                      <Text className="text-brand-400 font-semibold text-sm">
                        Decline
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* My Groups header + create button */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-brand-400 text-xs font-semibold uppercase">
            My Groups
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="bg-brand-600 rounded-full px-4 py-1.5"
          >
            <Text className="text-white text-xs font-semibold">+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Groups list */}
        {groups.length === 0 ? (
          <View className="items-center mt-12 px-8">
            <Text className="text-4xl mb-4">🥃</Text>
            <Text className="text-brand-100 text-lg font-bold mb-2">
              No groups yet
            </Text>
            <Text className="text-brand-400 text-center text-sm">
              Create a group to share tastings and recommendations with friends.
            </Text>
          </View>
        ) : (
          groups.map((item) => {
            const group = item.groups as
              | { id: string; name: string; description: string | null }
              | null
              | undefined;
            return (
              <TouchableOpacity
                key={item.group_id}
                onPress={() => router.push(`/group/${item.group_id}`)}
                className="bg-brand-800 rounded-2xl p-4 mb-3"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-brand-100 font-bold text-base flex-1 mr-2">
                    {group?.name ?? "Group"}
                  </Text>
                  {item.role === "owner" && (
                    <View className="bg-brand-600 rounded-full px-2 py-0.5">
                      <Text className="text-brand-100 text-xs">Owner</Text>
                    </View>
                  )}
                </View>
                {group?.description ? (
                  <Text
                    className="text-brand-400 text-sm mt-1"
                    numberOfLines={2}
                  >
                    {group.description}
                  </Text>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Create Group Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/60">
          <View className="bg-brand-900 rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="text-brand-100 text-xl font-bold mb-5">
              Create Group
            </Text>

            <Text className="text-brand-300 text-sm mb-1">Name *</Text>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="e.g. Friday Night Pours"
              placeholderTextColor={colors.placeholderGroup}
              className="bg-brand-800 rounded-xl px-4 py-3 text-brand-100 text-sm mb-4"
              maxLength={100}
            />

            <Text className="text-brand-300 text-sm mb-1">
              Description (optional)
            </Text>
            <TextInput
              value={groupDescription}
              onChangeText={setGroupDescription}
              placeholder="A short description of your group"
              placeholderTextColor={colors.placeholderGroup}
              className="bg-brand-800 rounded-xl px-4 py-3 text-brand-100 text-sm mb-6"
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <TouchableOpacity
              onPress={handleCreate}
              disabled={!groupName.trim() || createGroup.isPending}
              className={`rounded-2xl py-4 items-center ${
                groupName.trim() ? "bg-brand-600" : "bg-brand-800"
              }`}
            >
              {createGroup.isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text
                  className={`font-bold text-base ${
                    groupName.trim() ? "text-white" : "text-brand-600"
                  }`}
                >
                  Create Group
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setModalVisible(false);
                setGroupName("");
                setGroupDescription("");
              }}
              className="mt-3 py-3 items-center"
            >
              <Text className="text-brand-400 text-base">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
