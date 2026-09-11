import type { LeaderboardResponse, LeaderboardScope } from "@ctf/shared";
import { LEADERBOARD } from "@ctf/shared";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";

import { SegmentedControl } from "@/components/segmented-control";
import { Skeleton } from "@/components/skeleton";
import { EmptyState, ErrorState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { Surface } from "@/components/surface";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, TouchTarget } from "@/constants/theme";
import { getLeaderboard } from "@/services/leaderboard";
import {
  connectLeaderboardSocket,
  disconnectLeaderboardSocket,
  subscribeLeaderboardUpdate,
} from "@/services/socket";
import { useAuthStore } from "@/store/auth-store";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useTheme } from "@/hooks/use-theme";

const SCOPE_LABELS: Record<LeaderboardScope, string> = {
  global: "Global",
  daily: "Daily",
  weekly: "Weekly",
};

export default function LeaderboardScreen() {
  const theme = useTheme();
  const { isAuthenticated } = useAuthGate();
  const currentUser = useAuthStore((s) => s.user);

  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (targetScope: LeaderboardScope) => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await getLeaderboard(targetScope, 50);
      if (requestId === requestRef.current) {
        setData(result);
      }
    } catch (err) {
      if (requestId === requestRef.current) {
        setError(
          err instanceof Error ? err.message : "Failed to load leaderboard",
        );
      }
    } finally {
      if (requestId === requestRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(scope);
  }, [scope, load]);

  useFocusEffect(
    useCallback(() => {
      void connectLeaderboardSocket().catch(() => undefined);
      const unsubscribe = subscribeLeaderboardUpdate(() => {
        void load(scope);
      });
      return () => {
        unsubscribe();
        disconnectLeaderboardSocket();
      };
    }, [scope, load]),
  );

  const entries = data?.entries ?? [];
  const me = data?.me ?? null;

  return (
    <ScreenShell title="Leaderboard">
      {!isAuthenticated ? (
        <Surface radius={Radius.md} style={styles.promptCard}>
          <ThemedText type="small">
            Live rankings update over WebSockets.
          </ThemedText>
          <Link href="/auth/login" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in for live updates"
              style={({ pressed }) => [
                styles.signInButton,
                { backgroundColor: theme.accent },
                pressed && styles.cardPressed,
              ]}
            >
              <ThemedText style={[styles.signInLabel, { color: theme.onAccent }]}>
                Sign in for live updates
              </ThemedText>
            </Pressable>
          </Link>
        </Surface>
      ) : null}

      <SegmentedControl<LeaderboardScope>
        accessibilityLabel="Leaderboard scope"
        value={scope}
        onChange={setScope}
        options={LEADERBOARD.SCOPES.map((value) => ({
          value,
          label: SCOPE_LABELS[value],
        }))}
      />

      {me != null ? (
        <Surface radius={Radius.md} style={styles.scoreCard} variant="selected">
          <ThemedText type="smallBold">
            {me.rank != null ? `You are #${me.rank}` : "Unranked"}
          </ThemedText>
          <ThemedText type="metric" themeColor="textSecondary">
            {me.score} points · {me.solves} solves
          </ThemedText>
        </Surface>
      ) : currentUser ? (
        <Surface radius={Radius.md} style={styles.scoreCard}>
          <ThemedText type="smallBold">You have no points yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Solve a challenge to appear on the board.
          </ThemedText>
        </Surface>
      ) : null}

      {loading && !data ? <Skeleton count={6} height={56} /> : null}

      {error ? (
        <ErrorState message={error} onRetry={() => void load(scope)} />
      ) : null}

      {!loading && data && entries.length === 0 ? (
        <EmptyState message="No scores yet. Be the first to solve a challenge!" />
      ) : null}

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={loading && !!data}
            onRefresh={() => void load(scope)}
            tintColor={theme.accent}
          />
        }
      >
        {entries.map((entry) => {
          const medal =
            entry.rank === 1
              ? theme.medalGold
              : entry.rank === 2
                ? theme.medalSilver
                : entry.rank === 3
                  ? theme.medalBronze
                  : undefined;
          const isMe = entry.userId === currentUser?.id;
          return (
            <Surface
              key={entry.userId}
              radius={Radius.md}
              variant={isMe ? "selected" : "elevated"}
              style={[
                styles.row,
                isMe && [styles.rowMe, { borderColor: theme.accent }],
              ]}
            >
              <ThemedText
                type="metric"
                style={[
                  styles.rankCell,
                  medal && { color: medal },
                ]}
              >
                {entry.rank}
              </ThemedText>
              <ThemedText numberOfLines={1} style={styles.usernameCell}>
                {entry.username}
              </ThemedText>
              <ThemedText type="metric">{entry.score}</ThemedText>
            </Surface>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => void load(scope)}
        accessibilityRole="button"
        accessibilityLabel="Refresh leaderboard"
        style={({ pressed }) => [styles.refresh, pressed && styles.cardPressed]}
      >
        <ThemedText type="small" themeColor="textSecondary">
          Refresh
        </ThemedText>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  promptCard: {
    width: "100%",
    padding: Spacing.three,
    gap: Spacing.two,
  },
  signInButton: {
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.Android,
    justifyContent: "center",
  },
  signInLabel: {
    fontWeight: "600",
  },
  scoreCard: {
    width: "100%",
    padding: Spacing.three,
    gap: Spacing.half,
  },
  listContent: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    paddingHorizontal: Spacing.three,
  },
  rowMe: {
    borderWidth: 1,
  },
  rankCell: {
    minWidth: 28,
  },
  usernameCell: {
    flex: 1,
  },
  refresh: {
    alignSelf: "center",
    paddingVertical: Spacing.one,
  },
  cardPressed: {
    opacity: 0.85,
  },
});
