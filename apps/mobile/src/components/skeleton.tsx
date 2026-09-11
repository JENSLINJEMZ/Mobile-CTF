import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { Radius, Spacing } from "@/constants/theme";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { useTheme } from "@/hooks/use-theme";

/**
 * Pulsing placeholder for list rows and cards. Provides a calm, professional
 * loading skeleton instead of a spinner. Pulse animates the highlight color
 * and fully stops when `reduceMotion` is on.
 */
export function Skeleton({
  height = 72,
  radius = Radius.md,
  count = 1,
  style,
}: {
  height?: number;
  radius?: number;
  count?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.55);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={{ opacity, gap: Spacing.two }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.block,
            {
              height,
              borderRadius: radius,
              backgroundColor: theme.skeleton.base,
              borderColor: theme.border,
            },
            style,
          ]}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    borderWidth: StyleSheet.hairlineWidth,
    width: "100%",
  },
});