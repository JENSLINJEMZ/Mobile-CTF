import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { useTheme } from "@/hooks/use-theme";

export type ButtonVariant =
  | "primary"
  | "quiet"
  | "outline"
  | "danger"
  | "link";

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  accessibilityLabel,
}: ButtonProps) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const isUnavailable = disabled || loading;
  const isFilled = variant === "primary" || variant === "danger";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isUnavailable, busy: loading }}
      disabled={isUnavailable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant](theme),
        pressed && !isUnavailable && !reduceMotion && styles.pressedScale,
        pressed && !isUnavailable && styles.pressedOpacity,
        isUnavailable && styles.disabled,
      ]}
    >
      {isFilled ? (
        <View pointerEvents="none" style={[styles.specular, { backgroundColor: theme.specular }]} />
      ) : null}
      {loading ? (
        <ActivityIndicator size="small" color={loaderColor[variant](theme)} />
      ) : (
        <Text
          style={[
            styles.label,
            variantLabelStyles[variant](theme),
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: TouchTarget.Android,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  specular: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    height: 1,
    opacity: 0.4,
  },
  pressedOpacity: {
    opacity: 0.85,
  },
  pressedScale: {
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
});

type T = ReturnType<typeof useTheme>;

const variantStyles: Record<ButtonVariant, (t: T) => object> = {
  primary: (t) => ({ backgroundColor: t.accent }),
  quiet: (t) => ({ backgroundColor: t.backgroundElement }),
  outline: (t) => ({
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: t.borderStrong,
  }),
  danger: (t) => ({ backgroundColor: t.danger }),
  link: () => ({ backgroundColor: "transparent", minHeight: 40 }),
};

const variantLabelStyles: Record<ButtonVariant, (t: T) => object> = {
  primary: () => ({ color: "#ffffff" }),
  quiet: (t) => ({ color: t.text }),
  outline: (t) => ({ color: t.accent }),
  danger: () => ({ color: "#ffffff" }),
  link: (t) => ({ color: t.accent }),
};

const loaderColor: Record<ButtonVariant, (t: T) => string> = {
  primary: () => "#ffffff",
  quiet: (t) => t.text,
  outline: (t) => t.accent,
  danger: () => "#ffffff",
  link: (t) => t.accent,
};