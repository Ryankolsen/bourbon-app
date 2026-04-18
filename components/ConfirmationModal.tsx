import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationModal({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmationModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <View className="bg-brand-800 rounded-2xl p-6 w-full">
          <Text className="text-brand-100 text-lg font-bold mb-2">{title}</Text>
          <Text className="text-brand-300 text-sm leading-relaxed mb-6">{message}</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={onCancel}
              className="flex-1 border border-brand-700 rounded-xl py-3 items-center"
              accessibilityLabel={cancelLabel}
            >
              <Text className="text-brand-300 font-semibold text-sm">{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className={`flex-1 rounded-xl py-3 items-center ${destructive ? "bg-red-600" : "bg-brand-600"}`}
              accessibilityLabel={confirmLabel}
              testID={destructive ? "confirm-button-destructive" : "confirm-button"}
            >
              <Text className="text-white font-semibold text-sm">{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
