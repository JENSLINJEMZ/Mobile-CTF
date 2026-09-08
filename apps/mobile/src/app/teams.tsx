import type { TeamDetailDto } from "@ctf/shared";
import { TEAM } from "@ctf/shared";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
} from "react-native";

import { ErrorState, LoadingState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { GlassSurface } from "@/components/glass-surface";
import { GlassInput } from "@/components/glass-input";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing, TouchTarget } from "@/constants/theme";
import {
  createTeam,
  deleteTeam,
  getMyTeam,
  joinTeam,
  removeMember,
  updateMemberRole,
} from "@/services/teams";
import { useAuthStore } from "@/store/auth-store";
import { useTheme } from "@/hooks/use-theme";

export default function TeamsScreen() {
  const theme = useTheme();
  const currentUser = useAuthStore((s) => s.user);

  const [team, setTeam] = useState<TeamDetailDto | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [actionUserId, setActionUserId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await getMyTeam();
      setTeam(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        await action();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusy(false);
      }
    },
    [busy],
  );

  const onCreate = useCallback(() => {
    if (name.trim().length === 0) return;
    void run(async () => {
      await createTeam({
        name: name.trim(),
        tagline: tagline.trim() || undefined,
      });
      setName("");
      setTagline("");
      await load();
    });
  }, [name, tagline, run, load]);

  const onJoin = useCallback(() => {
    if (joinCode.trim().length === 0) return;
    void run(async () => {
      await joinTeam({ joinCode: joinCode.trim() });
      setJoinCode("");
      await load();
    });
  }, [joinCode, run, load]);

  const onDissolve = useCallback(() => {
    if (!team) return;
    Alert.alert(
      "Dissolve team?",
      `This permanently dissolves "${team.name}". This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Dissolve",
          style: "destructive",
          onPress: () =>
            void run(async () => {
              await deleteTeam(team.id);
              setTeam(null);
            }),
        },
      ],
    );
  }, [team, run]);

  const onRemoveMember = useCallback(
    (memberId: number, username: string) => {
      Alert.alert(
        "Remove member?",
        `${username} will be removed from the team and can rejoin with the join code.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => {
              if (!team) return;
              setActionUserId(memberId);
              void run(async () => {
                await removeMember(team.id, memberId);
                void load();
              }).finally(() => setActionUserId(null));
            },
          },
        ],
      );
    },
    [team, run, load],
  );

  const myRole = team?.myRole ?? null;
  const isLeader = myRole === "LEADER";

  return (
    <ScreenShell title="My Team">
      {team === undefined ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : team ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <GlassSurface radius={Radius.lg} style={styles.card}>
            <ThemedView style={styles.teamHeader}>
              <ThemedView style={styles.teamTitle}>
                <ThemedText type="subtitle">{team.name}</ThemedText>
                {team.description ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {team.description}
                  </ThemedText>
                ) : null}
              </ThemedView>
              <ThemedText type="metric" style={[styles.countBadge, { backgroundColor: theme.accent }]}>
                {team.memberCount}/{TEAM.MAX_MEMBERS}
              </ThemedText>
            </ThemedView>

            {team.joinCode ? (
              <ThemedText type="small" themeColor="textSecondary">
                Join code: <ThemedText type="code">{team.joinCode}</ThemedText>{" "}
                — friends can join with this.
              </ThemedText>
            ) : null}

            <ThemedView style={styles.memberList}>
              {team.members.map((member) => {
                const isMe = member.userId === currentUser?.id;
                return (
                  <ThemedView key={member.userId} style={styles.memberRow}>
                    <ThemedView style={styles.memberName}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {member.username}
                        {isMe ? " (you)" : ""}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {member.role === "LEADER" ? "Leader" : "Member"}
                      </ThemedText>
                    </ThemedView>
                    {isLeader && !isMe ? (
                      <ThemedView style={styles.memberActions}>
                        <Pressable
                          disabled={busy || actionUserId === member.userId}
                          onPress={() => {
                            setActionUserId(member.userId);
                            void run(async () => {
                              await updateMemberRole(
                                team.id,
                                member.userId,
                                member.role === "LEADER" ? "MEMBER" : "LEADER",
                              );
                              await load();
                            }).finally(() => setActionUserId(null));
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`${member.role === "LEADER" ? "Demote" : "Promote"} ${member.username}`}
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            { backgroundColor: theme.accentSubtle },
                            pressed && styles.pressed,
                          ]}
                        >
                          {busy && actionUserId === member.userId ? (
                            <ActivityIndicator size="small" />
                          ) : (
                            <ThemedText
                              type="small"
                              style={{ fontWeight: "600", color: theme.accent }}
                            >
                              {member.role === "LEADER" ? "Demote" : "Promote"}
                            </ThemedText>
                          )}
                        </Pressable>
                        <Pressable
                          disabled={busy || member.role === "LEADER"}
                          onPress={() => onRemoveMember(member.userId, member.username)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${member.username} from team`}
                          accessibilityHint="Prompts for confirmation first"
                          style={({ pressed }) => [
                            styles.removeButton,
                            { backgroundColor: theme.dangerSubtle },
                            (busy || member.role === "LEADER") &&
                              styles.disabled,
                            pressed && !busy && member.role !== "LEADER" &&
                              styles.pressed,
                          ]}
                        >
                          <ThemedText
                            type="small"
                            style={{ color: theme.dangerStrong, fontWeight: "600" }}
                          >
                            Remove
                          </ThemedText>
                        </Pressable>
                      </ThemedView>
                    ) : null}
                  </ThemedView>
                );
              })}
            </ThemedView>

            {isLeader ? (
              <Pressable
                disabled={busy}
                onPress={() => void onDissolve()}
                accessibilityRole="button"
                accessibilityLabel="Dissolve team"
                accessibilityHint="Prompts for confirmation first"
                style={({ pressed }) => [
                  styles.dissolveButton,
                  busy && styles.disabled,
                  pressed && !busy && styles.pressed,
                ]}
              >
                <ThemedText
                  type="small"
                  style={{ color: theme.dangerStrong, fontWeight: "600" }}
                >
                  Dissolve team
                </ThemedText>
              </Pressable>
            ) : null}
          </GlassSurface>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <GlassSurface radius={Radius.lg} style={styles.card}>
            <ThemedText type="smallBold">Create a team</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Teams have up to {TEAM.MAX_MEMBERS} members, and let you compete
              in events.
            </ThemedText>
            <GlassInput
              value={name}
              onChangeText={setName}
              placeholder="Team name"
              accessibilityLabel="Team name"
            />
            <GlassInput
              value={tagline}
              onChangeText={setTagline}
              placeholder="Tagline (optional)"
              accessibilityLabel="Team tagline"
            />
            <Pressable
              disabled={busy || name.trim().length === 0}
              onPress={() => void onCreate()}
              accessibilityRole="button"
              accessibilityLabel="Create team"
              accessibilityState={{ disabled: busy || name.trim().length === 0 }}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.accent },
                (busy || name.trim().length === 0) && styles.disabled,
                pressed && !busy && name.trim().length > 0 && styles.pressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <ThemedText style={{ color: "#ffffff", fontWeight: "600" }}>
                  Create team
                </ThemedText>
              )}
            </Pressable>
          </GlassSurface>

          <GlassSurface radius={Radius.lg} style={styles.card}>
            <ThemedText type="smallBold">Join with a code</ThemedText>
            <GlassInput
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="6-character code"
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Join code"
            />
            <Pressable
              disabled={busy || joinCode.trim().length === 0}
              onPress={() => void onJoin()}
              accessibilityRole="button"
              accessibilityLabel="Join team with code"
              accessibilityState={{ disabled: busy || joinCode.trim().length === 0 }}
              style={({ pressed }) => [
                styles.secondaryFullButton,
                { borderColor: theme.accent },
                (busy || joinCode.trim().length === 0) && styles.disabled,
                pressed && !busy && joinCode.trim().length > 0 && styles.pressed,
              ]}
            >
              <ThemedText style={{ color: theme.accent, fontWeight: "600" }}>
                Join team
              </ThemedText>
            </Pressable>
          </GlassSurface>
        </ScrollView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: Spacing.three,
    paddingBottom: Spacing.four,
  },
  card: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  teamTitle: {
    flex: 1,
    gap: Spacing.one,
  },
  countBadge: {
    color: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    overflow: "hidden",
  },
  memberList: {
    gap: Spacing.two,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  memberName: {
    flex: 1,
    gap: Spacing.half,
  },
  memberActions: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  secondaryButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 8,
    minHeight: TouchTarget.Android,
    justifyContent: "center",
  },
  removeButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 8,
    minHeight: TouchTarget.Android,
    justifyContent: "center",
  },
  dissolveButton: {
    alignSelf: "flex-start",
    minHeight: TouchTarget.Android,
    justifyContent: "center",
    paddingVertical: Spacing.one,
  },
  primaryButton: {
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TouchTarget.Android,
    paddingVertical: Spacing.three,
  },
  secondaryFullButton: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TouchTarget.Android,
    paddingVertical: Spacing.three,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
});
