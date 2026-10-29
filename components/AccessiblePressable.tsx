import React, { useState } from "react";
import { TouchableOpacity, TouchableOpacityProps, Insets, LayoutChangeEvent } from "react-native";

const MIN_TARGET = 44;

export type AccessiblePressableProps = Omit<TouchableOpacityProps, "accessibilityLabel"> & {
  accessibilityLabel: string;
};

type Sides = { top: number; bottom: number; left: number; right: number };

function callerSides(hitSlop: TouchableOpacityProps["hitSlop"]): Sides {
  if (typeof hitSlop === "number") {
    return { top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop };
  }
  const h: Insets = hitSlop ?? {};
  return { top: h.top ?? 0, bottom: h.bottom ?? 0, left: h.left ?? 0, right: h.right ?? 0 };
}

function slopFor(size: number): number {
  return size < MIN_TARGET ? Math.ceil((MIN_TARGET - size) / 2) : 0;
}

export function AccessiblePressable({
  accessibilityRole = "button",
  accessibilityState,
  disabled,
  hitSlop,
  onLayout,
  ...rest
}: AccessiblePressableProps) {
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  const handleLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev && prev.width === width && prev.height === height ? prev : { width, height }
    );
    onLayout?.(e);
  };

  const caller = callerSides(hitSlop);
  const computedX = size ? slopFor(size.width) : 0;
  const computedY = size ? slopFor(size.height) : 0;
  const mergedHitSlop: Sides = {
    top: Math.max(caller.top, computedY),
    bottom: Math.max(caller.bottom, computedY),
    left: Math.max(caller.left, computedX),
    right: Math.max(caller.right, computedX),
  };

  return (
    <TouchableOpacity
      {...rest}
      accessibilityRole={accessibilityRole}
      accessibilityState={disabled ? { ...accessibilityState, disabled: true } : accessibilityState}
      disabled={disabled}
      hitSlop={mergedHitSlop}
      onLayout={handleLayout}
    />
  );
}
