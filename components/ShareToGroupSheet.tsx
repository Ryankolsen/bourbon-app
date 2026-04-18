import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useMyGroups } from '@/hooks/use-groups';
import { useShareTastingToGroup } from '@/hooks/use-group-feed';
import { useToast } from '@/lib/toast-provider';
import { colors } from '@/lib/colors';

interface ShareToGroupSheetProps {
  tastingId: string;
  currentUserId: string | undefined;
  visible: boolean;
  onClose: () => void;
}

export function ShareToGroupSheet({
  tastingId,
  currentUserId,
  visible,
  onClose,
}: ShareToGroupSheetProps) {
  const { data: myGroups = [], isLoading } = useMyGroups(currentUserId);
  const shareMutation = useShareTastingToGroup();
  const { showToast } = useToast();
  const [sharingGroupId, setSharingGroupId] = useState<string | null>(null);

  function handleShare(groupId: string) {
    if (!currentUserId) return;
    setSharingGroupId(groupId);
    shareMutation.mutate(
      { tastingId, groupId, sharedByUserId: currentUserId },
      {
        onSuccess: () => {
          setSharingGroupId(null);
          showToast('Shared to group!', 'success');
          onClose();
        },
        onError: (err) => {
          setSharingGroupId(null);
          showToast(
            err instanceof Error ? err.message : 'Failed to share.',
            'error'
          );
        },
      }
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID="share-to-group-sheet"
    >
      <SafeAreaView className="flex-1 bg-brand-900">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-brand-700">
          <Text className="text-brand-100 font-bold text-base">Share to Group</Text>
          <TouchableOpacity onPress={onClose} testID="share-sheet-close">
            <Text className="text-brand-400 text-base">✕</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.spinnerDefault} size="large" />
          </View>
        ) : (
          <FlatList
            data={myGroups}
            keyExtractor={(item) => item.group_id}
            renderItem={({ item }) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const group = (item as any).groups as
                | { id: string; name: string; description: string | null }
                | null;
              const groupName = group?.name ?? 'Unknown group';
              const isPending = sharingGroupId === item.group_id;

              return (
                <TouchableOpacity
                  className="flex-row items-center px-4 py-4 border-b border-brand-800"
                  onPress={() => handleShare(item.group_id)}
                  disabled={isPending || shareMutation.isPending}
                  testID={`share-group-row-${item.group_id}`}
                >
                  <View className="flex-1">
                    <Text className="text-brand-100 font-semibold text-sm">{groupName}</Text>
                  </View>
                  {isPending ? (
                    <ActivityIndicator size="small" color={colors.spinnerDefault} />
                  ) : (
                    <Text className="text-brand-400 text-sm">Share →</Text>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-16">
                <Text className="text-brand-400 text-sm text-center px-8">
                  You're not in any groups yet.
                </Text>
              </View>
            }
            className="flex-1"
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
