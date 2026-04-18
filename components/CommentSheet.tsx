import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
} from 'react-native';
import {
  useTastingComments,
  useCommentCount,
  usePostComment,
  useTastingCommentsRealtime,
  TastingComment,
} from '@/hooks/use-tasting-comments';
import { Database } from '@/types/database';

type CommentRow = Database['public']['Tables']['tasting_comments']['Row'];

interface CommentSheetProps {
  tastingId: string;
  currentUserId: string | undefined;
  visible: boolean;
  onClose: () => void;
}

function getInitials(displayName: string | null, username: string | null): string {
  const name = displayName ?? username ?? '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function CommentRow({ comment }: { comment: TastingComment }) {
  const initials = getInitials(comment.display_name, comment.username);
  return (
    <View className="flex-row px-4 py-3 border-b border-brand-700" testID="comment-row">
      <View className="w-8 h-8 rounded-full bg-brand-600 items-center justify-center mr-3 flex-shrink-0">
        <Text className="text-brand-100 text-xs font-bold">{initials}</Text>
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2 mb-0.5">
          <Text className="text-brand-100 font-semibold text-sm">
            {comment.display_name ?? comment.username ?? 'Unknown'}
          </Text>
          <Text className="text-brand-400 text-xs">{formatDate(comment.created_at)}</Text>
        </View>
        <Text className="text-brand-200 text-sm">{comment.body}</Text>
      </View>
    </View>
  );
}

export function CommentSheet({
  tastingId,
  currentUserId,
  visible,
  onClose,
}: CommentSheetProps) {
  const [body, setBody] = useState('');
  // Extra comments appended via realtime, not yet reflected in server data
  const [realtimeComments, setRealtimeComments] = useState<TastingComment[]>([]);

  const { data: serverComments = [] } = useTastingComments(tastingId);
  const postComment = usePostComment();

  const handleInsert = useCallback(
    (row: CommentRow) => {
      // Only append if not already in serverComments (avoid duplicates on refetch)
      setRealtimeComments((prev) => {
        if (prev.some((c) => c.id === row.id)) return prev;
        return [
          ...prev,
          {
            ...row,
            display_name: null,
            username: null,
            avatar_url: null,
          },
        ];
      });
    },
    [],
  );

  useTastingCommentsRealtime(tastingId, handleInsert);

  // Merge: server rows first, then any realtime rows not yet in server data
  const serverIds = new Set(serverComments.map((c) => c.id));
  const allComments: TastingComment[] = [
    ...serverComments,
    ...realtimeComments.filter((c) => !serverIds.has(c.id)),
  ];

  function handleSend() {
    if (!currentUserId || !body.trim()) return;
    postComment.mutate(
      { userId: currentUserId, tastingId, body },
      { onSuccess: () => setBody('') },
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="comment-sheet"
    >
      <SafeAreaView className="flex-1 bg-brand-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-brand-700">
          <Text className="text-brand-100 font-bold text-base">Comments</Text>
          <TouchableOpacity onPress={onClose} testID="comment-sheet-close">
            <Text className="text-brand-400 text-base">✕</Text>
          </TouchableOpacity>
        </View>

        {/* Comments list */}
        <FlatList
          data={allComments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CommentRow comment={item} />}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-brand-400 text-sm" testID="comment-empty-state">
                No comments yet. Be the first!
              </Text>
            </View>
          }
          className="flex-1"
        />

        {/* Input bar */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="flex-row items-center px-4 py-3 border-t border-brand-700 gap-2">
            <TextInput
              className="flex-1 bg-brand-800 text-brand-100 rounded-xl px-3 py-2 text-sm"
              placeholder="Add a comment…"
              placeholderTextColor="#9B8E7E"
              value={body}
              onChangeText={setBody}
              testID="comment-input"
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              className="bg-brand-600 rounded-xl px-4 py-2"
              onPress={handleSend}
              disabled={!body.trim() || postComment.isPending}
              testID="comment-send"
            >
              <Text className="text-brand-100 text-sm font-semibold">Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
