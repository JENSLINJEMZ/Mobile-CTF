import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import type { ReactNode } from "react";

import { useTheme } from "@/hooks/use-theme";

/**
 * Liquid-glass stage: a deep blue-tinted background with a luminous top
 * band that the translucent surfaces above it sample their tint from.
 * Renders behind all content; keep it subtle — no decorative blobs.
 */
export function GlassBackground({ children }: { children?: ReactNode }) {
  const theme = useTheme();

  return (
    <View style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <LinearGradient
        colors={[theme.backdropTop, theme.backdropBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[theme.glow, "transparent"]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 0.9 }}
        style={[StyleSheet.absoluteFill, styles.ambient]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  ambient: {
    // The luminous region the glass refracts; sits toward the top of the screen.
    opacity: 0.9,
  },
});