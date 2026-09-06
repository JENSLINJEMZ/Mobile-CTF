import type { LeaderboardResponse, LeaderboardScope } from "@ctf/shared";
import { LEADERBOARD } from "@ctf/shared";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { getLeaderboard } from "@/services/leaderboard";
import {
  connectLeaderboardSocket,
  disconnectLeaderboardSocket,
  subscribeLeaderboardUpdate,
} from "@/services/socket";
import { useAuthStore } from "@/store/auth-store";

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
  const authStatus = useAuthStore((s) => s.status);
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

  const isAuthenticated = authStatus === "authenticated";
  const entries = data?.entries ?? [];
  const me = data?.me ?? null;

  return (
    <ScreenShell title="Leaderboard">
      {!isAuthenticated ? (
        <ThemedView type="backgroundElement" style={styles.promptCard}>
          <ThemedText type="small">
            Live rankings update over WebSockets.
          </ThemedText>
          <Link href="/auth/login" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.signInButton,
                pressed && styles.cardPressed,
              ]}
            >
              <ThemedText style={styles.signInLabel}>
                Sign in for live updates
              </ThemedText>
            </Pressable>
          </Link>
        </ThemedView>
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
              style={({ pressed }) => [
                styles.chip,
                active && styles.chipActive,
                pressed && styles.cardPressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: active ? "#ffffff" : undefined }}
              >
                {SCOPE_LABELS[value]}
              </ThemedText>
            </Pressable>
          );
        })}
      </ThemedView>

      {me != null ? (
        <ThemedView type="backgroundElement" style={styles.scoreCard}>
          <ThemedText type="smallBold">
            {me.rank != null ? `You are #${me.rank}` : "Unranked"}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {me.score} points · {me.solves} solves
          </ThemedText>
        </ThemedView>
      ) : currentUser ? (
        <ThemedView type="backgroundElement" style={styles.scoreCard}>
          <ThemedText type="smallBold">You have no points yet</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Solve a challenge to appear on the board.
          </ThemedText>
        </ThemedView>
      ) : null}

      {loading && !data ? (
        <ActivityIndicator style={{ marginTop: Spacing.four }} />
      ) : null}

      {error ? (
        <Pressable onPress={() => void load(scope)}>
          <ThemedText type="small" style={{ color: "#dc2626" }}>
            {error} — tap to retry
          </ThemedText>
        </Pressable>
      ) : null}

      {!loading && data && entries.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No scores yet. Be the first to solve a challenge!
        </ThemedText>
      ) : null}

      <ScrollView contentContainerStyle={styles.listContent}>
        {entries.map((entry) => {
          const medal = MEDAL_COLORS[entry.rank];
          const isMe = entry.userId === currentUser?.id;
          return (
            <ThemedView
              key={entry.userId}
              type="backgroundElement"
              style={[styles.row, isMe && styles.rowMe]}
            >
              <ThemedText
                style={[
                  styles.rankCell,
                  medal ? { color: medal } : styles.rankPlain,
                ]}
              >
                {entry.rank}
              </ThemedText>
              <ThemedText numberOfLines={1} style={styles.usernameCell}>
                {entry.username}
              </ThemedText>
              <ThemedText type="smallBold">{entry.score}</ThemedText>
            </ThemedView>
          );
        })}
      </ScrollView>

      <Pressable
        onPress={() => void load(scope)}
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
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  signInButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: Spacing.two,
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
    paddingVertical: Spacing.two,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  chipActive: {
    backgroundColor: "#2563eb",
  },
  scoreCard: {
    width: "100%",
    borderRadius: 12,
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
    borderRadius: 12,
    paddingVertical: Spacing.two + Spacing.half,
    paddingHorizontal: Spacing.three,
  },
  rowMe: {
    borderWidth: 1,
    borderColor: "#2563eb",
  },
  rankCell: {
    minWidth: 28,
    fontWeight: "700",
  },
  rankPlain: {
    color: undefined,
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
