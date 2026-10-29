import React from "react";
import { Text, type TextProps } from "react-native";

export function Heading(props: TextProps) {
  return <Text accessibilityRole="header" {...props} />;
}
