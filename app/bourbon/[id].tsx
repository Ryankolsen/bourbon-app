import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useBourbon } from "@/hooks/use-bourbons";
import { useAddToCollection } from "@/hooks/use-collection";
import { useIsWishlisted, useAddToWishlist, useRemoveFromWishlist } from "@/hooks/use-wishlist";
import { useComments, useGroupComments, useAddComment, useDeleteComment } from "@/hooks/use-comments";
import { useBourbonRatingStats, useGroupRatingStats } from "@/hooks/use-ratings";
import { useMyGroups, useRecommendBourbon } from "@/hooks/use-groups";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/lib/toast";

export default function BourbonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: bourbon, isLoading, isError } = useBourbon(id);
  const { user } = useAuth();
  const { showToast } = useToast();
  const addToCollection = useAddToCollection();
  const { data: wishlistItem } = useIsWishlisted(user?.id, id);
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();

  const { data: ratingStats } = useBourbonRatingStats(id);
  const { data: comments = [], isLoading: commentsLoading } = useComments(id);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();
  const [commentBody, setCommentBody] = useState("");

  // Group state
  const { data: myGroups = [] } = useMyGroups(user?.id);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [commentVisibility, setCommentVisibility] = useState<"public" | "group">("public");
  const recommendBourbon = useRecommendBourbon();
  const [showRecommendPicker, setShowRecommendPicker] = useState(false);

  // Resolve the active group (default to first if only one)
  const activeGroupId = selectedGroupId ?? (myGroups.length === 1
    ? (myGroups[0] as { group_id: string }).group_id
    : null);

  const { data: groupRating } = useGroupRatingStats(id, activeGroupId ?? undefined);
  const { data: groupComments = [], isLoading: groupCommentsLoading } = useGroupComments(
    id,
    activeGroupId ?? undefined
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center">
        <ActivityIndicator color="#e39e38" size="large" />
      </View>
    );
  }

  if (isError || !bourbon) {
    return (
      <View className="flex-1 bg-bourbon-900 items-center justify-center px-8">
        <Text className="text-red-400 text-center text-base">
          Failed to load bourbon details.
        </Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-bourbon-400 text-sm">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function handlePostComment() {
    const body = commentBody.trim();
    if (!user || !body) return;

    const entry =
      commentVisibility === "group" && activeGroupId
        ? { bourbon_id: bourbon!.id, user_id: user.id, body, visibility: "group" as const, group_id: activeGroupId }
        : { bourbon_id: bourbon!.id, user_id: user.id, body, visibility: "public" as const };

    addComment.mutate(entry, {
      onSuccess: () => setCommentBody(""),
      onError: () => Alert.alert("Error", "Failed to post comment."),
    });
  }

  function handleRecommend(groupId: string) {
    if (!user || !bourbon) return;
    recommendBourbon.mutate(
      { groupId, bourbonId: bourbon.id, userId: user.id },
      {
        onSuccess: () => {
          setShowRecommendPicker(false);
          Alert.alert("Recommended!", "Bourbon recommended to the group.");
        },
        onError: (err) => {
          setShowRecommendPicker(false);
          const msg = err instanceof Error ? err.message : "Failed to recommend.";
          // unique constraint violation means already recommended
          Alert.alert("Already recommended", msg.includes("unique") ? "You already recommended this bourbon to that group." : msg);
        },
      }
    );
  }

  function handleDeleteComment(commentId: string, groupId?: string | null) {
    Alert.alert("Delete Comment", "Remove this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteComment.mutate(
            { id: commentId, bourbonId: bourbon!.id, groupId },
            { onError: () => Alert.alert("Error", "Failed to delete comment.") }
          ),
      },
    ]);
  }

  const hasGroups = myGroups.length > 0;
  const activeGroup = myGroups.find(
    (m) => (m as { group_id: string }).group_id === activeGroupId
  ) as { group_id: string; groups: { id: string; name: string } | null } | undefined;

  return (
    <View className="flex-1 bg-bourbon-900">
      {/* Header */}
      <View
        className="px-4 pb-2 flex-row items-center gap-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Text className="text-bourbon-400 text-base">← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-4 pb-8">
        {/* Title block */}
        <View className="mb-6">
          <Text className="text-bourbon-100 text-2xl font-bold">{bourbon.name}</Text>
          {bourbon.distillery && (
            <Text className="text-bourbon-400 text-base mt-1">{bourbon.distillery}</Text>
          )}
          {(bourbon.city || bourbon.state || bourbon.country) && (
            <Text className="text-bourbon-500 text-sm mt-0.5">
              {[bourbon.city, bourbon.state, bourbon.country].filter(Boolean).join(", ")}
            </Text>
          )}
          {bourbon.type && (
            <View className="mt-2 self-start bg-bourbon-700 px-3 py-1 rounded-full">
              <Text className="text-bourbon-200 text-xs font-medium capitalize">
                {bourbon.type}
              </Text>
            </View>
          )}
        </View>

        {/* Community Rating */}
        <View className="bg-bourbon-800 rounded-2xl p-4 mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-1">
              Community Rating
            </Text>
            {ratingStats && ratingStats.rating_count > 0 ? (
              <View className="flex-row items-baseline gap-2">
                <Text className="text-bourbon-100 text-3xl font-bold">
                  {ratingStats.avg_rating}
                </Text>
                <Text className="text-bourbon-400 text-sm">/5</Text>
              </View>
            ) : (
              <Text className="text-bourbon-500 text-sm">No ratings yet</Text>
            )}
          </View>
          {ratingStats && ratingStats.rating_count > 0 && (
            <View className="items-end">
              <Text className="text-bourbon-300 text-lg font-semibold">
                {ratingStats.rating_count}
              </Text>
              <Text className="text-bourbon-500 text-xs">
                {ratingStats.rating_count === 1 ? "rating" : "ratings"}
              </Text>
            </View>
          )}
        </View>

        {/* Group Rating */}
        {hasGroups && (
          <View className="bg-bourbon-800 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider">
                Group Rating
              </Text>
              {myGroups.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View className="flex-row gap-2">
                    {myGroups.map((m) => {
                      const gm = m as { group_id: string; groups: { name: string } | null };
                      const isActive = activeGroupId === gm.group_id;
                      return (
                        <TouchableOpacity
                          key={gm.group_id}
                          onPress={() => setSelectedGroupId(gm.group_id)}
                          className={`px-3 py-1 rounded-full ${isActive ? "bg-bourbon-600" : "bg-bourbon-700"}`}
                        >
                          <Text className={`text-xs font-medium ${isActive ? "text-white" : "text-bourbon-300"}`}>
                            {gm.groups?.name ?? "Group"}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
            </View>

            {activeGroupId ? (
              <View className="flex-row items-center justify-between">
                <View>
                  {groupRating && groupRating.rating_count > 0 ? (
                    <View className="flex-row items-baseline gap-2">
                      <Text className="text-bourbon-100 text-3xl font-bold">
                        {groupRating.avg_rating}
                      </Text>
                      <Text className="text-bourbon-400 text-sm">/5</Text>
                    </View>
                  ) : (
                    <Text className="text-bourbon-500 text-sm">No group ratings yet</Text>
                  )}
                  {activeGroup?.groups?.name && myGroups.length === 1 && (
                    <Text className="text-bourbon-500 text-xs mt-0.5">{activeGroup.groups.name}</Text>
                  )}
                </View>
                {groupRating && groupRating.rating_count > 0 && (
                  <View className="items-end">
                    <Text className="text-bourbon-300 text-lg font-semibold">
                      {groupRating.rating_count}
                    </Text>
                    <Text className="text-bourbon-500 text-xs">
                      {groupRating.rating_count === 1 ? "rating" : "ratings"}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <Text className="text-bourbon-500 text-sm">Select a group above</Text>
            )}
          </View>
        )}

        {/* Stats grid */}
        <View className="bg-bourbon-800 rounded-2xl p-4 mb-4">
          <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Specs
          </Text>
          <View className="flex-row flex-wrap gap-y-4">
            {bourbon.proof != null && (
              <StatItem label="Proof" value={`${bourbon.proof}`} />
            )}
            {bourbon.age_statement != null && (
              <StatItem label="Age" value={`${bourbon.age_statement} yr`} />
            )}
            {bourbon.msrp != null && (
              <StatItem label="MSRP" value={`$${bourbon.msrp}`} />
            )}
            {bourbon.mashbill && (
              <StatItem label="Mashbill" value={bourbon.mashbill} wide />
            )}
          </View>
          {!bourbon.proof && !bourbon.age_statement && !bourbon.msrp && !bourbon.mashbill && (
            <Text className="text-bourbon-500 text-sm">No spec data available yet.</Text>
          )}
        </View>

        {/* Description */}
        {bourbon.description && (
          <View className="bg-bourbon-800 rounded-2xl p-4 mb-4">
            <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-2">
              About
            </Text>
            <Text className="text-bourbon-200 text-sm leading-relaxed">
              {bourbon.description}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View className="gap-3 mt-2">
          <TouchableOpacity
            onPress={() => {
              if (!user) return;
              addToCollection.mutate(
                {
                  user_id: user.id,
                  bourbon_id: bourbon.id,
                },
                {
                  onSuccess: () => {
                    showToast(`${bourbon.name} added to your collection`);
                    router.back();
                  },
                  onError: () => {
                    showToast("Failed to add to collection", "error");
                  },
                }
              );
            }}
            disabled={addToCollection.isPending}
            className="bg-bourbon-600 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-base">
              {addToCollection.isPending ? "Adding..." : "+ Add to Collection"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/tasting/new?bourbonId=${bourbon.id}`)}
            className="bg-bourbon-800 border border-bourbon-600 rounded-2xl py-4 items-center"
          >
            <Text className="text-bourbon-200 font-semibold text-base">📓 Log Tasting</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              if (!user) return;
              if (wishlistItem) {
                removeFromWishlist.mutate({
                  id: wishlistItem.id,
                  userId: user.id,
                  bourbonId: bourbon.id,
                });
              } else {
                addToWishlist.mutate({ user_id: user.id, bourbon_id: bourbon.id });
              }
            }}
            disabled={addToWishlist.isPending || removeFromWishlist.isPending}
            className="bg-bourbon-800 border border-bourbon-600 rounded-2xl py-4 items-center"
          >
            <Text className="text-bourbon-200 font-semibold text-base">
              {wishlistItem ? "★ Remove from Wishlist" : "☆ Add to Wishlist"}
            </Text>
          </TouchableOpacity>

          {/* Recommend to Group (only if user belongs to at least one group) */}
          {hasGroups && (
            <>
              <TouchableOpacity
                onPress={() => {
                  if (myGroups.length === 1) {
                    handleRecommend((myGroups[0] as { group_id: string }).group_id);
                  } else {
                    setShowRecommendPicker((v) => !v);
                  }
                }}
                disabled={recommendBourbon.isPending}
                className="bg-bourbon-800 border border-bourbon-600 rounded-2xl py-4 items-center"
              >
                <Text className="text-bourbon-200 font-semibold text-base">
                  {recommendBourbon.isPending ? "Recommending…" : "👍 Recommend to Group"}
                </Text>
              </TouchableOpacity>

              {/* Group picker for multi-group members */}
              {showRecommendPicker && myGroups.length > 1 && (
                <View className="bg-bourbon-800 rounded-2xl p-4 gap-2">
                  <Text className="text-bourbon-400 text-xs font-semibold uppercase mb-1">
                    Choose a group
                  </Text>
                  {myGroups.map((m) => {
                    const gm = m as { group_id: string; groups: { name: string } | null };
                    return (
                      <TouchableOpacity
                        key={gm.group_id}
                        onPress={() => handleRecommend(gm.group_id)}
                        className="bg-bourbon-700 rounded-xl py-3 items-center"
                      >
                        <Text className="text-bourbon-100 text-sm font-medium">
                          {gm.groups?.name ?? "Group"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </View>

        {/* ── COMMENTS ── */}
        <View className="mt-8">
          <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Community Comments
          </Text>

          {/* Comment composer */}
          <View className="bg-bourbon-800 rounded-2xl p-3 mb-4">
            {/* Visibility toggle */}
            {hasGroups && (
              <View className="flex-row gap-2 mb-2">
                <TouchableOpacity
                  onPress={() => setCommentVisibility("public")}
                  className={`px-3 py-1 rounded-full ${commentVisibility === "public" ? "bg-bourbon-600" : "bg-bourbon-700"}`}
                >
                  <Text className={`text-xs font-medium ${commentVisibility === "public" ? "text-white" : "text-bourbon-300"}`}>
                    Public
                  </Text>
                </TouchableOpacity>
                {activeGroupId && (
                  <TouchableOpacity
                    onPress={() => setCommentVisibility("group")}
                    className={`px-3 py-1 rounded-full ${commentVisibility === "group" ? "bg-bourbon-600" : "bg-bourbon-700"}`}
                  >
                    <Text className={`text-xs font-medium ${commentVisibility === "group" ? "text-white" : "text-bourbon-300"}`}>
                      {activeGroup?.groups?.name ?? "Group only"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TextInput
              value={commentBody}
              onChangeText={setCommentBody}
              placeholder={
                commentVisibility === "group"
                  ? "Share with your group…"
                  : "Share your thoughts…"
              }
              placeholderTextColor="#6b5a3f"
              multiline
              maxLength={1000}
              className="text-bourbon-100 text-sm min-h-[56px]"
            />
            <TouchableOpacity
              onPress={handlePostComment}
              disabled={!commentBody.trim() || addComment.isPending}
              className="mt-2 self-end bg-bourbon-600 px-4 py-2 rounded-xl"
            >
              <Text className="text-white text-sm font-medium">
                {addComment.isPending ? "Posting…" : "Post"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Public comment list */}
          {commentsLoading ? (
            <ActivityIndicator color="#e39e38" />
          ) : comments.length === 0 ? (
            <Text className="text-bourbon-500 text-sm text-center py-4">
              No comments yet. Be the first!
            </Text>
          ) : (
            comments.map((comment) => {
              const author =
                comment.profiles?.display_name ??
                comment.profiles?.username ??
                "User";
              const isOwn = user?.id === comment.user_id;
              const date = new Date(comment.created_at).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric", year: "numeric" }
              );
              return (
                <View
                  key={comment.id}
                  className="bg-bourbon-800 rounded-2xl p-4 mb-3"
                >
                  <View className="flex-row justify-between items-start mb-1">
                    <Text className="text-bourbon-300 text-xs font-semibold">
                      {author}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-bourbon-500 text-xs">{date}</Text>
                      {isOwn && (
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(comment.id, comment.group_id)}
                        >
                          <Text className="text-red-400 text-xs">Delete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text className="text-bourbon-200 text-sm leading-relaxed">
                    {comment.body}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* ── GROUP COMMENTS ── */}
        {hasGroups && activeGroupId && (
          <View className="mt-6">
            <Text className="text-bourbon-400 text-xs font-semibold uppercase tracking-wider mb-3">
              {activeGroup?.groups?.name ? `${activeGroup.groups.name} — Group Comments` : "Group Comments"}
            </Text>

            {groupCommentsLoading ? (
              <ActivityIndicator color="#e39e38" />
            ) : groupComments.length === 0 ? (
              <Text className="text-bourbon-500 text-sm text-center py-4">
                No group comments yet.
              </Text>
            ) : (
              groupComments.map((comment) => {
                const author =
                  comment.profiles?.display_name ??
                  comment.profiles?.username ??
                  "User";
                const isOwn = user?.id === comment.user_id;
                const date = new Date(comment.created_at).toLocaleDateString(
                  undefined,
                  { month: "short", day: "numeric", year: "numeric" }
                );
                return (
                  <View
                    key={comment.id}
                    className="bg-bourbon-800 border border-bourbon-700 rounded-2xl p-4 mb-3"
                  >
                    <View className="flex-row justify-between items-start mb-1">
                      <Text className="text-bourbon-300 text-xs font-semibold">
                        {author}
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <Text className="text-bourbon-500 text-xs">{date}</Text>
                        {isOwn && (
                          <TouchableOpacity
                            onPress={() => handleDeleteComment(comment.id, comment.group_id)}
                          >
                            <Text className="text-red-400 text-xs">Delete</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <Text className="text-bourbon-200 text-sm leading-relaxed">
                      {comment.body}
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatItem({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <View className={wide ? "w-full" : "w-1/2"}>
      <Text className="text-bourbon-500 text-xs mb-0.5">{label}</Text>
      <Text className="text-bourbon-100 text-sm font-medium">{value}</Text>
    </View>
  );
}
