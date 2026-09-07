import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { BookmarkDto } from "@ctf/shared";
import { useLoadable } from "@/hooks/use-loadable";
import { listBookmarks } from "@/services/bookmarks";

export default function BookmarksScreen() {
  const router = useRouter();
  const { data, error, reload } = useLoadable(
    useCallback(async () => (await listBookmarks()).items, []),
    null as BookmarkDto[] | null,
  );
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  const items = data ?? [];

  return (
    <ScreenShell title="Bookmarks">
      {!data && !error ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : items.length === 0 ? (
        <EmptyState message="No bookmarks yet. Pin challenges you want to revisit from the challenge screen." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.challengeId)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#2563eb"
            />
          }
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Open bookmarked challenge ${item.title}`}
                style={styles.rowMain}
                onPress={() => router.push(`/challenge/${item.challengeId}`)}
              >
                <ThemedText type="smallBold">{item.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.difficulty} · {item.basePoints} pts
                </ThemedText>
                {item.solvedByMe ? (
                  <ThemedText type="small" style={{ color: "#16a34a" }}>
                    Solved ✓
                  </ThemedText>
                ) : null}
              </Pressable>
            </ThemedView>
          )}
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  row: {
    width: "100%",
    borderRadius: 14,
    padding: Spacing.three,
  },
  rowMain: {
    gap: Spacing.half,
  },
});
