import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

export function LoadingState() {
  return (
    <ThemedView style={styles.container} accessibilityLabel="Loading">
      <ActivityIndicator size="large" />
    </ThemedView>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <ThemedView
      style={styles.container}
      accessibilityRole="alert"
      accessibilityLabel={`Error: ${message}`}
    >
      <ThemedText type="small" style={styles.errorText}>
        {message}
      </ThemedText>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry"
          style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
        >
          <ThemedText type="smallBold" style={styles.retryLabel}>
            Try again
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText
        type="default"
        themeColor="textSecondary"
        style={styles.emptyText}
      >
        {message}
      </ThemedText>
    </ThemedView>
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
  errorText: {
    color: "#dc2626",
    textAlign: "center",
  },
  retry: {
    backgroundColor: "#dc2626",
    borderRadius: 10,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    minHeight: 44,
    justifyContent: "center",
  },
  retryLabel: {
    color: "#ffffff",
  },
  pressed: {
    opacity: 0.85,
  },
  emptyText: {
    textAlign: "center",
  },
});