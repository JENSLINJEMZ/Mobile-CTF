import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet } from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { getAchievements } from "@/services/achievements";
import type { AchievementListResponse } from "@ctf/shared";

export default function AchievementsScreen() {
  const [data, setData] = useState<AchievementListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await getAchievements());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load achievements",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenShell title="Achievements">
      {!data && !error ? (
        <ActivityIndicator style={{ marginTop: Spacing.five }} />
      ) : error ? (
        <ThemedText type="small" style={{ color: "#dc2626" }}>
          {error}
        </ThemedText>
      ) : data ? (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {data.earnedCount} of {data.items.length} badges earned
          </ThemedText>
          <FlatList
            data={data.items}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => {
              const earnedAt = item.earnedAt ?? null;
              const earned = earnedAt !== null;
              return (
                <ThemedView
                  type="backgroundElement"
                  style={[styles.badge, !earned && styles.locked]}
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
