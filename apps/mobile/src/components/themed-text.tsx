import { Platform, StyleSheet, Text, type TextProps } from "react-native";

import { Fonts, ThemeColor, Typography } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
  type?:
    | "default"
    | "title"
    | "small"
    | "smallBold"
    | "subtitle"
    | "link"
    | "linkPrimary"
    | "metric"
    | "code";
  themeColor?: ThemeColor;
};

export function ThemedText({
  style,
  type = "default",
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? "text"] },
        type === "default" && styles.default,
        type === "title" && styles.title,
        type === "small" && styles.small,
        type === "smallBold" && styles.smallBold,
        type === "subtitle" && styles.subtitle,
        type === "link" && styles.link,
        type === "linkPrimary" && { color: theme.accent },
        type === "metric" && styles.metric,
        type === "code" && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

export const themedTextStyles = StyleSheet.create({
  small: {
    ...Typography.small,
    fontWeight: 500,
  },
  smallBold: {
    ...Typography.small,
    fontWeight: 700,
  },
  default: {
    ...Typography.body,
    fontWeight: 500,
  },
  title: {
    ...Typography.display,
    fontWeight: 700,
  },
  subtitle: {
    ...Typography.title,
    fontWeight: 700,
  },
  link: {
    lineHeight: 26,
    fontSize: 15,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
  metric: {
    fontFamily: Fonts.mono,
    fontVariant: ["tabular-nums"],
    fontWeight: 700,
    fontSize: 15,
    lineHeight: 22,
  },
});

const styles = themedTextStyles;
