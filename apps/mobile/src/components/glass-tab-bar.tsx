import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

/**
 * Floating liquid-glass panel that backs the bottom tab bar.
 * Rendered via `tabBarBackground` in the tab navigator; the bar itself is
 * transparent/absolute so content peeks through beneath the glass.
 */
export function GlassTabBar() {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.panel,
        {
          backgroundColor: theme.glassStrong,
          borderColor: theme.glassBorder,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.specular, { backgroundColor: theme.specular }]}
      />
      <View
        pointerEvents="none"
        style={[styles.tint, { backgroundColor: theme.glow }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  specular: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    height: 1,
  },
  tint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.35,
  },
});