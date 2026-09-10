import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Surface } from "@/components/surface";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export function LoadingState() {
  const theme = useTheme();
  return (
    <Surface style={styles.container} radius={Radius.lg} accessibilityLabel="Loading">
      <ActivityIndicator size="large" color={theme.accent} />
    </Surface>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  return (
    <Surface
      style={styles.container}
      radius={Radius.lg}
      accessibilityRole="alert"
      accessibilityLabel={`Error: ${message}`}
    >
      <Ionicons name="cloud-offline-outline" size={30} color={theme.danger} />
      <ThemedText type="small" style={{ color: theme.danger, textAlign: "center" }}>
        {message}
      </ThemedText>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          style={({ pressed }) => [
            styles.retry,
            { backgroundColor: theme.accent },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
            Try again
          </ThemedText>
        </Pressable>
      ) : null}
    </Surface>
  );
}

export function EmptyState({
  message,
  icon = "book-outline",
}: {
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const theme = useTheme();
  return (
    <Surface
      style={styles.container}
      radius={Radius.lg}
      variant="quiet"
    >
      <Ionicons name={icon} size={32} color={theme.textSecondary} />
      <ThemedText
        type="default"
        themeColor="textSecondary"
        style={styles.emptyText}
      >
        {message}
      </ThemedText>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.four,
  },
  retry: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.Android,
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
  emptyText: {
    textAlign: "center",
  },
});