import { StyleSheet, View } from "react-native";

import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GlassSurface } from "@/components/glass-surface";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useNetwork } from "@/hooks/use-network";
import { queueSize } from "@/services/offline-queue";
import { loadSubmissionQueue } from "@/services/queue-storage";

export function OfflineBanner() {
  const theme = useTheme();
  const isOnline = useNetwork();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState(0);

  const refreshPending = useCallback(async () => {
    const queue = await loadSubmissionQueue();
    setPending(queueSize(queue));
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPending();
    }, [refreshPending]),
  );

  useEffect(() => {
    if (isOnline && pending > 0) void refreshPending();
  }, [isOnline, pending, refreshPending]);

  if (isOnline && pending === 0) return null;

  return (
    <View
      style={[styles.wrapper, { top: insets.top + Spacing.one }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel={
        isOnline
          ? `${pending} pending submission${pending === 1 ? "" : "s"} in offline queue`
          : "Offline mode. Changes will sync when you reconnect"
      }
    >
      <GlassSurface
        variant="strong"
        radius={Radius.pill}
        style={[
          styles.banner,
          {
            backgroundColor: isOnline ? theme.warningSubtle : theme.scrim,
          },
        ]}
      >
        <ThemedText
          type="small"
          style={[
            styles.text,
            { color: isOnline ? theme.warningStrong : theme.textInverse },
          ]}
        >
          {isOnline
            ? `Offline queue: ${pending} pending submission${pending === 1 ? "" : "s"}`
            : "Offline — changes will sync when connected"}
        </ThemedText>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: Spacing.four,
    right: Spacing.four,
    zIndex: 100,
    alignItems: "center",
  },
  banner: {
    paddingVertical: Spacing.one + Spacing.half,
  },
  text: {
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: Spacing.three,
  },
});