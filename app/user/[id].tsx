import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/hooks/use-auth";
import { useProfile, useUserPublicStats } from "@/hooks/use-profile";
import {
  useFollowerCount,
  useFollowingCount,
  useIsFollowing,
  useFollowUser,
  useUnfollowUser,
} from "@/hooks/use-follows";
import { useSharesGroup } from "@/hooks/use-groups";
import { useCollection } from "@/hooks/use-collection";
import { useTastings } from "@/hooks/use-tastings";

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const { data: profile, isLoading } = useProfile(id);
  const { data: followerCount } = useFollowerCount(id);
  const { data: followingCount } = useFollowingCount(id);
  const { data: isFollowing } = useIsFollowing(user?.id, id);
  const { data: publicStats } = useUserPublicStats(id);
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const { data: sharesGroup } = useSharesGroup(user?.id, id);
  const { data: memberCollection = [] } = useCollection(sharesGroup ? id : undefined);
  const { data: memberTastings = [] } = useTastings(sharesGroup ? id : undefined);

  const isOwnProfile = user?.id === id;
  const insets = useSafeAreaInsets();

  function handleFollowToggle() {
    if (!user?.id || !id) return;
    if (isFollowing) {
      unfollowUser.mutate({ followerId: user.id, followingId: id });
    } else {
      followUser.mutate({ followerId: user.id, followingId: id });
    }
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center">
        <ActivityIndicator color="#e39e38" size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center px-8">
        <Text className="text-red-400 text-center text-base">
          User not found.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-bourbon-400 text-sm">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const displayName = profile.display_name ?? profile.username ?? "User";
  const initials = displayName[0].toUpperCase();

  return (
    <View className="flex-1 bg-bourbon-900">
      {/* Header */}
      <View className="px-4 pb-2" style={{ paddingTop: insets.top + 8 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text className="text-bourbon-400 text-base">← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8">
        {/* Avatar + name */}
        <View className="items-center mt-4 mb-6">
          {profile.avatar_url ? (
            <Image
              source={{ uri: profile.avatar_url }}
              className="w-24 h-24 rounded-full"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-bourbon-700 items-center justify-center">
              <Text className="text-bourbon-300 text-3xl font-bold">
                {initials}
              </Text>
            </View>
          )}

          <Text className="text-bourbon-100 text-xl font-bold mt-3">
            {displayName}
          </Text>
          {profile.username && (
            <Text className="text-bourbon-400 text-sm mt-0.5">
              @{profile.username}
            </Text>
          )}
        </View>

        {/* Follower / following counts */}
        <View className="flex-row bg-bourbon-800 rounded-2xl p-4 mb-4 justify-around">
          <View className="items-center">
            <Text className="text-bourbon-100 text-xl font-bold">
              {followerCount ?? 0}
            </Text>
            <Text className="text-bourbon-400 text-xs mt-0.5">Followers</Text>
          </View>
          <View className="w-px bg-bourbon-700" />
          <View className="items-center">
            <Text className="text-bourbon-100 text-xl font-bold">
              {followingCount ?? 0}
            </Text>
            <Text className="text-bourbon-400 text-xs mt-0.5">Following</Text>
          </View>
        </View>

        {/* Tasting / collection counts */}
        <View className="flex-row bg-bourbon-800 rounded-2xl p-4 mb-4 justify-around">
          <View className="items-center">
            <Text className="text-bourbon-100 text-xl font-bold">
              {publicStats?.tasting_count ?? 0}
            </Text>
            <Text className="text-bourbon-400 text-xs mt-0.5">Tastings</Text>
          </View>
          <View className="w-px bg-bourbon-700" />
          <View className="items-center">
            <Text className="text-bourbon-100 text-xl font-bold">
              {publicStats?.collection_count ?? 0}
            </Text>
            <Text className="text-bourbon-400 text-xs mt-0.5">Collection</Text>
          </View>
        </View>

        {/* Follow / unfollow button (hidden on own profile) */}
        {!isOwnProfile && user && (
          <TouchableOpacity
            onPress={handleFollowToggle}
            disabled={followUser.isPending || unfollowUser.isPending}
            className={`rounded-2xl py-4 items-center ${
              isFollowing ? "bg-bourbon-800 border border-bourbon-600" : "bg-bourbon-600"
            }`}
          >
            {followUser.isPending || unfollowUser.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                className={`font-semibold text-base ${
                  isFollowing ? "text-bourbon-300" : "text-white"
                }`}
              >
                {isFollowing ? "Following" : "Follow"}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {isOwnProfile && (
          <View className="bg-bourbon-800 rounded-2xl p-4 items-center">
            <Text className="text-bourbon-400 text-sm">This is your profile</Text>
          </View>
        )}

        {/* ── GROUP MEMBER SECTIONS ── */}
        {sharesGroup && !isOwnProfile && (
          <>
            {/* Their Collection */}
            <View className="mt-6">
              <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Collection
              </Text>
              {memberCollection.length === 0 ? (
                <Text className="text-bourbon-500 text-sm text-center py-3">
                  No bottles in collection yet.
                </Text>
              ) : (
                memberCollection.map((item) => {
                  const bourbon = item.bourbons as
                    | { id: string; name: string; distillery: string | null }
                    | null
                    | undefined;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() =>
                        bourbon?.id
                          ? router.push(`/bourbon/${bourbon.id}` as never)
                          : undefined
                      }
                      className="bg-bourbon-800 rounded-2xl p-3 mb-2"
                    >
                      <Text className="text-bourbon-100 text-sm font-semibold">
                        {bourbon?.name ?? "Unknown Bourbon"}
                      </Text>
                      {bourbon?.distillery ? (
                        <Text className="text-bourbon-400 text-xs mt-0.5">
                          {bourbon.distillery}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            {/* Their Tastings */}
            <View className="mt-6">
              <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-3">
                Tastings
              </Text>
              {memberTastings.length === 0 ? (
                <Text className="text-bourbon-500 text-sm text-center py-3">
                  No tastings logged yet.
                </Text>
              ) : (
                memberTastings.map((tasting) => {
                  const bourbon = tasting.bourbons as
                    | { id: string; name: string }
                    | null
                    | undefined;
                  const date = new Date(
                    (tasting as { tasted_at: string }).tasted_at
                  ).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <TouchableOpacity
                      key={tasting.id}
                      onPress={() =>
                        bourbon?.id
                          ? router.push(`/bourbon/${bourbon.id}` as never)
                          : undefined
                      }
                      className="bg-bourbon-800 rounded-2xl p-3 mb-2"
                    >
                      <View className="flex-row items-center justify-between">
                        <Text className="text-bourbon-100 text-sm font-semibold flex-1 mr-2">
                          {bourbon?.name ?? "Unknown Bourbon"}
                        </Text>
                        {(tasting as { rating: number | null }).rating != null && (
                          <Text className="text-bourbon-400 text-xs">
                            {"★".repeat(
                              (tasting as { rating: number }).rating
                            )}
                            {"☆".repeat(
                              5 - (tasting as { rating: number }).rating
                            )}
                          </Text>
                        )}
                      </View>
                      <Text className="text-bourbon-500 text-xs mt-0.5">
                        {date}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
