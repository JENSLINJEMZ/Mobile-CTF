import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
} from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import type { BookmarkDto } from "@ctf/shared";
import { listBookmarks } from "@/services/bookmarks";

export default function BookmarksScreen() {
  const router = useRouter();
  const [items, setItems] = useState<BookmarkDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listBookmarks();
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load bookmarks");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenShell title="Bookmarks">
      {!items && !error ? (
        <ActivityIndicator style={{ marginTop: Spacing.five }} />
      ) : error ? (
        <ThemedText type="small" style={{ color: "#dc2626" }}>
          {error}
        </ThemedText>
      ) : items!.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No bookmarks yet. Pin challenges you want to revisit from the
          challenge screen.
        </ThemedText>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.challengeId)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.row}>
              <Pressable
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
