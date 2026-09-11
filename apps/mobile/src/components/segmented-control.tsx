import { useMemo, useRef } from "react";
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { useTheme } from "@/hooks/use-theme";

export type SegmentedOption<T extends string> = {
  label: string;
  value: T;
  accessibilityLabel?: string;
};

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
};

/**
 * Telegram/WhatsApp-style segmented control: one track with a sliding thumb
 * that follows the active segment. Segments share the track width (flex:1),
 * so the thumb is a simple equal-width bar that glides to the active index.
 * Animation respects `reduceMotion`.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const anim = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useTrackWidth();

  const activeIndex = useMemo(
    () => Math.max(0, options.findIndex((o) => o.value === value)),
    [options, value],
  );

  const measured = trackWidth > 0;
  const thumbWidth = measured ? trackWidth / options.length : 0;
  const thumbTarget = activeIndex * thumbWidth;

  const slide = () => {
    if (!measured) return;
    if (reduceMotion) {
      anim.setValue(thumbTarget);
    } else {
      Animated.timing(anim, {
        toValue: thumbTarget,
        useNativeDriver: true,
        duration: 200,
      }).start();
    }
  };
  slide();

  const thumbTranslate = anim.interpolate({
    inputRange: [0, Math.max(1, thumbTarget)],
    outputRange: [0, thumbTarget],
    extrapolate: "clamp",
  });

  return (
    <View
      role="tablist"
      accessibilityLabel={accessibilityLabel}
      style={[styles.track, { backgroundColor: theme.segmented.track }]}
      onLayout={setTrackWidth}
    >
      {measured ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.thumb,
            {
              width: thumbWidth,
              backgroundColor: theme.segmented.thumb,
              borderColor: theme.border,
              transform: [{ translateX: thumbTranslate }],
            },
          ]}
        />
      ) : null}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            role="tab"
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              pressed && !reduceMotion && styles.segmentPressed,
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{
                color: active
                  ? theme.segmented.activeText
                  : theme.segmented.idleText,
              }}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Sets the track width once measured; stable across re-renders. */
function useTrackWidth(): [number, (e: LayoutChangeEvent) => void] {
  const widthRef = useRef(0);
  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (widthRef.current !== w) widthRef.current = w;
  };
  return [widthRef.current, onLayout];
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    borderRadius: Radius.pill,
    padding: Spacing.half,
    width: "100%",
  },
  thumb: {
    position: "absolute",
    top: Spacing.half,
    bottom: Spacing.half,
    left: Spacing.half,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    borderRadius: Radius.pill,
  },
  segmentPressed: {
    opacity: 0.85,
  },
});