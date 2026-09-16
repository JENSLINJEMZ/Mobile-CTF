import type {
  EventChallengeDto,
  EventLeaderboardEntryDto,
  EventLeaderboardScope,
  EventSummaryDto,
} from "@ctf/shared";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextStyle,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";

import { Countdown } from "@/components/countdown";
import { EventCard } from "@/components/event-card";
import { LucideIcon } from "@/components/lucide-icon";
import { ErrorState, LoadingState } from "@/components/state-views";
import { Surface } from "@/components/surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { C } from "@/constants/design";
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
  listEvents,
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

function badgeFor(event: EventSummaryDto): { label: string; bg: string; fg: string } {
  switch (event.status) {
    case "RUNNING":
      return { label: "Live Now", bg: "rgba(239,68,68,.9)", fg: "#fff" };
    case "SCHEDULED":
      return { label: "Coming Soon", bg: "rgba(34,211,238,.18)", fg: "#cffafe" };
    default:
      return { label: "Completed", bg: "rgba(255,255,255,.06)", fg: "#94a3b8" };
  }
}

function formatDateRange(event: EventSummaryDto): string {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", opts)}`;
  }
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function formatDuration(event: EventSummaryDto): string {
  const days = Math.ceil(
    (new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) / 86400000,
  );
  return days <= 1 ? `${Math.round((new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) / 3600000)} hours` : `${days} days`;
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuthGate();
  const router = useRouter();
  const [saved, setSaved] = useState(false);

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
  const [related, setRelated] = useState<EventSummaryDto[]>([]);
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
      try {
        const all = await listEvents();
        setRelated(
          all.filter((e) => e.id !== eventId).slice(0, 3),
        );
      } catch {
        setRelated([]);
      }
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
    <View style={styles.root}>
      <LinearGradient
        colors={["#0a0913", "#07070f", "#06060d"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {loading && !event ? (
        <LoadingState />
      ) : error && !event ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : event ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 + insets.bottom }}
        >
          {/* Cover */}
          <View style={styles.cover}>
            <LinearGradient
              colors={["#2a1a52", "#1a0f30", "#0d0818"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={[
                "rgba(4,3,9,.4)",
                "transparent",
                "transparent",
                "rgba(13,11,24,.98)",
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.coverDeco}>
              <Text style={styles.coverScript}>HACK{`\n`}LEARN{`\n`}CREATE</Text>
            </View>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={({ pressed }) => [
                styles.floatingBtn,
                {
                  top: insets.top + 8,
                  left: 14,
                },
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.backIconRot}>
                <LucideIcon name="chevron" size={18} color="#fff" />
              </View>
            </Pressable>
            <Pressable
              onPress={() => setSaved((s) => !s)}
              accessibilityRole="button"
              accessibilityLabel={saved ? "Remove from saved events" : "Save event"}
              accessibilityState={{ selected: saved }}
              style={({ pressed }) => [
                styles.floatingBtn,
                {
                  top: insets.top + 8,
                  right: 14,
                },
                saved && styles.floatingBtnActive,
                pressed && styles.pressed,
              ]}
            >
              <LucideIcon
                name="bookmark"
                size={18}
                color={saved ? C.purpleLight : "#e5e2f2"}
              />
            </Pressable>
          </View>

          <View style={styles.body}>
            {/* Badges */}
            {(() => {
              const badge = badgeFor(event);
              return (
                <View style={styles.badges}>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: badge.bg, borderColor: "transparent" },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: badge.fg }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
              );
            })()}

            <Text style={styles.title}>{event.title}</Text>

            {/* Meta grid */}
            <View style={styles.metaGrid}>
              <MetaTile
                icon="calendar"
                accent="#a78bfa"
                title={formatDateRange(event)}
                sub={formatDuration(event)}
              />
              <MetaTile
                icon="globe"
                accent="#22d3ee"
                title="Online · Global"
                sub="Format"
              />
              <MetaTile
                icon="trophy"
                accent="#fbbf24"
                title="Prizes & Swag"
                sub="Prize pool"
              />
              <MetaTile
                icon="users"
                accent="#ec4899"
                title={`${event.participantCount} registered`}
                sub="Players"
              />
            </View>

            {/* Countdown */}
            {event.status === "SCHEDULED" ? (
              <Countdown target={event.startsAt} mode="starts" />
            ) : event.status === "RUNNING" ? (
              <Countdown target={event.endsAt} mode="ends" />
            ) : null}

            {/* Actions */}
            {isAuthenticated && event.status !== "ENDED" ? (
              <View style={styles.actions}>
                <Pressable
                  disabled={busy || event.status === "DRAFT"}
                  onPress={() => void onToggleJoin()}
                  accessibilityRole="button"
                  accessibilityLabel={
                    event.joinedByMe ? "Leave event" : "Join event"
                  }
                  accessibilityHint={
                    event.joinedByMe ? "Prompts for confirmation first" : undefined
                  }
                  accessibilityState={{
                    disabled: busy || event.status === "DRAFT",
                  }}
                  style={({ pressed }) => [
                    styles.registerWrap,
                    busy && styles.disabled,
                    pressed && !busy && styles.pressed,
                  ]}
                >
                  <LinearGradient
                    colors={event.joinedByMe ? ["#059669", "#047857"] : ["#8b5cf6", "#6d28d9"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.registerBtn,
                      event.joinedByMe && styles.registeredBtn,
                    ]}
                  >
                    {busy ? (
                      <ActivityIndicator
                        color={event.joinedByMe ? theme.successStrong : "#fff"}
                        size="small"
                      />
                    ) : (
                      <View style={styles.registerInner}>
                        <LucideIcon
                          name={event.joinedByMe ? "check" : "plus"}
                          size={16}
                          color={event.joinedByMe ? "#fff" : "#fff"}
                        />
                        <Text
                          style={[
                            styles.registerLabel,
                            event.joinedByMe && { color: "#fff" },
                          ]}
                        >
                          {event.joinedByMe ? "Registered" : "Register Now"}
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Share event"
                  style={({ pressed }) => [
                    styles.shareBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <LucideIcon name="share" size={16} color={C.purpleLight} />
                  <Text style={styles.shareLabel}>Share</Text>
                </Pressable>
              </View>
            ) : null}

            {/* Description */}
            {event.description ? (
              <Surface radius={Radius.md} style={styles.markdownBox}>
                <Markdown style={markdownTheme}>{event.description}</Markdown>
              </Surface>
            ) : null}

            {/* My Team */}
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

            {/* Speakers */}
            {event.speakers && event.speakers.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <LucideIcon name="users" size={15} color={C.purpleLight} />
                  <Text style={styles.sectionTitle}>Speakers</Text>
                  <Text style={styles.sectionCount}>
                    {event.speakers.length} confirmed
                  </Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.speakerRow}
                >
                  {event.speakers.map((speaker) => (
                    <View key={`${speaker.name}-${speaker.role}`} style={styles.speakerCard}>
                      <View
                        style={[
                          styles.speakerAvatar,
                          { borderColor: "rgba(167,139,250,.5)" },
                        ]}
                      >
                        <View style={styles.speakerAvatarFill}>
                          <Text style={styles.speakerInitial}>
                            {speaker.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.speakerName}>{speaker.name}</Text>
                      <Text style={styles.speakerRole}>{speaker.role}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {/* Schedule */}
            {event.schedule && event.schedule.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <LucideIcon name="calendar" size={15} color={C.purpleLight} />
                  <Text style={styles.sectionTitle}>Schedule</Text>
                  <Text style={styles.sectionCount}>Day 1 preview</Text>
                </View>
                <View style={styles.scheduleList}>
                  {event.schedule.map((item, index) => {
                    const [time, period] = item.time.split(" ");
                    return (
                      <View key={`${item.time}-${index}`} style={styles.scheduleItem}>
                        <View style={styles.schTime}>
                          <Text style={styles.schTimeValue}>{time}</Text>
                          {period ? <Text style={styles.schTimePeriod}>{period}</Text> : null}
                        </View>
                        <View style={styles.schBody}>
                          <Text style={styles.schTitle}>{item.title}</Text>
                          <Text style={styles.schHost}>{item.host}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Related events */}
            {related.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHead}>
                  <LucideIcon name="sparkles" size={15} color={C.purpleLight} />
                  <Text style={styles.sectionTitle}>Related Events</Text>
                  <Text style={styles.sectionCount}>Keep exploring</Text>
                </View>
                <View style={styles.relatedList}>
                  {related.map((rel) => {
                    const rStart = new Date(
                      rel.status === "ENDED" ? rel.endsAt : rel.startsAt,
                    );
                    return (
                      <Link key={rel.id} href={`/event/${rel.id}`} asChild>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Open related event ${rel.title}`}
                          style={({ pressed }) => [
                            styles.relatedItem,
                            pressed && styles.pressed,
                          ]}
                        >
                          <View style={styles.relatedDate}>
                            <Text style={styles.relatedMonth}>
                              {rStart
                                .toLocaleDateString("en-US", { month: "short" })
                                .toUpperCase()}
                            </Text>
                            <Text style={styles.relatedDay}>
                              {String(rStart.getDate()).padStart(2, "0")}
                            </Text>
                          </View>
                          <View style={styles.relatedTxt}>
                            <Text style={styles.relatedTitle} numberOfLines={1}>
                              {rel.title}
                            </Text>
                            <Text style={styles.relatedSub}>
                              {rel.participantCount} registered · Online
                            </Text>
                          </View>
                          <View style={styles.relatedGo}>
                            <LucideIcon name="chevron" size={12} color={C.purpleLight} />
                          </View>
                        </Pressable>
                      </Link>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Challenges */}
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
                        accessibilityState={{ selected: item.solvedByMe ? true : undefined }}
                        style={({ pressed }) => [pressed && styles.pressed]}
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
                                  { backgroundColor: difficultyColor(item.difficulty, theme) },
                                ]}
                              />
                              {item.solvedByMe ? (
                                <ThemedText type="small" style={{ color: theme.success }}>
                                  Solved ✓
                                </ThemedText>
                              ) : (
                                <ThemedText type="small" themeColor="textSecondary">
                                  {item.solvedCount} solves
                                </ThemedText>
                              )}
                            </ThemedView>
                          </ThemedView>
                          <ThemedText type="metric">{item.basePoints} pts</ThemedText>
                        </Surface>
                      </Pressable>
                    </Link>
                  ),
                )
              )}
            </ThemedView>

            {/* Leaderboard */}
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
                      variant={leaderboard.me?.rank === entry.rank ? "selected" : "elevated"}
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
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

function MetaTile({
  icon,
  accent,
  title,
  sub,
}: {
  icon: "calendar" | "globe" | "trophy" | "users";
  accent: string;
  title: string;
  sub: string;
}) {
  return (
    <View style={[styles.metaTile, { borderColor: "rgba(167,139,250,.22)" }]}>
      <LinearGradient
        colors={["rgba(24,21,44,.7)", "rgba(13,11,23,.85)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.metaTileBg}
        pointerEvents="none"
      />
      <View
        style={[
          styles.metaTileIcon,
          { borderColor: "rgba(167,139,250,.3)", backgroundColor: "rgba(139,92,246,.14)" },
        ]}
      >
        <LucideIcon name={icon} size={15} color={accent} />
      </View>
      <View style={styles.metaTileText}>
        <Text style={styles.metaTileTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.metaTileSub}>{sub}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bgPrimary,
  },
  cover: {
    width: "100%",
    aspectRatio: 16 / 10,
    maxHeight: 230,
    overflow: "hidden",
  },
  floatingBtn: {
    position: "absolute",
    zIndex: 3,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(9,8,17,.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.12)",
  },
  floatingBtnActive: {
    borderColor: "rgba(167,139,250,.6)",
  },
  backIconRot: {
    transform: [{ rotate: "180deg" }],
  },
  coverDeco: {
    position: "absolute",
    top: 14,
    right: 14,
  },
  coverScript: {
    fontSize: 16,
    lineHeight: 17,
    fontWeight: "600",
    fontStyle: "italic",
    textAlign: "right",
    color: "rgba(233,227,255,.85)",
    transform: [{ rotate: "-3deg" }],
  },
  body: {
    paddingHorizontal: Spacing.three,
    marginTop: -Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.7,
    lineHeight: 27,
    color: "#fff",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  metaTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "48%",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  metaTileBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  metaTileIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  metaTileText: {
    flex: 1,
    minWidth: 0,
  },
  metaTileTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.1,
    lineHeight: 14,
  },
  metaTileSub: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: "600",
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 9,
  },
  registerWrap: {
    flex: 1,
    borderRadius: 13,
    overflow: "hidden",
    elevation: 3,
  },
  registerBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
  },
  registerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  registeredBtn: {
    elevation: 3,
  },
  registerLabel: {
    color: "#fff",
    fontSize: 13.5,
    fontWeight: "700",
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    minHeight: 48,
    paddingHorizontal: 18,
    borderRadius: 13,
    backgroundColor: "rgba(139,92,246,.12)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,.4)",
  },
  shareLabel: {
    color: C.purpleLight,
    fontSize: 13,
    fontWeight: "700",
  },
  markdownBox: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    overflow: "hidden",
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
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: "#fff",
  },
  sectionCount: {
    marginLeft: "auto",
    fontSize: 10.5,
    fontWeight: "600",
    color: C.textMuted,
  },
  speakerRow: {
    gap: 10,
    paddingBottom: 4,
  },
  speakerCard: {
    width: 130,
    padding: 13,
    borderRadius: 13,
    backgroundColor: "rgba(24,21,44,.7)",
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
  },
  speakerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    overflow: "hidden",
    marginBottom: 9,
  },
  speakerAvatarFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2c1c52",
  },
  speakerInitial: {
    fontSize: 20,
    fontWeight: "900",
    color: "#c4b5fd",
  },
  speakerName: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.15,
  },
  speakerRole: {
    fontSize: 9.5,
    color: C.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
  scheduleList: {
    gap: 8,
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 11,
    borderRadius: 12,
    backgroundColor: "rgba(18,16,31,.7)",
    borderWidth: 1,
    borderColor: C.border,
  },
  schTime: {
    alignItems: "center",
    minWidth: 52,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(139,92,246,.12)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,.28)",
  },
  schTimeValue: {
    fontSize: 11.5,
    fontWeight: "800",
    color: C.purpleLight,
    lineHeight: 14,
  },
  schTimePeriod: {
    fontSize: 8.5,
    fontWeight: "700",
    letterSpacing: 0.6,
    color: C.textMuted,
    marginTop: 2,
  },
  schBody: {
    flex: 1,
    minWidth: 0,
  },
  schTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#fff",
  },
  schHost: {
    fontSize: 10.5,
    color: C.textMuted,
  },
  relatedList: {
    gap: 8,
  },
  relatedItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 10,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: "rgba(20,17,36,.7)",
    borderWidth: 1,
    borderColor: C.border,
  },
  relatedDate: {
    width: 44,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "rgba(139,92,246,.15)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,.28)",
  },
  relatedMonth: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 1,
    color: C.purpleLight,
  },
  relatedDay: {
    fontSize: 14,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 15,
  },
  relatedTxt: {
    flex: 1,
    minWidth: 0,
  },
  relatedTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 2,
  },
  relatedSub: {
    fontSize: 10.5,
    color: C.textMuted,
  },
  relatedGo: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "rgba(139,92,246,.14)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,.3)",
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
    borderRadius: Radius.pill,
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