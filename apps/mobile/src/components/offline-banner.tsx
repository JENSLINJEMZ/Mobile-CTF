import { StyleSheet, View } from "react-native";

import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { useNetwork } from "@/hooks/use-network";
import { queueSize } from "@/services/offline-queue";
import { loadSubmissionQueue } from "@/services/queue-storage";

export function OfflineBanner() {
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
      style={[styles.banner, { top: insets.top }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      accessibilityLabel={
        isOnline
          ? `${pending} pending submission${pending === 1 ? "" : "s"} in offline queue`
          : "Offline mode. Changes will sync when you reconnect"
      }
    >
      <ThemedText type="small" style={styles.text}>
        {isOnline
          ? `Offline queue: ${pending} pending submission${pending === 1 ? "" : "s"}`
          : "Offline — changes will sync when connected"}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: "#b45309",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  text: {
    color: "#ffffff",
    fontWeight: "600",
  },
});
