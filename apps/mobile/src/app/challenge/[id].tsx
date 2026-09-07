import type { ChallengeDetailDto, SubmitFlagResponse } from "@ctf/shared";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useColorScheme,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";

import { OfflineBanner } from "@/components/offline-banner";
import { ErrorState, LoadingState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useNetwork } from "@/hooks/use-network";
import { addBookmark, removeBookmark } from "@/services/bookmarks";
import { getChallenge, submitFlag, unlockHint } from "@/services/challenges";
import {
  enqueueSubmission,
  queueSize,
  type PendingSubmission,
} from "@/services/offline-queue";
import {
  loadSubmissionQueue,
  saveSubmissionQueue,
} from "@/services/queue-storage";
import { useAuthStore } from "@/store/auth-store";

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: "#16a34a",
  MEDIUM: "#d97706",
  HARD: "#dc2626",
  EXPERT: "#7c3aed",
};

function difficultyLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function ChallengeDetailScreen() {
  const { id, event } = useLocalSearchParams<{ id: string; event?: string }>();
  const challengeId = Number(id);
  const eventId = event ? Number(event) : undefined;
  const colorScheme = useColorScheme();
  const authStatus = useAuthStore((s) => s.status);

  const isDark = colorScheme === "dark";
  const surface = isDark ? "#1f2937" : "#f3f4f6";
  const markdownTheme = useMemo(
    () => ({
      body: {
        color: isDark ? "#f9fafb" : "#111827",
        fontSize: 16,
        lineHeight: 24,
      },
      heading1: {
        color: isDark ? "#ffffff" : "#111827",
        fontSize: 24,
        fontWeight: "700" as TextStyle["fontWeight"],
        marginBottom: Spacing.two,
        flexDirection: "row" as TextStyle["flexDirection"],
        justifyContent: "center" as TextStyle["justifyContent"],
      },
      heading2: {
        color: isDark ? "#ffffff" : "#111827",
        fontSize: 20,
        fontWeight: "700" as TextStyle["fontWeight"],
        marginTop: Spacing.three,
      },
      paragraph: { marginVertical: Spacing.one },
      code_inline: {
        backgroundColor: isDark ? "#111827" : "#e5e7eb",
        color: isDark ? "#a5f3fc" : "#1e3a8a",
        fontFamily: "monospace",
        fontSize: 14,
      },
      fence: {
        backgroundColor: isDark ? "#111827" : "#e5e7eb",
        padding: Spacing.three,
        borderRadius: 8,
      },
      code_block: {
        color: isDark ? "#a5f3fc" : "#1e3a8a",
        fontFamily: "monospace",
        fontSize: 13,
      },
      strong: { fontWeight: "700" as TextStyle["fontWeight"] },
    }),
    [isDark],
  );

  const [challenge, setChallenge] = useState<ChallengeDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [flag, setFlag] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitFlagResponse | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  const [unlockingId, setUnlockingId] = useState<number | null>(null);
  const [isBookmarking, setIsBookmarking] = useState(false);
  const isOnline = useNetwork();

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await getChallenge(challengeId, eventId);
      setChallenge(data);
      setResult(null);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load challenge",
      );
    } finally {
      setLoading(false);
    }
  }, [challengeId, eventId]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = useCallback(async () => {
    if (submitting || flag.trim().length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    setQueued(false);
    try {
      if (!isOnline) {
        const queuedItem: PendingSubmission = {
          idempotencyKey: `sub-${challengeId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          challengeId,
          flag: flag.trim(),
          eventId,
          queuedAt: new Date().toISOString(),
        };
        const queue = await loadSubmissionQueue();
        const next = enqueueSubmission(queue, queuedItem);
        await saveSubmissionQueue(next);
        setQueued(true);
        if (challenge?.solvedByMe) setFlag("");
        return;
      }
      const response = await submitFlag(challengeId, flag.trim(), eventId);
      setResult(response);
      if (response.correct) {
        setFlag("");
        void load();
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }, [
    challengeId,
    flag,
    submitting,
    load,
    eventId,
    isOnline,
    challenge?.solvedByMe,
  ]);

  useEffect(() => {
    if (!isOnline) return;
    void (async () => {
      const queue = await loadSubmissionQueue();
      const stillPending = queueSize(queue);
      if (stillPending > 0) {
        setQueued(true);
        void load();
      }
    })();
  }, [isOnline, load]);

  const onUnlockHint = useCallback(
    async (hintId: number) => {
      if (unlockingId !== null) return;
      const hint = challenge?.hints.find((h) => h.id === hintId);
      const confirm = () => {
        void (async () => {
          setUnlockingId(hintId);
          try {
            const { hint: unlocked } = await unlockHint(challengeId, hintId);
            setChallenge((prev) =>
              prev
                ? {
                    ...prev,
                    hints: prev.hints.map((h) =>
                      h.id === hintId
                        ? { ...h, unlocked: true, body: unlocked.body }
                        : h,
                    ),
                  }
                : prev,
            );
          } catch (err) {
            setSubmitError(
              err instanceof Error ? err.message : "Could not unlock hint",
            );
          } finally {
            setUnlockingId(null);
          }
        })();
      };
      if (hint && hint.penaltyPoints > 0) {
        Alert.alert(
          "Unlock this hint?",
          `This costs ${hint.penaltyPoints} points and can't be undone.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Unlock", style: "destructive", onPress: confirm },
          ],
        );
      } else {
        confirm();
      }
    },
    [challengeId, unlockingId, challenge?.hints],
  );

  const onToggleBookmark = useCallback(async () => {
    if (isBookmarking || !challenge) return;
    setIsBookmarking(true);
    try {
      if (challenge.bookmarkedByMe) {
        await removeBookmark(challenge.id);
      } else {
        await addBookmark(challenge.id);
      }
      setChallenge((prev) =>
        prev ? { ...prev, bookmarkedByMe: !prev.bookmarkedByMe } : prev,
      );
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Could not update bookmark",
      );
    } finally {
      setIsBookmarking(false);
    }
  }, [challenge, isBookmarking]);

  const needsAuth = authStatus !== "authenticated";

  return (
    <ScreenShell title="Challenge">
      {loading && !challenge ? (
        <LoadingState />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={() => void load()} />
      ) : challenge ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <OfflineBanner />
          <ThemedView style={styles.titleRow}>
            <ThemedText type="subtitle" style={styles.titleText}>
              {challenge.title}
            </ThemedText>
            {!needsAuth ? (
              <Pressable
                disabled={isBookmarking}
                onPress={() => void onToggleBookmark()}
                accessibilityRole="button"
                accessibilityLabel={
                  challenge.bookmarkedByMe
                    ? "Remove bookmark"
                    : "Bookmark challenge"
                }
                accessibilityState={{ disabled: isBookmarking }}
                style={({ pressed }) => [
                  styles.bookmarkButton,
                  pressed && styles.cardPressed,
                ]}
              >
                {isBookmarking ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Ionicons
                    name={
                      challenge.bookmarkedByMe ? "bookmark" : "bookmark-outline"
                    }
                    size={24}
                    color="#2563eb"
                  />
                )}
              </Pressable>
            ) : null}
          </ThemedView>
          <ThemedView style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {challenge.category.name} ·{" "}
              {difficultyLabel(challenge.difficulty)} · {challenge.basePoints}{" "}
              pts
            </ThemedText>
            <ThemedView
              style={[
                styles.difficultyDot,
                { backgroundColor: DIFFICULTY_COLORS[challenge.difficulty] },
              ]}
            />
          </ThemedView>
          {challenge.solvedByMe ? (
            <ThemedText type="small" style={{ color: "#16a34a" }}>
              Solved ✓ · {challenge.solvedCount} total solves
            </ThemedText>
          ) : null}

          <ThemedView
            style={[styles.markdownBox, { backgroundColor: surface }]}
          >
            <Markdown style={markdownTheme}>{challenge.description}</Markdown>
          </ThemedView>

          {challenge.attachments.length > 0 ? (
            <ThemedView style={styles.section}>
              <ThemedText type="smallBold">Attachments</ThemedText>
              {challenge.attachments.map((attachment) => (
                <ThemedText
                  key={attachment.id}
                  type="code"
                  themeColor="textSecondary"
                >
                  {attachment.title} (
                  {Math.max(1, Math.round((attachment.sizeBytes ?? 0) / 1024))}{" "}
                  KB)
                </ThemedText>
              ))}
            </ThemedView>
          ) : null}

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Hints</ThemedText>
            {challenge.hints.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                No hints for this challenge.
              </ThemedText>
            ) : null}
            {challenge.hints.map((hint) => (
              <ThemedView
                key={hint.id}
                type="backgroundElement"
                style={styles.hintCard}
              >
                {hint.unlocked ? (
                  <>
                    <ThemedText type="smallBold">{hint.title}</ThemedText>
                    <Markdown style={markdownTheme}>{hint.body ?? ""}</Markdown>
                  </>
                ) : (
                  <ThemedView style={styles.hintRow}>
                    <ThemedView style={styles.hintLockedText}>
                      <ThemedText type="smallBold">{hint.title}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {hint.penaltyPoints > 0
                          ? `Costs ${hint.penaltyPoints} pts`
                          : "Free to unlock"}
                      </ThemedText>
                    </ThemedView>
                    <Pressable
                      disabled={needsAuth || unlockingId !== null}
                      onPress={() => void onUnlockHint(hint.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Unlock hint ${hint.title}${hint.penaltyPoints > 0 ? ` for ${hint.penaltyPoints} points` : ""}`}
                      accessibilityState={{
                        disabled: needsAuth || unlockingId !== null,
                      }}
                      style={({ pressed }) => [
                        styles.unlockButton,
                        (needsAuth || unlockingId !== null) &&
                          styles.unlockDisabled,
                        pressed && styles.cardPressed,
                      ]}
                    >
                      {unlockingId === hint.id ? (
                        <ActivityIndicator color="#ffffff" size="small" />
                      ) : (
                        <ThemedText
                          type="small"
                          style={{ color: "#ffffff", fontWeight: "600" }}
                        >
                          Unlock
                        </ThemedText>
                      )}
                    </Pressable>
                  </ThemedView>
                )}
              </ThemedView>
            ))}
            {needsAuth ? (
              <ThemedText type="small" themeColor="textSecondary">
                Sign in to unlock hints and submit flags.
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Submit flag</ThemedText>
            <TextInput
              value={flag}
              onChangeText={setFlag}
              placeholder="ctf{...}"
              placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
              style={[styles.flagInput, { backgroundColor: surface }]}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!needsAuth}
              accessibilityLabel="Flag"
              accessibilityHint="Enter the flag for this challenge"
            />
            <Pressable
              disabled={needsAuth || submitting || flag.trim().length === 0}
              onPress={() => void onSubmit()}
              accessibilityRole="button"
              accessibilityLabel="Submit flag"
              accessibilityState={{
                disabled: needsAuth || submitting || flag.trim().length === 0,
              }}
              style={({ pressed }) => [
                styles.submitButton,
                (needsAuth || submitting || flag.trim().length === 0) &&
                  styles.unlockDisabled,
                pressed && styles.cardPressed,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <ThemedText style={{ color: "#ffffff", fontWeight: "600" }}>
                  Submit
                </ThemedText>
              )}
            </Pressable>

            {queued ? (
              <ThemedText
                type="smallBold"
                style={{ color: "#b45309" }}
                accessibilityRole="alert"
              >
                Flag queued — it will be submitted automatically when
                you&apos;re back online.
              </ThemedText>
            ) : null}

            {result ? (
              <ThemedView
                style={[
                  styles.resultBox,
                  { backgroundColor: result.correct ? "#dcfce7" : "#fee2e2" },
                ]}
                accessibilityRole="alert"
                accessibilityLabel={`Flag ${result.correct ? "correct" : "incorrect"}. ${result.message}`}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: result.correct ? "#15803d" : "#b91c1c" }}
                >
                  {result.message}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{ color: result.correct ? "#166534" : "#991b1b" }}
                >
                  Total score: {result.totalScore}
                </ThemedText>
                {result.correct && result.rank != null ? (
                  <ThemedText type="small" style={{ color: "#166534" }}>
                    Global rank: #{result.rank}
                  </ThemedText>
                ) : null}
              </ThemedView>
            ) : null}

            {submitError ? (
              <ThemedText type="small" style={{ color: "#dc2626" }}>
                {submitError}
              </ThemedText>
            ) : null}
          </ThemedView>
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
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  titleText: {
    flex: 1,
  },
  bookmarkButton: {
    padding: Spacing.one,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  difficultyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  markdownBox: {
    borderRadius: 12,
    padding: Spacing.three,
    overflow: "hidden",
  },
  section: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  hintCard: {
    borderRadius: 12,
    padding: Spacing.three,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  hintLockedText: {
    flex: 1,
    gap: Spacing.half,
  },
  unlockButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minWidth: 80,
    alignItems: "center",
  },
  unlockDisabled: {
    opacity: 0.5,
  },
  flagInput: {
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    fontSize: 15,
    fontFamily: "monospace",
  },
  submitButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: Spacing.three,
  },
  cardPressed: {
    opacity: 0.85,
  },
  resultBox: {
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.half,
  },
});
