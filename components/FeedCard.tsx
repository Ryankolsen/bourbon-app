import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { StarRating } from "@/components/StarRating";
import type { FeedItem } from "@/hooks/use-following-feed";
import { useIsLiked, useLikeCount, useLikeTasting, useUnlikeTasting } from "@/hooks/use-tasting-likes";

export interface FeedCardProps {
  item: FeedItem;
  currentUserId: string | undefined;
}

function getInitials(displayName: string | null, username: string | null): string {
  const name = displayName ?? username ?? "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FeedCard({ item, currentUserId }: FeedCardProps) {
  const router = useRouter();

  const { data: isLiked = false } = useIsLiked(currentUserId, item.id);
  const { data: likeCount = item.like_count } = useLikeCount(item.id);
  const likeMutation = useLikeTasting();
  const unlikeMutation = useUnlikeTasting();

  // Optimistic state: reflect the in-flight mutation immediately
  const optimisticIsLiked = likeMutation.isPending
    ? true
    : unlikeMutation.isPending
      ? false
      : isLiked;
  const optimisticLikeCount =
    likeCount + (likeMutation.isPending ? 1 : 0) - (unlikeMutation.isPending ? 1 : 0);

  const initials = getInitials(item.display_name, item.username);

  function handleLikePress() {
    if (!currentUserId) return;
    if (optimisticIsLiked) {
      unlikeMutation.mutate({ userId: currentUserId, tastingId: item.id });
    } else {
      likeMutation.mutate({ userId: currentUserId, tastingId: item.id });
    }
  }

  return (
    <TouchableOpacity
      className="bg-brand-800 rounded-2xl p-4 mx-4 mb-3"
      onPress={() => router.push(`/bourbon/${item.bourbon_id}` as never)}
      testID="feed-card"
    >
      {/* Header: avatar + name/username + date */}
      <View className="flex-row items-center mb-3">
        {/* Avatar */}
        <View
          className="w-9 h-9 rounded-full bg-brand-600 items-center justify-center mr-3"
          testID="feed-card-avatar"
        >
          <Text className="text-brand-100 text-sm font-bold">{initials}</Text>
        </View>

        {/* Name/username */}
        <View className="flex-1">
          <Text className="text-brand-100 font-semibold text-sm" numberOfLines={1}>
            {item.display_name ?? item.username ?? "Unknown"}
          </Text>
          {item.username ? (
            <Text className="text-brand-400 text-xs">@{item.username}</Text>
          ) : null}
        </View>

        {/* Date */}
        <Text className="text-brand-400 text-xs">{formatDate(item.tasted_at)}</Text>
      </View>

      {/* Bourbon name */}
      <Text className="text-brand-100 font-bold text-base mb-1" numberOfLines={1}>
        {item.bourbon_name}
      </Text>

      {/* Star rating */}
      <View className="mb-3">
        <StarRating value={item.rating} variant="personal" size="sm" />
      </View>

      {/* Action row: like / comment / share */}
      <View className="flex-row gap-4">
        {/* Like button */}
        <TouchableOpacity
          className="flex-row items-center gap-1"
          onPress={(e) => {
            e.stopPropagation();
            handleLikePress();
          }}
          accessibilityLabel={optimisticIsLiked ? "Unlike" : "Like"}
          testID="feed-card-like"
        >
          <Text className={optimisticIsLiked ? "text-red-400 text-base" : "text-brand-400 text-base"}>
            {optimisticIsLiked ? "♥" : "♡"}
          </Text>
          <Text className="text-brand-400 text-xs">{optimisticLikeCount}</Text>
        </TouchableOpacity>

        {/* Comment button (stub — wired in Slice 5) */}
        <TouchableOpacity
          className="flex-row items-center gap-1"
          onPress={(e) => {
            e.stopPropagation();
          }}
          accessibilityLabel="Comment"
          testID="feed-card-comment"
        >
          <Text className="text-brand-400 text-base">💬</Text>
          <Text className="text-brand-400 text-xs">{item.comment_count}</Text>
        </TouchableOpacity>

        {/* Share button (stub — wired in Slice 7) */}
        <TouchableOpacity
          className="flex-row items-center gap-1"
          onPress={(e) => {
            e.stopPropagation();
          }}
          accessibilityLabel="Share to group"
          testID="feed-card-share"
        >
          <Text className="text-brand-400 text-base">↗</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
