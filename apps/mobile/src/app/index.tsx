import type {
  ChallengeCategoryDto,
  ChallengeSummaryDto,
  EventSummaryDto,
  LeaderboardMeDto,
  PaginatedResult,
} from "@ctf/shared";
import { Link, useRouter } from "expo-router";
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
import { listEvents, joinEvent } from "@/services/events";
import { getAchievements } from "@/services/achievements";
import { getLeaderboard } from "@/services/leaderboard";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import { useTheme } from "@/hooks/use-theme";

function difficultyLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

const HOME_INDIGO = "#6a4afb";
const HOME_SURFACE = "#0a1a2c";
const HOME_SURFACE_HI = "#102031";
const HOME_PILLS = ["LEARN", "HACK", "COMPETE", "ANYWHERE"] as const;

export default function HomeScreen() {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const router = useRouter();
  const { status: authStatus } = useAuthGate();
  const [categories, setCategories] = useState<ChallengeCategoryDto[]>([]);
  const [data, setData] = useState<PaginatedResult<ChallengeSummaryDto> | null>(
    null,
  );
  const [events, setEvents] = useState<EventSummaryDto[]>([]);
  const [me, setMe] = useState<LeaderboardMeDto | null>(null);
  const [badges, setBadges] = useState<number | null>(null);
  const [expandLearning, setExpandLearning] = useState(false);
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
    if (authStatus !== "authenticated") {
      setMe(null);
      setBadges(null);
      return;
    }
    getLeaderboard("global", 1)
      .then((result) => setMe(result.me))
      .catch(() => setMe(null));
    getAchievements()
      .then((result) => setBadges(result.earnedCount))
      .catch(() => setBadges(null));
  }, [authStatus]);

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

  const runningEvent = events.find((e) => e.status === "RUNNING") ?? null;
  const scheduledEvent =
    runningEvent ?? events.find((e) => e.status === "SCHEDULED") ?? null;
  const heroEvent = scheduledEvent;
  const heroDeadline = heroEvent
    ? new Date(heroEvent.endsAt).getTime() - Date.now()
    : 0;
  const heroStartIn = heroEvent
    ? new Date(heroEvent.startsAt).getTime() - Date.now()
    : 0;
  const level = Math.max(1, Math.floor((me?.score ?? 0) / 250) + 1);
  const featured = (data?.items ?? []).slice(0, expandLearning ? 8 : 4);
  const maxSolves = Math.max(
    1,
    ...(data?.items ?? []).map((c) => c.solvedCount),
  );
  const nextUnsolved =
    data?.items.find((c) => !c.solvedByMe) ?? data?.items[0] ?? null;
  const missionDeadline = runningEvent
    ? new Date(runningEvent.endsAt).getTime() - Date.now()
    : 0;
  const milestone = Math.max(500, Math.ceil((me?.score ?? 0) / 500) * 500);

  const heroCta = () => {
    if (!heroEvent) return;
    if (!heroEvent.joinedByMe) void joinEvent(heroEvent.id).catch(() => undefined);
    router.push(`/event/${heroEvent.id}`);
  };

  const missionCta = () => {
    if (nextUnsolved) router.push(`/challenge/${nextUnsolved.id}`);
  };

  const listHeader = (
    <>
      <View style={styles.headerRow}>
        <ThemedText type="title" style={styles.brand}>
          Mobile CTF
        </ThemedText>
        <View style={styles.levelChip}>
          <ThemedText type="smallBold" style={styles.levelChipLabel}>
            Lv. {level}
          </ThemedText>
        </View>
      </View>

      <View style={styles.pillRow}>
        {HOME_PILLS.map((pill) => (
          <View key={pill} style={[styles.pill, { borderColor: theme.border }]}>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.pillLabel}
            >
              {pill}
            </ThemedText>
          </View>
        ))}
      </View>

      {heroEvent ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open event ${heroEvent.title}`}
          onPress={heroCta}
          style={({ pressed }) => [
            styles.heroCard,
            pressed && !reduceMotion && styles.cardPressed,
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroLiveRow}>
              <View style={styles.liveDot} />
              <ThemedText type="small" style={styles.heroLiveText}>
                {runningEvent ? "LIVE EVENT" : "UPCOMING EVENT"}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              HACK · LEARN · GROW
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.heroTitle} numberOfLines={2}>
            {heroEvent.title}
          </ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={2}
            style={styles.heroSub}
          >
            {heroEvent.description || "The ultimate hacking event."}
          </ThemedText>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <ThemedText type="smallBold" style={styles.heroStatValue}>
                {heroEvent.participantCount.toLocaleString()}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Players
              </ThemedText>
            </View>
            <View style={styles.heroStat}>
              <ThemedText type="smallBold" style={styles.heroStatValue}>
                {heroEvent.teamCount.toLocaleString()}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Teams
              </ThemedText>
            </View>
            <View style={styles.heroStat}>
              <ThemedText type="smallBold" style={styles.heroStatValue}>
                {runningEvent
                  ? formatRemaining(heroDeadline)
                  : formatRemaining(heroStartIn)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {runningEvent ? "Time Left" : "Starts In"}
              </ThemedText>
            </View>
          </View>

          <View style={[styles.joinBtn, { backgroundColor: HOME_INDIGO }]}>
            <ThemedText style={styles.joinLabel}>
              {heroEvent.joinedByMe ? "View Event" : "Join Event"}
            </ThemedText>
          </View>
        </Pressable>
      ) : null}

      {featured.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="smallBold">Continue Learning</ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                expandLearning ? "Show fewer challenges" : "See all challenges"
              }
              onPress={() => setExpandLearning((v) => !v)}
              style={({ pressed }) => pressed && styles.textPillPressed}
            >
              <ThemedText type="small" style={{ color: theme.accent }}>
                {expandLearning ? "Show less →" : "See All →"}
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.grid}>
            {featured.map((item) => {
              const pct = Math.round((item.solvedCount / maxSolves) * 100);
              return (
                <Link key={item.id} href={`/challenge/${item.id}`} asChild>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Challenge ${item.title}, ${item.basePoints} points, ${difficultyLabel(item.difficulty)}`}
                    style={({ pressed }) => [
                      styles.gridCard,
                      pressed && !reduceMotion && styles.cardPressed,
                    ]}
                  >
                    <View style={styles.gridHeader}>
                      <ThemedText
                        type="small"
                        themeColor="textSecondary"
                        numberOfLines={1}
                        style={styles.gridCategory}
                      >
                        {item.category.name}
                      </ThemedText>
                      <ThemedText
                        type="small"
                        style={{
                          color: difficultyColor(item.difficulty, theme),
                        }}
                      >
                        {difficultyLabel(item.difficulty)}
                      </ThemedText>
                    </View>
                    <ThemedText type="smallBold" numberOfLines={2} style={styles.gridTitle}>
                      {item.title}
                    </ThemedText>
                    <View style={styles.progressRow}>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { flex: pct }]} />
                        <View
                          style={[
                            styles.progressSpacer,
                            { flex: Math.max(0, 100 - pct) },
                          ]}
                        />
                      </View>
                      <ThemedText type="small" themeColor="textSecondary" style={styles.progressPct}>
                        {pct}%
                      </ThemedText>
                    </View>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open offline packs in the toolkit"
        onPress={() => router.push("/toolkit")}
        style={({ pressed }) => [
          styles.tile,
          pressed && !reduceMotion && styles.cardPressed,
        ]}
      >
        <View style={styles.tileBody}>
          <ThemedText type="smallBold">Offline Packs</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Tools that work without a signal
          </ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.accent }}>→</ThemedText>
      </Pressable>

      {nextUnsolved ? (
        <View style={styles.missionCard}>
          <View style={styles.missionTopRow}>
            <ThemedText type="smallBold">Daily Mission</ThemedText>
            {runningEvent ? (
              <ThemedText type="small" themeColor="textSecondary">
                {formatCountdown(missionDeadline)}
              </ThemedText>
            ) : null}
          </View>
          <View style={styles.missionSubRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Your Progress
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Level {level}
            </ThemedText>
          </View>
          <ThemedText type="subtitle" style={styles.missionTitle}>
            Can you find the flag?
          </ThemedText>
          <View style={styles.xpRow}>
            <View style={[styles.progressTrack, styles.xpTrack]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    flex: Math.min(
                      100,
                      Math.round(((me?.score ?? 0) / milestone) * 100),
                    ),
                  },
                ]}
              />
              <View
                style={[
                  styles.progressSpacer,
                  {
                    flex: Math.max(
                      0,
                      100 -
                        Math.min(
                          100,
                          Math.round(((me?.score ?? 0) / milestone) * 100),
                        ),
                    ),
                  },
                ]}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.xpLabel}>
              {(me?.score ?? 0).toLocaleString()}/
              {milestone.toLocaleString()} pts
            </ThemedText>
          </View>
          <View style={styles.rewardRow}>
            <View style={styles.rewardChip}>
              <ThemedText type="small" style={{ color: theme.success }}>
                +{nextUnsolved.basePoints} pts
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                Solve &ldquo;{nextUnsolved.title}&rdquo;
              </ThemedText>
            </View>
            <View style={styles.rewardChip}>
              <ThemedText type="small" style={{ color: theme.accent }}>
                +{Math.max(10, Math.round(nextUnsolved.basePoints / 2))} Bonus
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                First attempt bonus
              </ThemedText>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start challenge ${nextUnsolved.title}`}
            onPress={missionCta}
            style={({ pressed }) => [
              styles.missionCta,
              pressed && !reduceMotion && styles.cardPressed,
            ]}
          >
            <ThemedText type="small" style={{ color: theme.accent }}>
              Start Challenge →
            </ThemedText>
          </Pressable>
          <View style={styles.missionStatsRow}>
            <View style={styles.missionStat}>
              <ThemedText type="smallBold">{me?.solves ?? solvedCount}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Solved
              </ThemedText>
            </View>
            <View style={styles.missionStat}>
              <ThemedText type="smallBold">—</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                First Bloods
              </ThemedText>
            </View>
            <View style={styles.missionStat}>
              <ThemedText type="smallBold">—</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Day Streak
              </ThemedText>
            </View>
            <View style={styles.missionStat}>
              <ThemedText type="smallBold">{badges ?? "—"}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Badges
              </ThemedText>
            </View>
          </View>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open the cyber toolkit"
        onPress={() => router.push("/toolkit")}
        style={({ pressed }) => [
          styles.tile,
          pressed && !reduceMotion && styles.cardPressed,
        ]}
      >
        <View style={styles.tileBody}>
          <ThemedText type="smallBold">Cyber Toolkit</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Powerful tools for every hacker.
          </ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.accent }}>→</ThemedText>
      </Pressable>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold">All Challenges</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {data ? `${data.items.length} on this page` : ""}
          </ThemedText>
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
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      numberOfLines={1}
                      style={styles.cardCategory}
                    >
                      {item.category.name}
                    </ThemedText>
                    <ThemedText type="smallBold" numberOfLines={1}>
                      {item.title}
                    </ThemedText>
                    {item.solvedByMe ? (
                      <ThemedText type="small" style={{ color: theme.success }}>
                        Solved ✓
                      </ThemedText>
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {item.solvedCount > 0 ? `${item.solvedCount} solves` : "Be the first to solve"}
                      </ThemedText>
                    )}
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: Spacing.one,
  },
  brand: {
    fontWeight: "800",
  },
  levelChip: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(220, 228, 240, 0.18)",
    backgroundColor: HOME_SURFACE,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  levelChipLabel: {
    color: HOME_INDIGO,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  pill: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  pillLabel: {
    letterSpacing: 0.75,
    fontWeight: "600",
  },
  heroCard: {
    backgroundColor: HOME_SURFACE,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginTop: Spacing.three,
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(220, 228, 240, 0.08)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#c9344f",
  },
  heroLiveText: {
    color: "#c9344f",
    fontWeight: "800",
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
  },
  heroSub: {
    opacity: 0.9,
  },
  heroStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.two,
  },
  heroStat: {
    gap: Spacing.half,
  },
  heroStatValue: {
    fontSize: 16,
  },
  joinBtn: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.three,
    marginTop: Spacing.one,
  },
  joinLabel: {
    color: "#ffffff",
    fontWeight: "700",
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  gridCard: {
    backgroundColor: HOME_SURFACE_HI,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
    width: "48%",
  },
  gridHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: Spacing.one,
  },
  gridCategory: {
    flex: 1,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  gridTitle: {
    minHeight: 36,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  progressTrack: {
    flex: 1,
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(220, 228, 240, 0.10)",
  },
  progressFill: {
    backgroundColor: HOME_INDIGO,
  },
  progressSpacer: {
    backgroundColor: "transparent",
  },
  progressPct: {
    minWidth: 30,
    textAlign: "right",
  },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: HOME_SURFACE_HI,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginTop: Spacing.three,
    gap: Spacing.two,
  },
  tileBody: {
    flex: 1,
    gap: Spacing.half,
  },
  missionCard: {
    backgroundColor: HOME_SURFACE,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    marginTop: Spacing.three,
    gap: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(220, 228, 240, 0.08)",
  },
  missionTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  missionSubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.one,
  },
  missionTitle: {
    fontWeight: "800",
  },
  xpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  xpTrack: {
    height: 6,
  },
  xpLabel: {
    minWidth: 90,
    textAlign: "right",
  },
  rewardRow: {
    flexDirection: "row",
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  rewardChip: {
    flex: 1,
    backgroundColor: HOME_SURFACE_HI,
    borderRadius: Radius.md,
    padding: Spacing.two + Spacing.half,
    gap: 2,
  },
  missionCta: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.one,
  },
  missionStatsRow: {
    flexDirection: "row",
    marginTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(220, 228, 240, 0.08)",
    paddingTop: Spacing.three,
  },
  missionStat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  textPillPressed: {
    opacity: 0.7,
  },
  cardCategory: {
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
