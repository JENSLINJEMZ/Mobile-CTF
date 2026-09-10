import type {
  EventChallengeDto,
  EventLeaderboardEntryDto,
  EventLeaderboardScope,
  EventSummaryDto,
} from "@ctf/shared";
import { Link, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  type TextStyle,
} from "react-native";
import Markdown from "react-native-markdown-display";

import { ScreenShell } from "@/components/screen-shell";
import { ErrorState, LoadingState } from "@/components/state-views";
import { Surface } from "@/components/surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  difficultyColor,
  Radius,
  Spacing,
  TouchTarget,
} from "@/constants/theme";
import {
  getEvent,
  getEventChallenges,
  getEventLeaderboard,
  joinEvent,
  leaveEvent,
} from "@/services/events";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useTheme } from "@/hooks/use-theme";

const LOCKED_LABELS: Record<string, string> = {
  not_started: "Starts soon",
  time_lock: "Unlocks later",
  prerequisite: "Solve prerequisite",
  score: "Needs higher score",
  ended: "Event ended",
  join_required: "Join to access",
};

function statusText(event: EventSummaryDto): string {
  if (event.status === "RUNNING") {
    const diff = new Date(event.endsAt).getTime() - Date.now();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  }
  if (event.status === "SCHEDULED") return "Upcoming";
  return event.status === "ENDED" ? "Ended" : "Draft";
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);
  const theme = useTheme();
  const { isAuthenticated } = useAuthGate();

  const markdownTheme = useMemo(
    () => ({
      body: {
        color: theme.text,
        fontSize: 15,
        lineHeight: 22,
      },
      heading1: {
        color: theme.text,
        fontSize: 20,
        fontWeight: "700" as TextStyle["fontWeight"],
        marginTop: Spacing.two,
      },
      paragraph: { marginVertical: Spacing.one },
      strong: { fontWeight: "700" as TextStyle["fontWeight"] },
    }),
    [theme],
  );

  const [event, setEvent] = useState<EventSummaryDto | null>(null);
  const [challenges, setChallenges] = useState<EventChallengeDto[]>([]);
  const [leaderboard, setLeaderboard] = useState<{
    scope: EventLeaderboardScope;
    entries: EventLeaderboardEntryDto[];
    me: { rank: number | null; score: number } | null;
  }>({ scope: "participants", entries: [], me: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadChallenges = useCallback(async (targetEventId: number) => {
    try {
      const items = await getEventChallenges(targetEventId);
      setChallenges(items);
    } catch {
      setChallenges([]);
    }
  }, []);

  const loadLeaderboard = useCallback(
    async (targetEventId: number, scope: EventLeaderboardScope) => {
      try {
        const board = await getEventLeaderboard(targetEventId, scope, 20);
        setLeaderboard({
          scope: board.scope,
          entries: board.entries,
          me: board.me,
        });
      } catch {
        setLeaderboard((prev) => ({ ...prev, entries: [], me: null }));
      }
    },
    [],
  );

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getEvent(eventId);
      setEvent(data);
      await Promise.all([
        loadChallenges(eventId),
        loadLeaderboard(eventId, leaderboard.scope),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load event");
    } finally {
      setLoading(false);
    }
  }, [eventId, loadChallenges, loadLeaderboard, leaderboard.scope]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggleJoin = useCallback(async () => {
    if (busy || !event) return;
    setBusy(true);
    try {
      if (event.joinedByMe) {
        await leaveEvent(event.id);
      } else {
        await joinEvent(event.id);
      }
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }, [busy, event, load]);

  const onToggleJoin = useCallback(() => {
    if (busy || !event) return;
    if (event.joinedByMe) {
      Alert.alert(
        "Leave event?",
        `You'll stop participating in "${event.title}". You can rejoin anytime if it's still running.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => void toggleJoin() },
        ],
      );
      return;
    }
    void toggleJoin();
  }, [busy, event, toggleJoin]);

  const solvedCount = challenges.filter((c) => c.solvedByMe).length;

  return (
    <ScreenShell title="Event">
      {loading && !event ? (
        <LoadingState />
      ) : error && !event ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : event ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle">{event.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {statusText(event)} · {event.participantCount} participants ·{" "}
            {event.joinedByMe ? "Joined" : "Not joined"}
          </ThemedText>

          {event.description ? (
            <Surface radius={Radius.md} style={styles.markdownBox}>
              <Markdown style={markdownTheme}>{event.description}</Markdown>
            </Surface>
          ) : null}

          {isAuthenticated && event.status !== "ENDED" ? (
            <Pressable
              disabled={busy || event.status === "DRAFT"}
              onPress={() => void onToggleJoin()}
              accessibilityRole="button"
              accessibilityLabel={
                event.joinedByMe ? "Leave event" : "Join event"
              }
              accessibilityHint={
                event.joinedByMe
                  ? "Prompts for confirmation first"
                  : undefined
              }
              accessibilityState={{
                disabled: busy || event.status === "DRAFT",
              }}
              style={({ pressed }) => [
                styles.joinButton,
                {
                  backgroundColor: event.joinedByMe
                    ? theme.danger
                    : theme.accent,
                },
                busy && styles.disabled,
                pressed && !busy && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator
                  color={event.joinedByMe ? "#ffffff" : theme.onAccent}
                  size="small"
                />
              ) : (
                <ThemedText
                  style={{
                    color: event.joinedByMe ? "#ffffff" : theme.onAccent,
                    fontWeight: "600",
                  }}
                >
                  {event.joinedByMe ? "Leave event" : "Join event"}
                </ThemedText>
              )}
            </Pressable>
          ) : null}

          {event.joinedByMe ? (
            <Surface radius={Radius.md} style={styles.sectionCard}>
              <ThemedView style={styles.sectionHeader}>
                <ThemedText type="smallBold">My Team</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {solvedCount}/{challenges.length} solved
                </ThemedText>
              </ThemedView>
              <Link href="/teams" asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open team management"
                  style={({ pressed }) => [
                    styles.teamLink,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ color: theme.accent, fontWeight: "600" }}
                  >
                    Manage team →
                  </ThemedText>
                </Pressable>
              </Link>
            </Surface>
          ) : null}

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Challenges</ThemedText>
            {challenges.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {event.joinedByMe
                  ? "No challenges in this event yet."
                  : "Join the event to see its challenges."}
              </ThemedText>
            ) : (
              challenges.map((item) =>
                item.locked ? (
                  <Surface
                    key={item.id}
                    radius={Radius.md}
                    variant="quiet"
                    style={[styles.challengeRow, styles.lockedRow]}
                    accessible
                    accessibilityLabel={`${item.title}, locked, ${LOCKED_LABELS[item.lockedReason ?? ""] ?? "Locked"}, ${item.basePoints} points`}
                  >
                    <ThemedView style={styles.challengeBody}>
                      <ThemedText
                        type="smallBold"
                        themeColor="textSecondary"
                        numberOfLines={1}
                      >
                        {item.title}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        🔒 {LOCKED_LABELS[item.lockedReason ?? ""] ?? "Locked"}
                      </ThemedText>
                    </ThemedView>
                    <ThemedText type="metric" themeColor="textSecondary">
                      {item.basePoints} pts
                    </ThemedText>
                  </Surface>
                ) : (
                  <Link
                    key={item.id}
                    href={`/challenge/${item.challengeId}?event=${event.id}`}
                    asChild
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Solve challenge ${item.title}, ${item.basePoints} points`}
                      accessibilityState={{
                        selected: item.solvedByMe ? true : undefined,
                      }}
                      style={({ pressed }) => [
                        pressed && styles.pressed,
                      ]}
                    >
                      <Surface
                        style={styles.challengeSurface}
                        radius={Radius.md}
                        variant={item.solvedByMe ? "selected" : "elevated"}
                      >
                        <ThemedView style={styles.challengeBody}>
                          <ThemedText type="smallBold" numberOfLines={1}>
                            {item.title}
                          </ThemedText>
                          <ThemedView style={styles.challengeMeta}>
                            <ThemedView
                              style={[
                                styles.dot,
                                {
                                  backgroundColor: difficultyColor(
                                    item.difficulty,
                                    theme,
                                  ),
                                },
                              ]}
                            />
                            {item.solvedByMe ? (
                              <ThemedText
                                type="small"
                                style={{ color: theme.success }}
                              >
                                Solved ✓
                              </ThemedText>
                            ) : (
                              <ThemedText type="small" themeColor="textSecondary">
                                {item.solvedCount} solves
                              </ThemedText>
                            )}
                          </ThemedView>
                        </ThemedView>
                        <ThemedText type="metric">
                          {item.basePoints} pts
                        </ThemedText>
                      </Surface>
                    </Pressable>
                  </Link>
                ),
              )
            )}
          </ThemedView>

          {event.joinedByMe && event.status === "RUNNING" ? (
            <ThemedView style={styles.section}>
              <ThemedView style={styles.sectionHeader}>
                <ThemedText type="smallBold">Leaderboard</ThemedText>
                <ThemedView style={styles.chips}>
                  {(["participants", "teams"] as const).map((scope) => {
                    const active = leaderboard.scope === scope;
                    return (
                      <Pressable
                        key={scope}
                        onPress={() => void loadLeaderboard(event.id, scope)}
                        accessibilityRole="button"
                        accessibilityLabel={
                          scope === "participants"
                            ? "Leaderboard by participants"
                            : "Leaderboard by teams"
                        }
                        accessibilityState={{ selected: active }}
                        style={[
                          styles.chip,
                          active && [styles.chipActive, { backgroundColor: theme.accent }],
                        ]}
                      >
                        <ThemedText
                          type="small"
                          style={{
                            color: active ? theme.onAccent : theme.text,
                            fontWeight: "600",
                          }}
                        >
                          {scope === "participants" ? "People" : "Teams"}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </ThemedView>
              </ThemedView>

              {leaderboard.entries.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  No scores yet in this event.
                </ThemedText>
              ) : (
                leaderboard.entries.map((entry) => (
                  <Surface
                    key={`${leaderboard.scope}-${entry.id}`}
                    radius={Radius.md}
                    variant={
                      leaderboard.me?.rank === entry.rank ? "selected" : "elevated"
                    }
                    style={[
                      styles.leaderboardRow,
                      leaderboard.me?.rank === entry.rank && [styles.entryMe, { borderColor: theme.accent }],
                    ]}
                  >
                    <ThemedText type="metric" style={styles.rankCell}>
                      {entry.rank}
                    </ThemedText>
                    <ThemedText numberOfLines={1} style={styles.nameCell}>
                      {entry.name}
                    </ThemedText>
                    <ThemedText type="metric">{entry.score}</ThemedText>
                  </Surface>
                ))
              )}
            </ThemedView>
          ) : null}
        </ScrollView>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  markdownBox: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    overflow: "hidden",
  },
  joinButton: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TouchTarget.Android,
    paddingVertical: Spacing.three,
  },
  sectionCard: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  teamLink: {
    alignSelf: "flex-start",
    minHeight: TouchTarget.Android,
    justifyContent: "center",
  },
  section: {
    gap: Spacing.two,
  },
  challengeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    gap: Spacing.two,
    minHeight: TouchTarget.Android,
  },
  challengeSurface: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.three,
    gap: Spacing.two,
    minHeight: TouchTarget.Android,
  },
  lockedRow: {
    opacity: 0.8,
  },
  challengeBody: {
    flex: 1,
    gap: Spacing.one,
  },
  challengeMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chips: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    minHeight: TouchTarget.Android,
    justifyContent: "center",
  },
  chipActive: {},
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    borderRadius: Radius.md,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    minHeight: TouchTarget.Android,
  },
  entryMe: {
    borderWidth: 1,
  },
  rankCell: {
    minWidth: 28,
    fontWeight: "700",
  },
  nameCell: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
