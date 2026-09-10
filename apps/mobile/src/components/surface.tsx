import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

import type { ReactNode } from "react";

import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type SurfaceVariant = "elevated" | "quiet" | "selected";

export type SurfaceProps = ViewProps & {
  children?: ReactNode;
  /** Material density; `elevated` for cards, `quiet` for flat rows, `selected` for active fills. */
  variant?: SurfaceVariant;
  /** Corner radius; defaults to `Radius.md`. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

const TONE: Record<SurfaceVariant, (t: ReturnType<typeof useTheme>) => string> = {
  elevated: (t) => t.surface,
  quiet: (t) => t.backgroundElement,
  selected: (t) => t.backgroundSelected,
};

/**
 * Solid app surface: an opaque filled panel with a hairline border.
 * Replaces the liquid-glass material — flat and high-contrast so it reads
 * clearly against the canvas (Telegram/WhatsApp-style).
 */
export function Surface({
  children,
  variant = "elevated",
  radius = Radius.md,
  style,
  ...rest
}: SurfaceProps) {
  const theme = useTheme();

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: TONE[variant](theme),
          borderColor: theme.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}