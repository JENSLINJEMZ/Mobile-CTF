import type { LeaderboardResponse, LeaderboardScope } from "@ctf/shared";
import { LEADERBOARD } from "@ctf/shared";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";

import { EmptyState, ErrorState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { GlassSurface } from "@/components/glass-surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
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

const MEDAL_COLORS: Record<number, string> = {
  1: "#d4af37",
  2: "#b5b5bd",
  3: "#cd7f32",
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
        <GlassSurface radius={Radius.md} style={styles.promptCard}>
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
              <ThemedText style={styles.signInLabel}>
                Sign in for live updates
              </ThemedText>
            </Pressable>
          </Link>
        </GlassSurface>
      ) : null}

      <ThemedView style={styles.chips}>
        {LEADERBOARD.SCOPES.map((value) => {
          const active = value === scope;
          return (
            <Pressable
              key={value}
              onPress={() => {
                if (!active) {
                  setScope(value);
                  void load(value);
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Show ${SCOPE_LABELS[value]} leaderboard`}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.chip,
                active && [styles.chipActive, { backgroundColor: theme.accent }],
                !active && [
                  styles.chipIdle,
                  { backgroundColor: theme.glassSubtle, borderColor: theme.glassBorder },
                ],
                pressed && styles.cardPressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: active ? theme.onAccent : theme.text }}
              >
                {SCOPE_LABELS[value]}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>

      {me != null ? (
        <GlassSurface radius={Radius.md} style={styles.scoreCard} variant="strong">
          <ThemedText type="smallBold">
            {me.rank != null ? `You are #${me.rank}` : "Unranked"}
          </ThemedText>
          <ThemedText type="metric" themeColor="textSecondary">
            {me.score} points · {me.solves} solves
          </ThemedText>
        </GlassSurface>
      ) : currentUser ? (
        <GlassSurface radius={Radius.md} style={styles.scoreCard}>
          <ThemedText type="smallBold">You have no points yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Solve a challenge to appear on the board.
          </ThemedText>
        </GlassSurface>
      ) : null}

      {loading && !data ? (
        <ActivityIndicator style={{ marginTop: Spacing.four }} />
      ) : null}

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
          const medal = MEDAL_COLORS[entry.rank];
          const isMe = entry.userId === currentUser?.id;
          return (
            <GlassSurface
              key={entry.userId}
              radius={Radius.md}
              variant={isMe ? "strong" : "glass"}
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
            </GlassSurface>
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
    color: "#ffffff",
    fontWeight: "600",
  },
  chips: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  chipActive: {},
  chipIdle: {
    borderWidth: StyleSheet.hairlineWidth,
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
