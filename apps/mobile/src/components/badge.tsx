import { StyleSheet, Text, type StyleProp, type TextStyle } from "react-native";

import { useTheme } from "@/hooks/use-theme";

/**
 * Small count badge — Telegram-style pill used on tab icons, list rows and
 * anywhere a discrete number signals "something pending". Colors come from
 * the `badge` scoped tokens; pass `color`/`fg` to override.
 */
export function Badge({
  count,
  max = 99,
  color,
  fg,
  style,
}: {
  count: number;
  /** Cap before showing `max+` (e.g. 99+). */
  max?: number;
  color?: string;
  fg?: string;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  if (count <= 0) return null;

  const label = count > max ? `${max}+` : String(count);
  const isSingleDigit = label.length === 1;

  return (
    <Text
      accessibilityRole="text"
      accessibilityLabel={`${label} new`}
      style={[
        styles.badge,
        { backgroundColor: color ?? theme.badge.bg, color: fg ?? theme.badge.fg },
        isSingleDigit && styles.singleDigit,
        style,
      ]}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    fontSize: 11,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center",
    overflow: "hidden",
  },
  singleDigit: {
    paddingHorizontal: 0,
    width: 18,
  },
});