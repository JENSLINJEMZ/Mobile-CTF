import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from "react-native";

import type { ReactNode } from "react";

import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type GlassVariant = "glass" | "subtle" | "strong";

export type GlassSurfaceProps = ViewProps & {
  children?: ReactNode;
  /** Material density; `subtle` for quiet rows, `strong` for chrome like inputs/toolbars. */
  variant?: GlassVariant;
  /** Corner radius; defaults to `Radius.md`. */
  radius?: number;
  /** Render the specular rim light on the top edge. Defaults to true. */
  highlight?: boolean;
  style?: StyleProp<ViewStyle>;
};

const TONE: Record<GlassVariant, (t: ReturnType<typeof useTheme>) => string> = {
  glass: (t) => t.glass,
  subtle: (t) => t.glassSubtle,
  strong: (t) => t.glassStrong,
};

/**
 * Liquid-glass material surface: a translucent tinted fill with a hairline
 * border and a 1px specular rim highlight along the top edge. Cheap (no raw
 * blur) so it can be used across lists without a performance cost.
 */
export function GlassSurface({
  children,
  variant = "glass",
  radius = Radius.md,
  highlight = true,
  style,
  ...rest
}: GlassSurfaceProps) {
  const theme = useTheme();

  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: TONE[variant](theme),
          borderColor: theme.glassBorder,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius,
          overflow: "hidden",
        },
        style,
      ]}
    >
      {highlight ? (
        <View
          pointerEvents="none"
          style={[
            styles.specular,
            {
              backgroundColor: theme.specular,
              borderRadius: radius - 2,
            },
          ]}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  specular: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    height: 1,
  },
});