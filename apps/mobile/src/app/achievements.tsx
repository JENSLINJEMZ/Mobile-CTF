import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet } from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { getAchievements } from "@/services/achievements";
import type { AchievementListResponse } from "@ctf/shared";
import { useLoadable } from "@/hooks/use-loadable";

export default function AchievementsScreen() {
  const { data, error, reload } = useLoadable(
    getAchievements,
    null as AchievementListResponse | null,
  );
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  return (
    <ScreenShell title="Achievements">
      {!data && !error ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : data ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {data.earnedCount} of {data.items.length} badges earned
          </ThemedText>
          <FlatList
            data={data.items}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#2563eb"
              />
            }
            ListEmptyComponent={
              <EmptyState message="No achievements available yet." />
            }
            renderItem={({ item }) => {
              const earnedAt = item.earnedAt ?? null;
              const earned = earnedAt !== null;
              return (
                <ThemedView
                  type="backgroundElement"
                  style={[styles.badge, !earned && styles.locked]}
                  accessibilityLabel={`${item.title}: ${item.description}, ${earned ? "earned" : "locked"}`}
                >
                  <ThemedText type="subtitle" style={styles.icon}>
                    {item.icon ?? "🏅"}
                  </ThemedText>
                  <ThemedView style={styles.badgeText}>
                    <ThemedText type="smallBold">{item.title}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.description}
                    </ThemedText>
                    {earned && earnedAt !== null ? (
                      <ThemedText type="small" style={{ color: "#16a34a" }}>
                        Earned {new Date(earnedAt).toLocaleDateString()}
                      </ThemedText>
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary">
                        Locked
                      </ThemedText>
                    )}
                  </ThemedView>
                </ThemedView>
              );
            }}
          />
        </>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  badge: {
    width: "100%",
    borderRadius: 14,
    padding: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  locked: {
    opacity: 0.55,
  },
  icon: {
    fontSize: 34,
    lineHeight: 44,
  },
  badgeText: {
    flex: 1,
    gap: Spacing.half,
  },
});
