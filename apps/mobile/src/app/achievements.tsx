import { useCallback, useState } from "react";
import { FlatList, RefreshControl, StyleSheet } from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { GlassSurface } from "@/components/glass-surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { getAchievements } from "@/services/achievements";
import type { AchievementListResponse } from "@ctf/shared";
import { useLoadable } from "@/hooks/use-loadable";
import { useTheme } from "@/hooks/use-theme";

export default function AchievementsScreen() {
  const theme = useTheme();
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
            <ThemedText type="metric">
              {data.earnedCount}
            </ThemedText>{" "}
            of <ThemedText type="metric">{data.items.length}</ThemedText>{" "}
            badges earned
          </ThemedText>
          <FlatList
            data={data.items}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.accent}
              />
            }
            ListEmptyComponent={
              <EmptyState message="No achievements available yet." />
            }
            renderItem={({ item }) => {
              const earnedAt = item.earnedAt ?? null;
              const earned = earnedAt !== null;
              return (
                <GlassSurface
                  radius={Radius.lg}
                  variant={earned ? "glass" : "subtle"}
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
                      <ThemedText type="small" style={{ color: theme.success }}>
                        Earned {new Date(earnedAt).toLocaleDateString()}
                      </ThemedText>
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary">
                        Locked
                      </ThemedText>
                    )}
                  </ThemedView>
                </GlassSurface>
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
