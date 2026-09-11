import type {
  ChallengeCategoryDto,
  ChallengeSummaryDto,
  EventSummaryDto,
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
  View,
} from "react-native";

import { EmptyState, ErrorState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { Input } from "@/components/input";
import { Surface } from "@/components/surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  difficultyColor,
  Radius,
  Spacing,
  TouchTarget,
} from "@/constants/theme";
import { listChallengeCategories, listChallenges } from "@/services/challenges";
import { listEvents } from "@/services/events";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useAuthStore } from "@/store/auth-store";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { useTheme } from "@/hooks/use-theme";

function difficultyLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function HomeScreen() {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const { user } = useAuthStore();
  const { status: authStatus } = useAuthGate();
  const [categories, setCategories] = useState<ChallengeCategoryDto[]>([]);
  const [data, setData] = useState<PaginatedResult<ChallengeSummaryDto> | null>(
    null,
  );
  const [events, setEvents] = useState<EventSummaryDto[]>([]);
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
    void listEvents()
      .then(setEvents)
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

  const solvedCount = data?.items.filter((c) => c.solvedByMe).length ?? 0;

  const listHeader = (
    <>
      <View style={styles.dashboardHeader}>
        <ThemedText type="smallBold" style={styles.brandLabel}>
          MOBILECTF
        </ThemedText>
        <ThemedText type="title" style={styles.greeting}>
          Welcome back, {user?.username ?? "Player"}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Ready to hack something awesome?
        </ThemedText>

        <View style={[styles.statsRow, { backgroundColor: theme.surface }]}>
          <View style={styles.statItem}>
            <ThemedText type="small" themeColor="textSecondary">Rank</ThemedText>
            <ThemedText type="smallBold">—</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.separator }]} />
          <View style={styles.statItem}>
            <ThemedText type="small" themeColor="textSecondary">Score</ThemedText>
            <ThemedText type="smallBold">—</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.separator }]} />
          <View style={styles.statItem}>
            <ThemedText type="small" themeColor="textSecondary">Solved</ThemedText>
            <ThemedText type="smallBold">{String(solvedCount)}</ThemedText>
          </View>
        </View>
      </View>

      {events.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold">Active Events</ThemedText>
            <Link href="/events" asChild>
              <Pressable accessibilityRole="link" accessibilityLabel="View all events">
                <ThemedText type="small" style={{ color: theme.accent }}>View All</ThemedText>
              </Pressable>
            </Link>
          </View>
          <FlatList
            horizontal
            data={events.slice(0, 4)}
            keyExtractor={(item) => String(item.id)}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: Spacing.two }}
            renderItem={({ item }) => (
              <Link href={`/event/${item.id}`} asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  style={({ pressed }) => [
                    styles.eventCard,
                    { backgroundColor: theme.surface },
                    pressed && !reduceMotion && styles.cardPressed,
                  ]}
                >
                  <ThemedText type="smallBold" numberOfLines={1}>{item.title}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {item.status === "RUNNING" ? "Live now" : `Ends ${new Date(item.endsAt).toLocaleDateString()}`}
                  </ThemedText>
                </Pressable>
              </Link>
            )}
          />
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold">Recent Challenges</ThemedText>
          <Link href="/" asChild>
            <Pressable accessibilityRole="link" accessibilityLabel="View all challenges">
              <ThemedText type="small" style={{ color: theme.accent }}>View All</ThemedText>
            </Pressable>
          </Link>
        </View>
      </View>

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Search challenges…"
        accessibilityLabel="Search challenges"
        accessibilityRole="search"
        autoCorrect={false}
        containerStyle={styles.search}
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
              style={({ pressed }) => [
                styles.categoryChip,
                {
                  backgroundColor: active ? theme.accent : theme.backgroundElement,
                  borderColor: active ? theme.accent : theme.border,
                },
                pressed && !reduceMotion && styles.chipPressed,
              ]}
            >
              <ThemedText
                style={[
                  styles.categoryChipLabel,
                  { color: active ? theme.onAccent : theme.textSecondary },
                ]}
              >
                {item.name}
              </ThemedText>
            </Pressable>
          );
        }}
      />
    </>
  );

  return (
    <ScreenShell title="">
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
          ListHeaderComponent={listHeader}
          data={data.items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
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
                    listEvents().then(setEvents),
                  ]);
                } catch {
                  // error surfaced via load()
                }
              }}
              tintColor={theme.accent}
            />
          }
          renderItem={({ item }) => (
            <Link href={`/challenge/${item.id}`} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Challenge ${item.title}, ${item.basePoints} points, ${difficultyLabel(item.difficulty)}`}
                style={({ pressed }) => [
                  styles.card,
                  pressed && !reduceMotion && styles.cardPressed,
                ]}
              >
                <Surface
                  style={styles.cardInner}
                  radius={Radius.lg}
                  variant={item.solvedByMe ? "selected" : "elevated"}
                >
                  <ThemedView
                    style={[
                      styles.difficultyDot,
                      { backgroundColor: difficultyColor(item.difficulty, theme) },
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
                      {item.category.name} · {difficultyLabel(item.difficulty)}
                    </ThemedText>
                    {item.solvedByMe ? (
                      <ThemedText type="small" style={{ color: theme.success }}>
                        Solved ✓
                      </ThemedText>
                    ) : null}
                  </ThemedView>
                  <ThemedView style={styles.pointsBox}>
                    <ThemedText type="metric">
                      {item.basePoints} pts
                    </ThemedText>
                  </ThemedView>
                </Surface>
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
  dashboardHeader: {
    gap: Spacing.one,
    paddingBottom: Spacing.one,
  },
  brandLabel: {
    fontWeight: "800",
    letterSpacing: 1,
    fontSize: 11,
    marginBottom: Spacing.half,
  },
  greeting: {
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: Radius.md,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
  },
  section: {
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eventCard: {
    width: 200,
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  search: {
    width: "100%",
    marginTop: Spacing.two,
  },
  categoryChip: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.Android,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipLabel: {
    fontWeight: "600",
  },
  chipPressed: {
    transform: [{ scale: 0.96 }],
  },
  card: {
    width: "100%",
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  cardInner: {
    flexDirection: "row",
    alignItems: "center",
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
