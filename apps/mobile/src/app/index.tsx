import type {
  ChallengeCategoryDto,
  ChallengeSummaryDto,
  PaginatedResult,
} from "@ctf/shared";
import { Link } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  useColorScheme,
} from "react-native";

import { EmptyState, ErrorState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { listChallengeCategories, listChallenges } from "@/services/challenges";
import { useAuthGate } from "@/hooks/use-auth-gate";

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "#16a34a",
  MEDIUM: "#d97706",
  HARD: "#dc2626",
  EXPERT: "#7c3aed",
};

function difficultyLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function ChallengesScreen() {
  const colorScheme = useColorScheme();
  const { status: authStatus } = useAuthGate();
  const [categories, setCategories] = useState<ChallengeCategoryDto[]>([]);
  const [data, setData] = useState<PaginatedResult<ChallengeSummaryDto> | null>(
    null,
  );
  const [selectedCategory, setSelectedCategory] = useState<
    string | undefined
  >();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const dataRef = useRef<PaginatedResult<ChallengeSummaryDto> | null>(null);
  const isDark = colorScheme === "dark";

  const load = useCallback(
    async (category?: string, query?: string, append = false) => {
      try {
        setError(null);
        if (!append) setLoading(true);
        const page =
          append && dataRef.current ? dataRef.current.meta.page + 1 : 1;
        const result = await listChallenges({
          page,
          category,
          search: query && query.trim().length >= 2 ? query.trim() : undefined,
        });
        const merged =
          append && dataRef.current
            ? { ...result, items: [...dataRef.current.items, ...result.items] }
            : result;
        dataRef.current = merged;
        setData(merged);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load challenges",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void listChallengeCategories()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void load(selectedCategory, search);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedCategory, search, load]);

  useEffect(() => {
    if (authStatus === "authenticated") void load(selectedCategory, search);
  }, [authStatus, selectedCategory, search, load]);

  const sub = useCallback(
    (text: string) => text.slice(0, 92) + (text.length > 92 ? "…" : ""),
    [],
  );

  return (
    <ScreenShell title="Challenges">
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search challenges…"
        placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
        accessibilityLabel="Search challenges"
        accessibilityRole="search"
        autoCorrect={false}
        style={[
          styles.search,
          { backgroundColor: isDark ? "#1f2937" : "#f3f4f6" },
        ]}
      />

      <FlatList
        horizontal
        data={[
          { slug: undefined, name: "All", icon: null, id: 0, sortOrder: -1 },
          ...categories,
        ]}
        keyExtractor={(item) => item.slug ?? "all"}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: Spacing.two,
          paddingVertical: Spacing.one,
        }}
        renderItem={({ item }) => {
          const active = selectedCategory === item.slug;
          return (
            <Pressable
              onPress={() =>
                setSelectedCategory(active ? undefined : item.slug)
              }
              accessibilityRole="button"
              accessibilityLabel={`Filter by category ${item.name}`}
              accessibilityState={{ selected: active }}
              style={[
                styles.categoryChip,
                {
                  backgroundColor: active
                    ? "#2563eb"
                    : isDark
                      ? "#1f2937"
                      : "#eef2ff",
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.categoryChipLabel,
                  {
                    color: active ? "#ffffff" : isDark ? "#c7d2fe" : "#1e3a8a",
                  },
                ]}
              >
                {item.name}
              </ThemedText>
            </Pressable>
          );
        }}
      />

      {error ? (
        <ErrorState
          message={error}
          onRetry={() => void load(selectedCategory, search)}
        />
      ) : null}

      {!data || (loading && !data) ? (
        <ActivityIndicator style={{ marginTop: Spacing.five }} />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => String(item.id)}
          onEndReached={() => {
            if (dataRef.current?.meta.hasNext)
              void load(selectedCategory, search, true);
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={loading && !!data}
              onRefresh={async () => {
                try {
                  await Promise.all([
                    load(selectedCategory, search, false),
                    listChallengeCategories().then(setCategories),
                  ]);
                } catch {
                  // error surfaced via load()
                }
              }}
              tintColor="#2563eb"
            />
          }
          renderItem={({ item }) => (
            <Link href={`/challenge/${item.id}`} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Challenge ${item.title}, ${item.basePoints} points, ${difficultyLabel(item.difficulty)}`}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.cardPressed,
                ]}
              >
                <ThemedView type="backgroundElement" style={styles.cardInner}>
                  <ThemedView
                    style={[
                      styles.difficultyDot,
                      { backgroundColor: DIFFICULTY_COLORS[item.difficulty] },
                    ]}
                  />
                  <ThemedView style={styles.cardBody}>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {item.title}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      numberOfLines={2}
                    >
                      {sub(item.category.name)} ·{" "}
                      {difficultyLabel(item.difficulty)}
                    </ThemedText>
                    {item.solvedByMe ? (
                      <ThemedText type="small" style={{ color: "#16a34a" }}>
                        Solved ✓
                      </ThemedText>
                    ) : null}
                  </ThemedView>
                  <ThemedView style={styles.pointsBox}>
                    <ThemedText type="smallBold">
                      {item.basePoints} pts
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              </Pressable>
            </Link>
          )}
          ListEmptyComponent={
            <EmptyState message="No challenges match your filters." />
          }
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  search: {
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    fontSize: 15,
    color: "#111827",
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  categoryChipLabel: {
    fontWeight: "600",
  },
  card: {
    width: "100%",
    borderRadius: 16,
    marginBottom: Spacing.two,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  difficultyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardBody: {
    flex: 1,
    gap: Spacing.half,
  },
  pointsBox: {
    alignItems: "flex-end",
  },
});
