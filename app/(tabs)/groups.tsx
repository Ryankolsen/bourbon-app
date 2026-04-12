import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
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

export default function GroupsScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: myGroups, isLoading: groupsLoading } = useMyGroups(user?.id);
  const { data: invites, isLoading: invitesLoading } = useGroupInvites(
    user?.id
  );
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
          Alert.alert("Error", message);
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
          Alert.alert("Error", pgErr?.message ?? pgErr?.code ?? "Failed to accept invite.");
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
          Alert.alert("Error", pgErr?.message ?? pgErr?.code ?? "Failed to decline invite.");
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

  const pendingInvites = invites ?? [];
  const groups = myGroups ?? [];

  return (
    <View className="flex-1 bg-bourbon-900">
      <ScrollView contentContainerClassName="p-4 pb-8">
        {/* Pending invites */}
        {pendingInvites.length > 0 && (
          <View className="mb-6">
            <Text className="text-bourbon-400 text-xs font-semibold uppercase mb-3">
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
                  className="bg-bourbon-800 rounded-2xl p-4 mb-3"
                >
                  <Text className="text-bourbon-100 font-bold text-base">
                    {group?.name ?? "Unknown Group"}
                  </Text>
                  <Text className="text-bourbon-400 text-xs mt-0.5 mb-3">
                    Invited by {inviterName}
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => handleAccept(invite.group_id)}
                      disabled={acceptInvite.isPending}
                      className="flex-1 bg-bourbon-600 rounded-xl py-2.5 items-center"
                    >
                      <Text className="text-white font-semibold text-sm">
                        Accept
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDecline(invite.group_id)}
                      disabled={declineInvite.isPending}
                      className="flex-1 border border-bourbon-600 rounded-xl py-2.5 items-center"
                    >
                      <Text className="text-bourbon-400 font-semibold text-sm">
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
          <Text className="text-bourbon-400 text-xs font-semibold uppercase">
            My Groups
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            className="bg-bourbon-600 rounded-full px-4 py-1.5"
          >
            <Text className="text-white text-xs font-semibold">+ New</Text>
          </TouchableOpacity>
        </View>

        {/* Groups list */}
        {groups.length === 0 ? (
          <View className="items-center mt-12 px-8">
            <Text className="text-4xl mb-4">🥃</Text>
            <Text className="text-bourbon-100 text-lg font-bold mb-2">
              No groups yet
            </Text>
            <Text className="text-bourbon-400 text-center text-sm">
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
                className="bg-bourbon-800 rounded-2xl p-4 mb-3"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-bourbon-100 font-bold text-base flex-1 mr-2">
                    {group?.name ?? "Group"}
                  </Text>
                  {item.role === "owner" && (
                    <View className="bg-bourbon-600 rounded-full px-2 py-0.5">
                      <Text className="text-bourbon-100 text-xs">Owner</Text>
                    </View>
                  )}
                </View>
                {group?.description ? (
                  <Text
                    className="text-bourbon-400 text-sm mt-1"
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
          <View className="bg-bourbon-900 rounded-t-3xl px-6 pt-6 pb-10">
            <Text className="text-bourbon-100 text-xl font-bold mb-5">
              Create Group
            </Text>

            <Text className="text-bourbon-300 text-sm mb-1">Name *</Text>
            <TextInput
              value={groupName}
              onChangeText={setGroupName}
              placeholder="e.g. Friday Night Pours"
              placeholderTextColor="#7c6a50"
              className="bg-bourbon-800 rounded-xl px-4 py-3 text-bourbon-100 text-sm mb-4"
              maxLength={100}
            />

            <Text className="text-bourbon-300 text-sm mb-1">
              Description (optional)
            </Text>
            <TextInput
              value={groupDescription}
              onChangeText={setGroupDescription}
              placeholder="A short description of your group"
              placeholderTextColor="#7c6a50"
              className="bg-bourbon-800 rounded-xl px-4 py-3 text-bourbon-100 text-sm mb-6"
              multiline
              numberOfLines={3}
              maxLength={500}
            />

            <TouchableOpacity
              onPress={handleCreate}
              disabled={!groupName.trim() || createGroup.isPending}
              className={`rounded-2xl py-4 items-center ${
                groupName.trim() ? "bg-bourbon-600" : "bg-bourbon-800"
              }`}
            >
              {createGroup.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  className={`font-bold text-base ${
                    groupName.trim() ? "text-white" : "text-bourbon-600"
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
              <Text className="text-bourbon-400 text-base">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
