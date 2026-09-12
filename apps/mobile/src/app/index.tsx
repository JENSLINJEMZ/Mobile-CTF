import { Ionicons } from "@expo/vector-icons";
import type {
  ChallengeSummaryDto,
  EventSummaryDto,
  LeaderboardMeDto,
} from "@ctf/shared";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ErrorState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import {
  difficultyColor,
  Radius,
  Spacing,
} from "@/constants/theme";
import { listChallenges } from "@/services/challenges";
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

function cleanMarkdown(value: string): string {
  return value
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s*#{1,6}\s*/, "")
        .replace(/^\s*[-*+]\s*/, "")
        .replace(/[*_`]/g, ""),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLeadingTitle(value: string, title: string): string {
  const clean = value.trim();
  const prefix = title.trim();
  if (clean.startsWith(prefix)) {
    const rest = clean.slice(prefix.length).replace(/^\s*[-–—:.]?\s*/, "").trim();
    if (rest) return rest;
  }
  return clean;
}

const HOME_INDIGO = "#6a4afb";
const HOME_RED = "#c9344f";
const HOME_SURFACE = "#0a1a2c";
const HOME_SURFACE_HI = "#102031";
const HOME_PILLS = ["LEARN", "HACK", "COMPETE", "ANYWHERE"] as const;

type QuickLink = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: `/challenges` | `/events` | `/terminal` | `/toolkit` | `/teams` | `/leaderboard`;
};

const QUICK_LINKS: QuickLink[] = [
  { label: "Challenges", icon: "flag", href: "/challenges" },
  { label: "Events", icon: "calendar", href: "/events" },
  { label: "Terminal", icon: "terminal", href: "/terminal" },
  { label: "Tools", icon: "construct", href: "/toolkit" },
  { label: "Teams", icon: "people", href: "/teams" },
  { label: "Leaderboard", icon: "trophy", href: "/leaderboard" },
];

export default function HomeScreen() {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const router = useRouter();
  const { status: authStatus } = useAuthGate();
  const [challenges, setChallenges] = useState<ChallengeSummaryDto[]>([]);
  const [events, setEvents] = useState<EventSummaryDto[]>([]);
  const [me, setMe] = useState<LeaderboardMeDto | null>(null);
  const [badges, setBadges] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [challengeResult, eventList] = await Promise.all([
        listChallenges({ page: 1 }),
        listEvents().catch(() => []),
      ]);
      setChallenges(challengeResult.items);
      setEvents(eventList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
  const featured = challenges.slice(0, 4);
  const maxSolves = Math.max(1, ...challenges.map((c) => c.solvedCount));
  const nextUnsolved =
    challenges.find((c) => !c.solvedByMe) ?? challenges[0] ?? null;
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

  if (loading && challenges.length === 0) {
    return (
      <ScreenShell title="">
        <ErrorState message="Loading home…" onRetry={() => void load()} />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="">
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : null}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <View style={styles.headerRow}>
          <ThemedText type="title" style={styles.brand}>
            Mobile CTF
          </ThemedText>
          <View style={styles.headerRight}>
            <View style={styles.levelChip}>
              <ThemedText type="smallBold" style={styles.levelChipLabel}>
                Lv. {level}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.subHeaderRow}>
          <View style={styles.pillRow}>
            {HOME_PILLS.map((pill) => (
              <View
                key={pill}
                style={[styles.pill, { borderColor: theme.borderStrong }]}
              >
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
          <View style={styles.taglineStack}>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.tagline}
            >
              Same Curiosity.
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.tagline}
            >
              A Wider World.
            </ThemedText>
          </View>
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
              <View style={[styles.livePill, { backgroundColor: HOME_RED }]}>
                <ThemedText type="small" style={styles.livePillLabel}>
                  {runningEvent ? "LIVE EVENT" : "UPCOMING EVENT"}
                </ThemedText>
              </View>
              <View style={styles.growStack}>
                {["HACK", "LEARN", "GROW"].map((word) => (
                  <ThemedText
                    key={word}
                    type="small"
                    themeColor="textSecondary"
                    style={styles.growWord}
                  >
                    {word}
                  </ThemedText>
                ))}
              </View>
            </View>

            <ThemedText type="subtitle" style={styles.heroTitle} numberOfLines={2}>
              {heroEvent.title}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={1}
              style={styles.heroSub}
            >
              {heroEvent.description
                ? stripLeadingTitle(
                    cleanMarkdown(heroEvent.description),
                    heroEvent.title,
                  )
                : "Solve challenges, earn points, and be the best!"}
            </ThemedText>

            <View style={styles.statsBar}>
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

        <View style={styles.quickStrip}>
          {QUICK_LINKS.map((link) => (
            <Pressable
              key={link.label}
              accessibilityRole="button"
              accessibilityLabel={`Go to ${link.label}`}
              onPress={() => router.push(link.href)}
              style={({ pressed }) => [
                styles.quickTile,
                pressed && !reduceMotion && styles.tilePressed,
              ]}
            >
              <Ionicons name={link.icon} size={20} color={HOME_INDIGO} />
              <ThemedText type="small" style={styles.quickLabel}>
                {link.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {featured.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold">Continue Learning</ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="See all challenges"
                onPress={() => router.push("/challenges")}
                style={({ pressed }) => pressed && styles.textPillPressed}
              >
                <ThemedText type="small" style={{ color: theme.accent }}>
                  See All →
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
                      <ThemedText
                        type="small"
                        style={styles.gridTitle}
                        numberOfLines={2}
                        >
                        {item.title}
                      </ThemedText>
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
                        style={{ color: difficultyColor(item.difficulty, theme) }}
                      >
                        {difficultyLabel(item.difficulty)}
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
                        <ThemedText type="small">{pct}%</ThemedText>
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
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={1}
              style={styles.tileSub}
            >
              Download challenges and play anytime, anywhere.
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.accent }}>→</ThemedText>
        </Pressable>

        {nextUnsolved ? (
          <View style={styles.missionCard}>
            <View style={styles.missionTopRow}>
              <View style={styles.missionGroup}>
                <ThemedText type="smallBold">Daily Mission</ThemedText>
                {runningEvent ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatCountdown(missionDeadline)}
                  </ThemedText>
                ) : null}
              </View>
              <View style={[styles.missionGroup, styles.missionGroupEnd]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Your Progress
                </ThemedText>
                <ThemedText type="smallBold">Level {level}</ThemedText>
              </View>
            </View>

            <View style={styles.missionTitleRow}>
              <ThemedText
                type="subtitle"
                style={styles.missionTitle}
                numberOfLines={2}
              >
                Can you find the flag?
              </ThemedText>
              <ThemedText type="small" style={styles.xpValue}>
                {(me?.score ?? 0).toLocaleString()}/{milestone.toLocaleString()} XP
              </ThemedText>
            </View>

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

            <View style={styles.rewardRow}>
              <View style={[styles.rewardChip, { borderColor: theme.borderStrong }]}>
                <ThemedText type="small" style={{ color: theme.success }}>
                  +{nextUnsolved.basePoints} XP
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  Solve &ldquo;{nextUnsolved.title}&rdquo;
                </ThemedText>
              </View>
              <View style={[styles.rewardChip, { borderColor: theme.borderStrong }]}>
                <ThemedText type="small" style={{ color: theme.accent }}>
                  +{Math.max(10, Math.round(nextUnsolved.basePoints / 2))} Bonus
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  First attempt bonus
                </ThemedText>
              </View>
            </View>

            <View style={styles.missionCtaRow}>
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
                  <ThemedText type="small">{me?.solves ?? "—"}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Solved
                  </ThemedText>
                </View>
                <View style={styles.missionStat}>
                  <ThemedText type="small">—</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    First Bloods
                  </ThemedText>
                </View>
                <View style={styles.missionStat}>
                  <ThemedText type="small">—</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Day Streak
                  </ThemedText>
                </View>
                <View style={styles.missionStat}>
                  <ThemedText type="small">{badges ?? "—"}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Badges
                  </ThemedText>
                </View>
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
            <ThemedText
              type="small"
              themeColor="textSecondary"
              numberOfLines={1}
              style={styles.tileSub}
            >
              Powerful tools for every hacker.
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.accent }}>→</ThemedText>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  brand: {
    fontWeight: "800",
    flexShrink: 1,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  subHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  taglineStack: {
    alignItems: "flex-end",
    gap: 0,
    flexShrink: 0,
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
  tagline: {
    letterSpacing: 0.3,
    fontSize: 10,
    lineHeight: 13,
  },
  pillRow: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: Spacing.one,
    alignItems: "center",
  },
  pill: {
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.one + Spacing.half,
    paddingVertical: Spacing.half + Spacing.half,
  },
  pillLabel: {
    letterSpacing: 1,
    fontWeight: "700",
    fontSize: 10,
    lineHeight: 14,
  },
  heroCard: {
    backgroundColor: HOME_SURFACE,
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.one + Spacing.half,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(220, 228, 240, 0.08)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  livePill: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.one,
  },
  livePillLabel: {
    color: "#ffffff",
    fontWeight: "800",
    letterSpacing: 1.2,
    fontSize: 10,
    lineHeight: 14,
  },
  growStack: {
    alignItems: "flex-end",
    gap: 2,
  },
  growWord: {
    letterSpacing: 2,
    fontWeight: "700",
    opacity: 0.85,
    fontSize: 10,
    lineHeight: 14,
  },
  heroTitle: {
    fontWeight: "800",
    fontSize: 18,
    lineHeight: 24,
  },
  heroSub: {
    opacity: 0.9,
    fontSize: 10,
    lineHeight: 14,
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: Spacing.one,
  },
  heroStat: {
    gap: 1,
  },
  heroStatValue: {
    fontSize: 13,
    lineHeight: 18,
  },
  joinBtn: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.two,
    marginTop: Spacing.one + Spacing.half,
    alignSelf: "flex-start",
    width: "42%",
  },
  joinLabel: {
    color: "#ffffff",
    fontWeight: "700",
  },
  quickStrip: {
    flexDirection: "row",
    backgroundColor: HOME_SURFACE,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.one,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(220, 228, 240, 0.08)",
  },
  quickTile: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.one,
  },
  quickLabel: {
    textAlign: "center",
  },
  tilePressed: {
    transform: [{ scale: 0.94 }],
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: Spacing.two,
  },
  gridCard: {
    backgroundColor: HOME_SURFACE_HI,
    borderRadius: Radius.md,
    padding: Spacing.two,
    gap: Spacing.one,
    flex: 1,
  },
  gridTitle: {
    fontWeight: "700",
    fontSize: 11,
    lineHeight: 14,
  },
  gridCategory: {
    fontSize: 10,
    lineHeight: 13,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
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
  textPillPressed: {
    opacity: 0.7,
  },
  tile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: HOME_SURFACE_HI,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  tileBody: {
    flex: 1,
    gap: Spacing.half,
  },
  tileSub: {
    fontSize: 10,
    lineHeight: 15,
  },
  missionCard: {
    backgroundColor: HOME_SURFACE,
    borderRadius: Radius.lg,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(220, 228, 240, 0.08)",
  },
  missionTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  missionGroup: {
    gap: Spacing.half,
  },
  missionGroupEnd: {
    alignItems: "flex-end",
  },
  missionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  missionTitle: {
    flex: 1,
    fontWeight: "800",
    fontSize: 15,
    lineHeight: 20,
  },
  xpValue: {
    color: HOME_INDIGO,
    fontWeight: "700",
  },
  xpTrack: {
    height: 6,
  },
  rewardRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  rewardChip: {
    flex: 1,
    backgroundColor: HOME_SURFACE_HI,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.two + Spacing.half,
    gap: 2,
  },
  missionCtaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(220, 228, 240, 0.08)",
    paddingTop: Spacing.three,
  },
  missionCta: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.one,
  },
  missionStatsRow: {
    flexDirection: "row",
    gap: Spacing.three,
  },
  missionStat: {
    alignItems: "center",
    gap: 1,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
});