import type {
  EventChallengeDto,
  EventLeaderboardEntryDto,
  EventLeaderboardScope,
  EventSummaryDto,
} from '@ctf/shared';
import { Link, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useColorScheme,
  type TextStyle,
} from 'react-native';
import Markdown from 'react-native-markdown-display';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getEvent, getEventChallenges, getEventLeaderboard, joinEvent, leaveEvent } from '@/services/events';
import { useAuthStore } from '@/store/auth-store';

const LOCKED_LABELS: Record<string, string> = {
  not_started: 'Starts soon',
  time_lock: 'Unlocks later',
  prerequisite: 'Solve prerequisite',
  score: 'Needs higher score',
  ended: 'Event ended',
  join_required: 'Join to access',
};

function difficultyColor(value: string): string {
  switch (value) {
    case 'EASY':
      return '#16a34a';
    case 'MEDIUM':
      return '#d97706';
    case 'HARD':
      return '#dc2626';
    default:
      return '#7c3aed';
  }
}

function statusText(event: EventSummaryDto): string {
  if (event.status === 'RUNNING') {
    const diff = new Date(event.endsAt).getTime() - Date.now();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  }
  if (event.status === 'SCHEDULED') return 'Upcoming';
  return event.status === 'ENDED' ? 'Ended' : 'Draft';
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);
  const colorScheme = useColorScheme();
  const authStatus = useAuthStore((s) => s.status);
  const isDark = colorScheme === 'dark';

  const markdownTheme = useMemo(
    () => ({
      body: { color: isDark ? '#f9fafb' : '#111827', fontSize: 15, lineHeight: 22 },
      heading1: {
        color: isDark ? '#ffffff' : '#111827',
        fontSize: 20,
        fontWeight: '700' as TextStyle['fontWeight'],
        marginTop: Spacing.two,
      },
      paragraph: { marginVertical: Spacing.one },
      strong: { fontWeight: '700' as TextStyle['fontWeight'] },
    }),
    [isDark],
  );

  const [event, setEvent] = useState<EventSummaryDto | null>(null);
  const [challenges, setChallenges] = useState<EventChallengeDto[]>([]);
  const [leaderboard, setLeaderboard] = useState<{
    scope: EventLeaderboardScope;
    entries: EventLeaderboardEntryDto[];
    me: { rank: number | null; score: number } | null;
  }>({ scope: 'participants', entries: [], me: null });
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
        setLeaderboard({ scope: board.scope, entries: board.entries, me: board.me });
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
      setError(err instanceof Error ? err.message : 'Failed to load event');
    } finally {
      setLoading(false);
    }
  }, [eventId, loadChallenges, loadLeaderboard, leaderboard.scope]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onToggleJoin = useCallback(async () => {
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
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  }, [busy, event, load]);

  const isAuthenticated = authStatus === 'authenticated';
  const solvedCount = challenges.filter((c) => c.solvedByMe).length;

  return (
    <ScreenShell title="Event">
      {loading && !event ? (
        <ActivityIndicator style={{ marginTop: Spacing.five }} />
      ) : error && !event ? (
        <Pressable onPress={() => void load()}>
          <ThemedText type="small" style={{ color: '#dc2626' }}>
            {error} — tap to retry
          </ThemedText>
        </Pressable>
      ) : event ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="subtitle">{event.title}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {statusText(event)} · {event.participantCount} participants · {event.joinedByMe ? 'Joined' : 'Not joined'}
          </ThemedText>

          {event.description ? (
            <ThemedView
              type="backgroundElement"
              style={[styles.markdownBox, { backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }]}
            >
              <Markdown style={markdownTheme}>{event.description}</Markdown>
            </ThemedView>
          ) : null}

          {isAuthenticated && event.status !== 'ENDED' ? (
            <Pressable
              disabled={busy || event.status === 'DRAFT'}
              onPress={() => void onToggleJoin()}
              style={({ pressed }) => [
                styles.joinButton,
                event.joinedByMe ? styles.joinJoined : styles.joinFab,
                busy && styles.pressed,
                pressed && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <ThemedText style={{ color: '#ffffff', fontWeight: '600' }}>
                  {event.joinedByMe ? 'Leave event' : 'Join event'}
                </ThemedText>
              )}
            </Pressable>
          ) : null}

          {event.joinedByMe ? (
            <ThemedView type="backgroundElement" style={styles.sectionCard}>
              <ThemedView style={styles.sectionHeader}>
                <ThemedText type="smallBold">My Team</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {solvedCount}/{challenges.length} solved
                </ThemedText>
              </ThemedView>
              <Link href="/teams" asChild>
                <Pressable style={({ pressed }) => [styles.teamLink, pressed && styles.pressed]}>
                  <ThemedText type="small" style={{ color: '#2563eb', fontWeight: '600' }}>
                    Manage team →
                  </ThemedText>
                </Pressable>
              </Link>
            </ThemedView>
          ) : null}

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Challenges</ThemedText>
            {challenges.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {event.joinedByMe ? 'No challenges in this event yet.' : 'Join the event to see its challenges.'}
              </ThemedText>
            ) : (
              challenges.map((item) =>
                item.locked ? (
                  <ThemedView key={item.id} type="backgroundElement" style={[styles.challengeRow, styles.lockedRow]}>
                    <ThemedView style={styles.challengeBody}>
                      <ThemedText type="smallBold" themeColor="textSecondary" numberOfLines={1}>
                        {item.title}
                      </ThemedText>
                      <ThemedText type="small" style={{ color: '#9ca3af' }}>
                        🔒 {LOCKED_LABELS[item.lockedReason ?? ''] ?? 'Locked'}
                      </ThemedText>
                    </ThemedView>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      {item.basePoints} pts
                    </ThemedText>
                  </ThemedView>
                ) : (
                  <Link
                    key={item.id}
                    href={`/challenge/${item.challengeId}?event=${event.id}`}
                    asChild
                  >
                    <Pressable style={({ pressed }) => [styles.challengeRow, pressed && styles.pressed]}>
                      <ThemedView style={styles.challengeBody}>
                        <ThemedText type="smallBold" numberOfLines={1}>
                          {item.title}
                        </ThemedText>
                        <ThemedView style={styles.challengeMeta}>
                          <ThemedView
                            style={[
                              styles.dot,
                              { backgroundColor: difficultyColor(item.difficulty) },
                            ]}
                          />
                          {item.solvedByMe ? (
                            <ThemedText type="small" style={{ color: '#16a34a' }}>
                              Solved ✓
                            </ThemedText>
                          ) : (
                            <ThemedText type="small" themeColor="textSecondary">
                              {item.solvedCount} solves
                            </ThemedText>
                          )}
                        </ThemedView>
                      </ThemedView>
                      <ThemedText type="smallBold">{item.basePoints} pts</ThemedText>
                    </Pressable>
                  </Link>
                ),
              )
            )}
          </ThemedView>

          {event.joinedByMe && event.status === 'RUNNING' ? (
            <ThemedView style={styles.section}>
              <ThemedView style={styles.sectionHeader}>
                <ThemedText type="smallBold">Leaderboard</ThemedText>
                <ThemedView style={styles.chips}>
                  {(['participants', 'teams'] as const).map((scope) => {
                    const active = leaderboard.scope === scope;
                    return (
                      <Pressable
                        key={scope}
                        onPress={() => void loadLeaderboard(event.id, scope)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <ThemedText
                          type="small"
                          style={{ color: active ? '#ffffff' : undefined, fontWeight: '600' }}
                        >
                          {scope === 'participants' ? 'People' : 'Teams'}
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
                  <ThemedView
                    key={`${leaderboard.scope}-${entry.id}`}
                    type="backgroundElement"
                    style={[
                      styles.leaderboardRow,
                      leaderboard.me?.rank === entry.rank && styles.entryMe,
                    ]}
                  >
                    <ThemedText style={styles.rankCell}>{entry.rank}</ThemedText>
                    <ThemedText numberOfLines={1} style={styles.nameCell}>
                      {entry.name}
                    </ThemedText>
                    <ThemedText type="smallBold">{entry.score}</ThemedText>
                  </ThemedView>
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
    borderRadius: 12,
    padding: Spacing.three,
    overflow: 'hidden',
  },
  joinButton: {
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  joinFab: {
    backgroundColor: '#2563eb',
  },
  joinJoined: {
    backgroundColor: '#dc2626',
  },
  sectionCard: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  teamLink: {
    alignSelf: 'flex-start',
  },
  section: {
    gap: Spacing.two,
  },
  challengeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  lockedRow: {
    opacity: 0.8,
  },
  challengeBody: {
    flex: 1,
    gap: Spacing.one,
  },
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chips: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 999,
  },
  chipActive: {
    backgroundColor: '#2563eb',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  entryMe: {
    borderWidth: 1,
    borderColor: '#2563eb',
  },
  rankCell: {
    minWidth: 28,
    fontWeight: '700',
  },
  nameCell: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});