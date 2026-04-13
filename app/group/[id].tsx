import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  useGroup,
  useGroupMembers,
  useGroupRecommendations,
  useInviteToGroup,
  useLeaveGroup,
} from "@/hooks/use-groups";
import { useSearchProfiles } from "@/hooks/use-profile";

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { data: group, isLoading: groupLoading } = useGroup(id);
  const { data: members, isLoading: membersLoading } = useGroupMembers(id);
  const { data: recommendations = [] } = useGroupRecommendations(id);
  const inviteToGroup = useInviteToGroup();
  const leaveGroup = useLeaveGroup();

  const [inviteInput, setInviteInput] = useState("");
  // The value we actually fire the lookup for (only set when user presses Find)
  const [lookupQuery, setLookupQuery] = useState<string | undefined>(undefined);

  const { data: searchResults, isFetching: profileFetching } =
    useSearchProfiles(lookupQuery);

  const foundProfile = searchResults?.[0] ?? null;

  const isLoading = groupLoading || membersLoading;

  const currentMember = members?.find((m) => m.user_id === user?.id);
  const isOwner = currentMember?.role === "owner";
  const acceptedMembers = members?.filter((m) => m.status === "accepted") ?? [];
  const pendingMembers = members?.filter((m) => m.status === "pending") ?? [];

  // IDs already in the group (any status) so we don't re-invite
  const memberIds = new Set(members?.map((m) => m.user_id) ?? []);

  function handleFindUser() {
    const raw = inviteInput.trim().replace(/^@/, "");
    if (!raw) return;
    setLookupQuery(raw);
  }

  function handleInvite() {
    if (!foundProfile || !id || !user?.id) return;

    if (memberIds.has(foundProfile.id)) {
      Alert.alert(
        "Already a member",
        `${foundProfile.display_name ?? foundProfile.username} is already in this group.`
      );
      return;
    }

    inviteToGroup.mutate(
      { groupId: id, inviteeId: foundProfile.id, inviterId: user.id },
      {
        onSuccess: () => {
          setInviteInput("");
          setLookupQuery(undefined);
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

  // Derived state for invite UI
  const lookupFired = lookupQuery !== undefined;
  const lookupDone = lookupFired && !profileFetching;
  const inviteeName =
    foundProfile?.display_name ?? foundProfile?.username ?? null;

  return (
    <View className="flex-1 bg-bourbon-900">
      {/* Header */}
      <View className="px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
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
            const isMe = m.user_id === user?.id;
            return (
              <TouchableOpacity
                key={m.user_id}
                onPress={() => router.push(`/user/${m.user_id}` as never)}
                className="flex-row items-center bg-bourbon-800 rounded-2xl p-3 mb-2"
              >
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <View className="w-10 h-10 rounded-full bg-bourbon-700 items-center justify-center">
                    <Text className="text-bourbon-300 font-bold">
                      {initials}
                    </Text>
                  </View>
                )}
                <View className="ml-3 flex-1">
                  <Text className="text-bourbon-100 text-sm font-semibold">
                    {name}
                    {isMe ? " (you)" : ""}
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
              </TouchableOpacity>
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

        {/* Invite by username (owner only) */}
        {isOwner && (
          <View className="bg-bourbon-800 rounded-2xl p-4 mb-4">
            <Text className="text-bourbon-300 text-sm font-semibold mb-3">
              Invite Member
            </Text>

            <View className="flex-row gap-2 mb-3">
              <TextInput
                value={inviteInput}
                onChangeText={(v) => {
                  setInviteInput(v);
                  if (lookupQuery !== undefined) setLookupQuery(undefined);
                }}
                placeholder="@username or email"
                placeholderTextColor="#7c6a50"
                className="bg-bourbon-700 rounded-xl px-4 py-3 text-bourbon-100 text-sm flex-1"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="search"
                onSubmitEditing={handleFindUser}
              />
              <TouchableOpacity
                onPress={handleFindUser}
                disabled={!inviteInput.trim() || profileFetching}
                className="bg-bourbon-700 rounded-xl px-4 py-3 justify-center"
              >
                {profileFetching ? (
                  <ActivityIndicator size="small" color="#e39e38" />
                ) : (
                  <Text className="text-bourbon-200 text-sm font-semibold">
                    Find
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Lookup result */}
            {lookupDone && (
              <>
                {foundProfile ? (
                  <View className="bg-bourbon-900 rounded-xl p-3 mb-3 flex-row items-center gap-3">
                    {foundProfile.avatar_url ? (
                      <Image
                        source={{ uri: foundProfile.avatar_url }}
                        className="w-9 h-9 rounded-full"
                      />
                    ) : (
                      <View className="w-9 h-9 rounded-full bg-bourbon-700 items-center justify-center">
                        <Text className="text-bourbon-300 font-bold text-sm">
                          {(
                            foundProfile.display_name ??
                            foundProfile.username ??
                            "?"
                          )[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-bourbon-100 text-sm font-semibold">
                        {inviteeName ?? "—"}
                      </Text>
                      {foundProfile.username && (
                        <Text className="text-bourbon-400 text-xs">
                          @{foundProfile.username}
                        </Text>
                      )}
                    </View>
                  </View>
                ) : (
                  <Text className="text-bourbon-500 text-sm mb-3">
                    No user found for "{inviteInput}".
                  </Text>
                )}
              </>
            )}

            <TouchableOpacity
              onPress={handleInvite}
              disabled={!foundProfile || inviteToGroup.isPending}
              className={`rounded-xl py-3 items-center ${
                foundProfile ? "bg-bourbon-600" : "bg-bourbon-700"
              }`}
            >
              {inviteToGroup.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  className={`font-semibold text-sm ${
                    foundProfile ? "text-white" : "text-bourbon-600"
                  }`}
                >
                  {foundProfile
                    ? `Invite ${inviteeName ?? "User"}`
                    : "Send Invite"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View className="mb-6">
            <Text className="text-bourbon-400 text-xs font-semibold uppercase mb-2">
              Recommendations
            </Text>
            {recommendations.map((rec) => {
              const recAny = rec as {
                id: string;
                note: string | null;
                created_at: string;
                profiles: { display_name: string | null; username: string | null } | null;
                bourbons: { id: string; name: string; distillery: string | null } | null;
              };
              const recommenderName =
                recAny.profiles?.display_name ?? recAny.profiles?.username ?? "Someone";
              const bourbonName = recAny.bourbons?.name ?? "Unknown bourbon";
              const distillery = recAny.bourbons?.distillery;
              const bourbonId = recAny.bourbons?.id;
              const date = new Date(recAny.created_at).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              return (
                <TouchableOpacity
                  key={recAny.id}
                  onPress={() => bourbonId ? router.push(`/bourbon/${bourbonId}` as never) : undefined}
                  className="bg-bourbon-800 rounded-2xl p-4 mb-2"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-bourbon-100 text-sm font-semibold">
                        {bourbonName}
                      </Text>
                      {distillery ? (
                        <Text className="text-bourbon-400 text-xs mt-0.5">{distillery}</Text>
                      ) : null}
                      {recAny.note ? (
                        <Text className="text-bourbon-300 text-xs mt-1 leading-relaxed">
                          "{recAny.note}"
                        </Text>
                      ) : null}
                    </View>
                    <View className="items-end ml-2">
                      <Text className="text-bourbon-300 text-xs font-medium">{recommenderName}</Text>
                      <Text className="text-bourbon-500 text-xs mt-0.5">{date}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
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
