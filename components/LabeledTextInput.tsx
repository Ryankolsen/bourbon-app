import React, { useEffect, useRef } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { announce } from "@/lib/announce";

export type LabeledTextInputProps = TextInputProps & {
  /** Required. Becomes the input's accessible name. */
  label: string;
  /** Don't draw the label on screen; it stays the accessible name. */
  hideLabel?: boolean;
  labelClassName?: string;
  error?: string;
  /**
   * Marks the field required. Draws a visual "*" after the label, but the
   * accessible name is "<label>, required" so the screen reader doesn't say "star".
   */
  required?: boolean;
};

export function LabeledTextInput({
  label,
  hideLabel = false,
  labelClassName = "text-brand-300 text-sm font-medium",
  error,
  required = false,
  ...inputProps
}: LabeledTextInputProps) {
  const lastAnnounced = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (error && error !== lastAnnounced.current) {
      announce(error);
    }
    lastAnnounced.current = error || undefined;
  }, [error]);

  return (
    <View className="gap-1">
      {hideLabel ? null : (
        <Text
          className={labelClassName}
          // The input's own accessible name already carries the label.
          {...(required
            ? { accessibilityElementsHidden: true, importantForAccessibility: "no" as const }
            : {})}
        >
          {required ? `${label} *` : label}
        </Text>
      )}
      <TextInput
        {...inputProps}
        accessibilityLabel={required ? `${label}, required` : label}
        accessibilityHint={error ? `Invalid entry: ${error}` : inputProps.accessibilityHint}
      />
      {error ? <Text className="text-red-400 text-xs">{error}</Text> : null}
    </View>
  );
}
