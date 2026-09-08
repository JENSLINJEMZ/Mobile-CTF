import type { ChallengeDetailDto, SubmitFlagResponse } from "@ctf/shared";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  type TextStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";

import { OfflineBanner } from "@/components/offline-banner";
import { ErrorState, LoadingState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { GlassInput } from "@/components/glass-input";
import { GlassSurface } from "@/components/glass-surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { difficultyColor, Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useNetwork } from "@/hooks/use-network";
import { addBookmark, removeBookmark } from "@/services/bookmarks";
import { getChallenge, unlockHint } from "@/services/challenges";
import {
  drainSubmissionQueue,
  pendingSubmissionCount,
  submitFlagViaGateway,
} from "@/services/offline-submissions";
import { useAuthGate } from "@/hooks/use-auth-gate";

function difficultyLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export default function ChallengeDetailScreen() {
  const { id, event } = useLocalSearchParams<{ id: string; event?: string }>();
  const challengeId = Number(id);
  const eventId = event ? Number(event) : undefined;
  const theme = useTheme();
  const { needsAuth } = useAuthGate();

  const markdownTheme = useMemo(
    () => ({
      body: {
        color: theme.text,
        fontSize: 16,
        lineHeight: 24,
      },
      heading1: {
        color: theme.text,
        fontSize: 24,
        fontWeight: "700" as TextStyle["fontWeight"],
        marginBottom: Spacing.two,
      },
      heading2: {
        color: theme.text,
        fontSize: 20,
        fontWeight: "700" as TextStyle["fontWeight"],
        marginTop: Spacing.three,
      },
      paragraph: { marginVertical: Spacing.one },
      code_inline: {
        backgroundColor: theme.surface,
        color: theme.accent,
        fontFamily: "monospace",
        fontSize: 14,
      },
      fence: {
        backgroundColor: theme.surface,
        padding: Spacing.three,
        borderRadius: 8,
      },
      code_block: {
        color: theme.accent,
        fontFamily: "monospace",
        fontSize: 13,
      },
      strong: { fontWeight: "700" as TextStyle["fontWeight"] },
    }),
    [theme],
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
      const outcome = await submitFlagViaGateway(challengeId, flag.trim(), eventId, isOnline);
      if (outcome.status === "queued") {
        setQueued(true);
        if (challenge?.solvedByMe) setFlag("");
        return;
      }
      setResult(outcome.response);
      if (outcome.response.correct) {
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
      await drainSubmissionQueue();
      const stillPending = await pendingSubmissionCount();
      setQueued(stillPending > 0);
      void load();
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
                  <ActivityIndicator size="small" color={theme.accent} />
                ) : (
                  <Ionicons
                    name={
                      challenge.bookmarkedByMe ? "bookmark" : "bookmark-outline"
                    }
                    size={24}
                    color={theme.accent}
                  />
                )}
              </Pressable>
            ) : null}
          </ThemedView>
          <ThemedView style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">
                {challenge.category.name} ·{" "}
                {difficultyLabel(challenge.difficulty)}
              </ThemedText>
              <ThemedText type="metric">
                {challenge.basePoints} pts
              </ThemedText>
            <ThemedView
              style={[
                styles.difficultyDot,
                { backgroundColor: difficultyColor(challenge.difficulty, theme) },
              ]}
            />
          </ThemedView>
          {challenge.solvedByMe ? (
            <ThemedText type="small" style={{ color: theme.success }}>
              Solved ✓ · {challenge.solvedCount} total solves
            </ThemedText>
          ) : null}

          <GlassSurface style={styles.markdownBox} radius={Radius.md}>
            <Markdown style={markdownTheme}>{challenge.description}</Markdown>
          </GlassSurface>

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
              <GlassSurface
                key={hint.id}
                radius={Radius.md}
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
                        { backgroundColor: theme.accent },
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
              </GlassSurface>
            ))}
            {needsAuth ? (
              <ThemedText type="small" themeColor="textSecondary">
                Sign in to unlock hints and submit flags.
              </ThemedText>
            ) : null}
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="smallBold">Submit flag</ThemedText>
            <GlassInput
              value={flag}
              onChangeText={setFlag}
              placeholder="ctf{...}"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!needsAuth}
              accessibilityLabel="Flag"
              accessibilityHint="Enter the flag for this challenge"
              spellCheck={false}
              style={styles.flagInput}
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
                { backgroundColor: theme.accent },
                (needsAuth || submitting || flag.trim().length === 0) &&
                  styles.unlockDisabled,
                pressed && styles.cardPressed,
              ]}
            >
              <ThemedView
                pointerEvents="none"
                style={[styles.buttonSpecular, { backgroundColor: theme.specular }]}
              />
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
                style={{ color: theme.warningStrong }}
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
                  {
                    backgroundColor: result.correct
                      ? theme.successSubtle
                      : theme.dangerSubtle,
                  },
                ]}
                accessibilityRole="alert"
                accessibilityLabel={`Flag ${result.correct ? "correct" : "incorrect"}. ${result.message}`}
              >
                <ThemedText
                  type="smallBold"
                  style={{
                    color: result.correct ? theme.successStrong : theme.dangerStrong,
                  }}
                >
                  {result.message}
                </ThemedText>
                <ThemedText
                  type="metric"
                  style={{
                    color: result.correct ? theme.successStrong : theme.dangerStrong,
                  }}
                >
                  Total score: {result.totalScore}
                </ThemedText>
                {result.correct && result.rank != null ? (
                  <ThemedText type="metric" style={{ color: theme.successStrong }}>
                    Global rank: #{result.rank}
                  </ThemedText>
                ) : null}
              </ThemedView>
            ) : null}

            {submitError ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
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
    minWidth: TouchTarget.Android,
    minHeight: TouchTarget.Android,
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: 10,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minWidth: 80,
    minHeight: TouchTarget.Android,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockDisabled: {
    opacity: 0.5,
  },
  resultBox: {
    borderRadius: Radius.md,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  flagInput: {
    fontFamily: "monospace",
  },
  submitButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.three,
    minHeight: TouchTarget.Android,
    borderRadius: Radius.md,
    overflow: "hidden",
  },
  buttonSpecular: {
    position: "absolute",
    top: 1,
    left: 1,
    right: 1,
    height: 1,
    opacity: 0.45,
  },
  cardPressed: {
    opacity: 0.85,
  },
});
