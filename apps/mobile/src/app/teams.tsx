import type { TeamDetailDto } from "@ctf/shared";
import { TEAM } from "@ctf/shared";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useColorScheme,
} from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import {
  createTeam,
  deleteTeam,
  getMyTeam,
  joinTeam,
  removeMember,
  updateMemberRole,
} from "@/services/teams";
import { useAuthStore } from "@/store/auth-store";

export default function TeamsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const currentUser = useAuthStore((s) => s.user);
  const surface = isDark ? "#1f2937" : "#f3f4f6";

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
    void run(async () => {
      await deleteTeam(team.id);
      setTeam(null);
    });
  }, [team, run]);

  const myRole = team?.myRole ?? null;
  const isLeader = myRole === "LEADER";

  return (
    <ScreenShell title="My Team">
      {team === undefined ? (
        <ActivityIndicator style={{ marginTop: Spacing.five }} />
      ) : error ? (
        <Pressable onPress={() => void load()}>
          <ThemedText type="small" style={{ color: "#dc2626" }}>
            {error} — tap to retry
          </ThemedText>
        </Pressable>
      ) : team ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedView style={styles.teamHeader}>
              <ThemedView style={styles.teamTitle}>
                <ThemedText type="subtitle">{team.name}</ThemedText>
                {team.description ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    {team.description}
                  </ThemedText>
                ) : null}
              </ThemedView>
              <ThemedText type="smallBold" style={styles.countBadge}>
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
                          style={({ pressed }) => [
                            styles.secondaryButton,
                            pressed && styles.pressed,
                          ]}
                        >
                          {busy && actionUserId === member.userId ? (
                            <ActivityIndicator size="small" />
                          ) : (
                            <ThemedText
                              type="small"
                              style={{ fontWeight: "600" }}
                            >
                              {member.role === "LEADER" ? "Demote" : "Promote"}
                            </ThemedText>
                          )}
                        </Pressable>
                        <Pressable
                          disabled={busy || member.role === "LEADER"}
                          onPress={() => {
                            setActionUserId(member.userId);
                            void run(async () => {
                              await removeMember(team.id, member.userId);
                              void load();
                            }).finally(() => setActionUserId(null));
                          }}
                          style={({ pressed }) => [
                            styles.removeButton,
                            (busy || member.role === "LEADER") &&
                              styles.pressed,
                            pressed && styles.pressed,
                          ]}
                        >
                          <ThemedText
                            type="small"
                            style={{ color: "#b91c1c", fontWeight: "600" }}
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
                style={({ pressed }) => [
                  styles.dissolveButton,
                  busy && styles.pressed,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="small"
                  style={{ color: "#b91c1c", fontWeight: "600" }}
                >
                  Dissolve team
                </ThemedText>
              </Pressable>
            ) : null}
          </ThemedView>
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Create a team</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Teams have up to {TEAM.MAX_MEMBERS} members, and let you compete
              in events.
            </ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Team name"
              placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
              style={[styles.input, { backgroundColor: surface }]}
            />
            <TextInput
              value={tagline}
              onChangeText={setTagline}
              placeholder="Tagline (optional)"
              placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
              style={[styles.input, { backgroundColor: surface }]}
            />
            <Pressable
              disabled={busy || name.trim().length === 0}
              onPress={() => void onCreate()}
              style={({ pressed }) => [
                styles.primaryButton,
                (busy || name.trim().length === 0) && styles.pressed,
                pressed && styles.pressed,
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
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">Join with a code</ThemedText>
            <TextInput
              value={joinCode}
              onChangeText={setJoinCode}
              placeholder="6-character code"
              placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
              style={[styles.input, { backgroundColor: surface }]}
              autoCapitalize="characters"
              autoCorrect={false}
            />
            <Pressable
              disabled={busy || joinCode.trim().length === 0}
              onPress={() => void onJoin()}
              style={({ pressed }) => [
                styles.secondaryFullButton,
                (busy || joinCode.trim().length === 0) && styles.pressed,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={{ color: "#2563eb", fontWeight: "600" }}>
                Join team
              </ThemedText>
            </Pressable>
          </ThemedView>
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
    backgroundColor: "#2563eb",
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
    backgroundColor: "rgba(37, 99, 235, 0.1)",
  },
  removeButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: 8,
    backgroundColor: "rgba(220, 38, 38, 0.1)",
  },
  dissolveButton: {
    alignSelf: "flex-start",
    paddingVertical: Spacing.one,
  },
  input: {
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: Spacing.three,
  },
  secondaryFullButton: {
    borderWidth: 1,
    borderColor: "#2563eb",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: Spacing.three,
  },
  pressed: {
    opacity: 0.6,
  },
});
