import type { ChallengeDetailDto, SubmitFlagResponse } from "@ctf/shared";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";

import { OfflineBanner } from "@/components/offline-banner";
import { BottomSheet } from "@/components/bottom-sheet";
import { LucideIcon } from "@/components/lucide-icon";
import {
  C,
  categoryAccent,
  categoryIcon,
  difficultyLabel,
  withAlpha,
} from "@/constants/design";
import { useNetwork } from "@/hooks/use-network";
import { addBookmark, removeBookmark } from "@/services/bookmarks";
import { getChallenge, unlockHint } from "@/services/challenges";
import {
  drainSubmissionQueue,
  pendingSubmissionCount,
  submitFlagViaGateway,
} from "@/services/offline-submissions";
import { useAuthGate } from "@/hooks/use-auth-gate";

const DIFF_RAMP: Record<string, { colors: [string, string]; fg: string }> = {
  EASY: { colors: ["#22c55e", "#15803d"], fg: "#ffffff" },
  MEDIUM: { colors: ["#fbbf24", "#f59e0b"], fg: "#1a0f00" },
  HARD: { colors: ["#ef4444", "#b91c1c"], fg: "#ffffff" },
};

const TAG_TONES = ["blue", "purple", "pink", "cyan", "gold", "green"] as const;

const TAG_PALETTE = {
  blue: { color: "#93c5fd", bg: "rgba(59,130,246,.14)", line: "rgba(59,130,246,.28)" },
  purple: { color: "#c4b5fd", bg: "rgba(139,92,246,.14)", line: "rgba(139,92,246,.28)" },
  pink: { color: "#f9a8d4", bg: "rgba(236,72,153,.14)", line: "rgba(236,72,153,.28)" },
  cyan: { color: "#67e8f9", bg: "rgba(34,211,238,.14)", line: "rgba(34,211,238,.28)" },
  gold: { color: "#fcd34d", bg: "rgba(251,191,36,.14)", line: "rgba(251,191,36,.28)" },
  green: { color: "#86efac", bg: "rgba(34,197,94,.14)", line: "rgba(34,197,94,.28)" },
} as const;

export default function ChallengeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id, event } = useLocalSearchParams<{ id: string; event?: string }>();
  const challengeId = Number(id);
  const eventId = event ? Number(event) : undefined;
  const { needsAuth } = useAuthGate();

  const [confirmHint, setConfirmHint] = useState<{
    hintId: number;
    title: string;
    penaltyPoints: number;
  } | null>(null);
  const [expandedHints, setExpandedHints] = useState<Set<number>>(new Set());

  type TextStyleExtra = {
    backgroundColor?: string;
    color?: string;
    fontFamily?: string;
    fontSize?: number;
  };

  const markdownTheme = useMemo(() => {
    const code: TextStyleExtra = {
      backgroundColor: "rgba(255,255,255,.06)",
      color: "#a78bfa",
      fontFamily: "monospace",
      fontSize: 12,
    };
    return {
      body: {
        color: "rgba(226,222,245,.86)",
        fontSize: 13,
        lineHeight: 21,
      },
      heading1: {
        color: C.textPrimary,
        fontSize: 17,
        fontWeight: "800" as const,
        marginBottom: 8,
      },
      heading2: {
        color: C.textPrimary,
        fontSize: 14,
        fontWeight: "800" as const,
        marginTop: 12,
      },
      heading3: {
        color: C.textPrimary,
        fontSize: 12.5,
        fontWeight: "700" as const,
        marginTop: 8,
      },
      paragraph: { marginVertical: 6 },
      strong: { fontWeight: "700" as const, color: "#f2f0fb" },
      em: { fontStyle: "italic" as const },
      link: { color: "#60a5fa" },
      bullet_list_icon: { color: "#a78bfa", fontWeight: "800" as const },
      ordered_list_icon: { color: "#a78bfa", fontWeight: "800" as const },
      code_inline: code,
      fence: {
        backgroundColor: "rgba(11,10,22,.9)",
        borderWidth: 1,
        borderColor: C.border,
        padding: 12,
        borderRadius: 10,
      },
      code_block: {
        color: "#cbd5e1",
        fontFamily: "monospace",
        fontSize: 11.5,
      },
      blockquote: {
        borderLeftWidth: 3,
        borderLeftColor: "rgba(139,92,246,.5)",
        paddingHorizontal: 10,
        color: "rgba(176,171,201,.9)",
        backgroundColor: "rgba(139,92,246,.08)",
        marginVertical: 8,
      },
      hr: { backgroundColor: "rgba(255,255,255,.09)", height: 1, marginVertical: 10 },
    };
  }, []);

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
  const [progressPct, setProgressPct] = useState(0);
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

  useEffect(() => {
    if (!challenge || challenge.solvedByMe || challenge.hints.length === 0) {
      setProgressPct(0);
      return;
    }
    const unlocked = challenge.hints.filter((h) => h.unlocked).length;
    const pct = Math.round((unlocked / challenge.hints.length) * 100);
    setProgressPct(0);
    const t = setTimeout(() => setProgressPct(pct), 280);
    return () => clearTimeout(t);
  }, [challenge]);

  const onSubmit = useCallback(async () => {
    if (submitting || flag.trim().length === 0) return;
    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    setQueued(false);
    try {
      const outcome = await submitFlagViaGateway(
        challengeId,
        flag.trim(),
        eventId,
        isOnline,
      );
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
      setUnlockingId(hintId);
      setConfirmHint(null);
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
        setExpandedHints((prev) => {
          const next = new Set(prev);
          next.add(hintId);
          return next;
        });
      } catch {
        // surface through toast provider in future redesign
      } finally {
        setUnlockingId(null);
      }
    },
    [challengeId, unlockingId],
  );

  const onRequestHintUnlock = useCallback(
    (hintId: number) => {
      const hint = challenge?.hints.find((h) => h.id === hintId);
      if (!hint) return;
      if (hint.penaltyPoints > 0) {
        setConfirmHint({
          hintId: hint.id,
          title: hint.title,
          penaltyPoints: hint.penaltyPoints,
        });
      } else {
        void onUnlockHint(hintId);
      }
    },
    [challenge?.hints, onUnlockHint],
  );

  const onToggleHint = useCallback(
    (hintId: number) => {
      const hint = challenge?.hints.find((h) => h.id === hintId);
      if (!hint) return;
      if (!hint.unlocked) {
        onRequestHintUnlock(hintId);
        return;
      }
      setExpandedHints((prev) => {
        const next = new Set(prev);
        if (next.has(hintId)) next.delete(hintId);
        else next.add(hintId);
        return next;
      });
    },
    [challenge?.hints, onRequestHintUnlock],
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
    } catch {
      // handled by toast provider in previous design; ignoring here
    } finally {
      setIsBookmarking(false);
    }
  }, [challenge, isBookmarking]);

  const acc = challenge ? categoryAccent(challenge.category.name) : null;
  const ramp = challenge
    ? DIFF_RAMP[challenge.difficulty] ?? DIFF_RAMP.EASY
    : DIFF_RAMP.EASY;

  const renderCover = (c: ChallengeDetailDto) => (
    <View style={styles.cover}>
      <LinearGradient
        colors={[acc ? withAlpha(acc.color, 0.34) : "#1b1436", "#0a0913", "#04030a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["transparent", withAlpha(acc?.color ?? C.purpleLight, 0.22)]}
        start={{ x: 0.3, y: 0.2 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.coverHalo, { backgroundColor: acc?.glow ?? "rgba(167,139,250,.28)" }]} />
      <View style={styles.coverIconWatermark}>
        <LucideIcon
          name={categoryIcon(c.category.name)}
          size={110}
          color="rgba(255,255,255,.05)"
          strokeWidth={1.4}
        />
      </View>
      <LinearGradient
        colors={["transparent", "rgba(13,11,24,.98)"]}
        start={{ x: 0, y: 0.45 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [
          styles.coverBtn,
          { top: insets.top + 10 },
          pressed && styles.pressedDim,
        ]}
      >
        <LucideIcon name="back" size={18} color="#ffffff" />
      </Pressable>

      {!needsAuth ? (
        <Pressable
          disabled={isBookmarking}
          onPress={() => void onToggleBookmark()}
          accessibilityRole="button"
          accessibilityLabel={
            c.bookmarkedByMe ? "Remove bookmark" : "Bookmark challenge"
          }
          accessibilityState={{ disabled: isBookmarking, selected: c.bookmarkedByMe }}
          style={({ pressed }) => [
            styles.coverBtn,
            styles.coverBtnRight,
            { top: insets.top + 10 },
            c.bookmarkedByMe && styles.coverBtnActive,
            pressed && styles.pressedDim,
          ]}
        >
          {isBookmarking ? (
            <ActivityIndicator size="small" color={C.purpleLight} />
          ) : (
            <LucideIcon
              name="bookmark"
              size={18}
              color={c.bookmarkedByMe ? C.purpleLight : "#b9b5ce"}
            />
          )}
        </Pressable>
      ) : null}

      <View style={styles.badgeRow}>
        <LinearGradient
          colors={ramp.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.diffPill}
        >
          <Text style={[styles.diffPillText, { color: ramp.fg }]}>
            {difficultyLabel(c.difficulty)}
          </Text>
        </LinearGradient>
        <View style={styles.ptsPill}>
          <LucideIcon name="star" size={10} color={C.gold} />
          <Text style={styles.ptsPillText}>{c.basePoints}</Text>
        </View>
      </View>
    </View>
  );

  const renderMetaGrid = (c: ChallengeDetailDto) => {
    const tiles = [
      {
        icon: "star" as const,
        tone: C.gold,
        value: difficultyLabel(c.difficulty),
        label: "Difficulty",
      },
      {
        icon: "users" as const,
        tone: C.textMuted,
        value: c.solvedCount.toLocaleString(),
        label: "Solves",
      },
      {
        icon: "trophy" as const,
        tone: C.purpleLight,
        value: c.basePoints.toLocaleString(),
        label: "Points",
      },
      {
        icon: "clock" as const,
        tone: C.textMuted,
        value: c.category.name,
        label: "Category",
      },
    ];
    return (
      <View style={styles.metaGrid}>
        {tiles.map((tile) => (
          <View key={tile.label} style={styles.metaTile}>
            <LucideIcon name={tile.icon} size={14} color={tile.tone} />
            <Text style={styles.mv} numberOfLines={1} adjustsFontSizeToFit>
              {tile.value}
            </Text>
            <Text style={styles.ml}>{tile.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderProgress = (c: ChallengeDetailDto) => {
    if (c.solvedByMe || c.hints.length === 0) return null;
    return (
      <View style={styles.progressBlock}>
        <View style={styles.progressTop}>
          <Text style={styles.progressTitle}>Your progress</Text>
          <Text style={styles.progressPct}>{progressPct}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
      </View>
    );
  };

  const renderAttachments = (c: ChallengeDetailDto) => {
    if (c.attachments.length === 0) return null;
    return (
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <LucideIcon name="folder" size={14} color={acc?.color ?? C.purpleLight} />
          <Text style={styles.sectionTitle}>Attachments</Text>
          <Text style={styles.sectionCount}>
            {c.attachments.length} {c.attachments.length === 1 ? "file" : "files"}
          </Text>
        </View>
        <View style={styles.attList}>
          {c.attachments.map((attachment) => (
            <View key={attachment.id} style={styles.attRow}>
              <View
                style={[
                  styles.attIcon,
                  { backgroundColor: acc?.soft ?? "rgba(139,92,246,.12)" },
                ]}
              >
                <LucideIcon
                  name={
                    attachment.mimeType?.startsWith("image")
                      ? ("image" as const)
                      : ("doc" as const)
                  }
                  size={15}
                  color={acc?.color ?? C.purpleLight}
                />
              </View>
              <View style={styles.attBody}>
                <Text style={styles.attTitle} numberOfLines={1}>
                  {attachment.title}
                </Text>
                <Text style={styles.attMeta}>
                  {Math.max(1, Math.round((attachment.sizeBytes ?? 0) / 1024))} KB
                  {attachment.mimeType ? ` · ${attachment.mimeType}` : ""}
                </Text>
              </View>
              <LucideIcon name="download" size={14} color={C.textMuted} />
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderFlagBlock = (c: ChallengeDetailDto) => {
    const solved = c.solvedByMe;
    return (
      <View style={[styles.flagBlock, solved && styles.flagBlockDone]}>
        <View style={styles.flagHead}>
          <View style={styles.flagTitleWrap}>
            <LucideIcon name="flag" size={15} color={C.purpleLight} />
            <Text style={styles.flagTitle}>Submit Flag</Text>
          </View>
          <View style={styles.flagFormat}>
            <Text style={styles.flagFormatText}>ctf{`{...}`}</Text>
          </View>
        </View>

        {needsAuth ? (
          <View style={styles.authNote}>
            <LucideIcon name="shield" size={12} color={C.textMuted} />
            <Text style={styles.authNoteText}>
              Sign in to submit flags and unlock hints.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.flagRow}>
              <View style={[styles.flagInputWrap, solved && styles.flagInputDone]}>
                <LucideIcon
                  name="terminal"
                  size={14}
                  color={solved ? C.green : C.textMuted}
                />
                <TextInput
                  value={flag}
                  onChangeText={setFlag}
                  placeholder={solved ? `ctf{...} — solved` : "ctf{your_flag_here}"}
                  placeholderTextColor={C.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  spellCheck={false}
                  accessibilityLabel="Flag"
                  accessibilityHint="Enter the flag for this challenge"
                  returnKeyType="send"
                  onSubmitEditing={() => void onSubmit()}
                  style={styles.flagInput}
                  editable={!submitting && !solved}
                />
              </View>
              <LinearGradient
                colors={solved ? ["#16a34a", "#15803d"] : ["#8b5cf6", "#6d28d9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.flagBtn,
                  (submitting || (flag.trim().length === 0 && !solved)) &&
                    styles.btnDim,
                ]}
              >
                <Pressable
                  disabled={submitting || (flag.trim().length === 0 && !solved)}
                  onPress={() => void onSubmit()}
                  accessibilityRole="button"
                  accessibilityLabel={solved ? "Already solved" : "Submit flag"}
                  accessibilityState={{
                    disabled: submitting || (flag.trim().length === 0 && !solved),
                  }}
                  style={({ pressed }) => [
                    styles.flagBtnFill,
                    pressed && styles.pressedDim,
                  ]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : solved ? (
                    <>
                      <LucideIcon name="check" size={13} color="#ffffff" />
                      <Text style={styles.flagBtnText}>Solved</Text>
                    </>
                  ) : (
                    <Text style={styles.flagBtnText}>Submit</Text>
                  )}
                </Pressable>
              </LinearGradient>
            </View>

            {solved ? (
              <View style={[styles.flagStatus, styles.flagStatusOk]}>
                <LucideIcon name="check" size={13} color={C.green} />
                <Text style={styles.flagStatusOkText}>
                  Already solved — +{c.basePoints} XP earned
                </Text>
              </View>
            ) : result ? (
              <View
                style={[
                  styles.flagStatus,
                  result.correct ? styles.flagStatusOk : styles.flagStatusErr,
                ]}
                accessibilityRole="alert"
              >
                <LucideIcon
                  name={result.correct ? "check" : "x"}
                  size={13}
                  color={result.correct ? C.green : C.rose}
                />
                <Text
                  style={[
                    styles.flagStatusText,
                    { color: result.correct ? C.green : C.rose },
                  ]}
                >
                  {result.correct
                    ? `${result.message}${result.pointsAwarded > 0 ? ` — +${result.pointsAwarded} XP` : ""}`
                    : result.message}
                </Text>
              </View>
            ) : submitError ? (
              <View style={[styles.flagStatus, styles.flagStatusErr]}>
                <LucideIcon name="x" size={13} color={C.rose} />
                <Text style={[styles.flagStatusText, { color: C.rose }]}>
                  {submitError}
                </Text>
              </View>
            ) : queued ? (
              <View style={[styles.flagStatus, styles.flagStatusQueued]}>
                <LucideIcon name="clock" size={13} color={C.gold} />
                <Text style={[styles.flagStatusText, { color: C.gold }]}>
                  Flag queued — auto-submitted when you&apos;re back online.
                </Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    );
  };

  const renderHints = (c: ChallengeDetailDto) => (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <LucideIcon name="bulb" size={14} color={C.gold} />
        <Text style={styles.sectionTitle}>Hints</Text>
        <Text style={styles.sectionCount}>
          {c.hints.length} {c.hints.length === 1 ? "available" : "available"}
        </Text>
      </View>
      {c.hints.length === 0 ? (
        <Text style={styles.noHints}>
          No hints for this challenge. You&apos;re on your own.
        </Text>
      ) : (
        <View style={styles.hintList}>
          {c.hints.map((hint, i) => {
            const isOpen = expandedHints.has(hint.id);
            const isUnlocking = unlockingId === hint.id;
            return (
              <View
                key={hint.id}
                style={[styles.hintItem, isOpen && styles.hintItemOpen]}
              >
                <Pressable
                  disabled={needsAuth || isUnlocking}
                  onPress={() => onToggleHint(hint.id)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    hint.unlocked
                      ? `Hint ${hint.title}, ${isOpen ? "hide" : "reveal"}`
                      : hint.penaltyPoints > 0
                        ? `Unlock hint ${hint.title} for ${hint.penaltyPoints} points`
                        : `View hint ${hint.title}`
                  }
                  accessibilityState={{
                    disabled: needsAuth || isUnlocking,
                    expanded: hint.unlocked && isOpen,
                  }}
                  style={({ pressed }) => [
                    styles.hintToggle,
                    pressed && styles.pressedDim,
                  ]}
                >
                  <View style={styles.hintNum}>
                    <Text style={styles.hintNumText}>{i + 1}</Text>
                  </View>
                  <Text style={[styles.hintLabel, isOpen && styles.hintLabelOpen]}>
                    {isUnlocking ? "Unlocking…" : hint.title}
                  </Text>
                  <View
                    style={[
                      styles.hintCost,
                      isOpen && styles.hintCostOpen,
                    ]}
                  >
                    <Text
                      style={[
                        styles.hintCostText,
                        isOpen && styles.hintCostTextOpen,
                      ]}
                    >
                      {hint.unlocked
                        ? "OPEN"
                        : hint.penaltyPoints > 0
                          ? `−${hint.penaltyPoints} pts`
                          : "FREE"}
                    </Text>
                  </View>
                  {isUnlocking ? (
                    <ActivityIndicator size="small" color={C.gold} />
                  ) : (
                    <View
                      style={{
                        transform: [{ rotate: isOpen ? "180deg" : "0deg" }],
                      }}
                    >
                      <LucideIcon name="chevron" size={14} color={C.textMuted} />
                    </View>
                  )}
                </Pressable>
                {hint.unlocked && isOpen ? (
                  <View style={styles.hintBody}>
                    <Markdown style={markdownTheme}>{hint.body ?? ""}</Markdown>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderBody = () => {
    if (!challenge || !acc) return null;

    return (
      <>
        {renderCover(challenge)}
        <View style={styles.detailBody}>
          <Text style={styles.detailTitle}>{challenge.title}</Text>
          {renderMetaGrid(challenge)}

          {challenge.tags.length > 0 ? (
            <View style={styles.tagRow}>
              {challenge.tags.map((tag) => {
                const tone =
                  TAG_TONES[tag.name.length % TAG_TONES.length];
                const palette = TAG_PALETTE[tone];
                return (
                  <View
                    key={tag.id}
                    style={[
                      styles.tag,
                      { backgroundColor: palette.bg, borderColor: palette.line },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: palette.color }]}>
                      {tag.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {renderProgress(challenge)}

          <View style={styles.descCard}>
            <Markdown style={markdownTheme}>{challenge.description}</Markdown>
          </View>

          {renderAttachments(challenge)}
          {renderFlagBlock(challenge)}
          {renderHints(challenge)}
        </View>
      </>
    );
  };

  const loadingBody = (
    <>
      <View style={styles.skCover}>
        <View style={[styles.skCoverFill, { backgroundColor: "rgba(255,255,255,.04)" }]} />
      </View>
      <View style={styles.detailBody}>
        <View style={styles.skTitle} />
        <View style={styles.skMeta}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.skTile} />
          ))}
        </View>
        <View style={styles.skLineTall} />
        <View style={styles.skLine} />
        <View style={styles.skLineShort} />
      </View>
    </>
  );

  return (
    <View style={styles.root}>
      {loading && !challenge ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + insets.bottom }]}
        >
          <OfflineBanner />
          {loadingBody}
        </ScrollView>
      ) : loadError ? (
        <View style={styles.centerWrap}>
          <View style={styles.errCard}>
            <View style={styles.errIcon}>
              <LucideIcon name="radar" size={16} color={C.red} />
            </View>
            <Text style={styles.errTitle}>Failed to load challenge</Text>
            <Text style={styles.errText}>{loadError}</Text>
            <Pressable
              onPress={() => void load()}
              accessibilityRole="button"
              style={({ pressed }) => [styles.retryBtn, pressed && styles.pressedDim]}
            >
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        </View>
      ) : challenge ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <OfflineBanner />
          {renderBody()}
        </ScrollView>
      ) : null}

      <BottomSheet
        visible={confirmHint !== null}
        onClose={() => setConfirmHint(null)}
        title="Unlock this hint?"
      >
        <View style={styles.sheetCopy}>
          <View style={styles.sheetIc}>
            <LucideIcon name="bulb" size={16} color={C.gold} />
          </View>
          <Text style={styles.sheetText}>
            <Text style={styles.sheetAccent}>{confirmHint?.title}</Text> costs{" "}
            <Text style={styles.sheetAccent}>{confirmHint?.penaltyPoints} points</Text>{" "}
            and can&apos;t be undone.
          </Text>
        </View>
        <View style={styles.sheetActions}>
          <Pressable
            onPress={() => setConfirmHint(null)}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.sheetBtn,
              styles.sheetBtnGhost,
              pressed && styles.pressedDim,
            ]}
          >
            <Text style={styles.sheetBtnGhostText}>Cancel</Text>
          </Pressable>
          <LinearGradient
            colors={["#8b5cf6", "#6d28d9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sheetBtnGrad}
          >
            <Pressable
              onPress={() => {
                if (confirmHint) void onUnlockHint(confirmHint.hintId);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.sheetBtnFill, pressed && styles.pressedDim]}
            >
              <Text style={styles.sheetBtnAccentText}>Unlock</Text>
            </Pressable>
          </LinearGradient>
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bgPrimary,
  },
  pressedDim: {
    opacity: 0.7,
  },
  btnDim: {
    opacity: 0.5,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* cover */
  cover: {
    position: "relative",
    height: 204,
    overflow: "hidden",
    backgroundColor: "#04030a",
  },
  coverHalo: {
    position: "absolute",
    top: -50,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    opacity: 0.5,
  },
  coverIconWatermark: {
    position: "absolute",
    top: 40,
    right: -8,
  },
  coverBtn: {
    position: "absolute",
    left: 14,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(9,8,17,.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.12)",
  },
  coverBtnRight: {
    left: undefined,
    right: 14,
  },
  coverBtnActive: {
    backgroundColor: "rgba(24,21,44,.95)",
  },
  badgeRow: {
    position: "absolute",
    left: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  diffPill: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  diffPillText: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ptsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
    backgroundColor: "rgba(251,191,36,.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,.3)",
  },
  ptsPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.gold,
  },

  /* body */
  detailBody: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 16,
    marginTop: -8,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.7,
    lineHeight: 28,
    color: C.textPrimary,
  },

  /* meta grid */
  metaGrid: {
    flexDirection: "row",
    gap: 8,
  },
  metaTile: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 11,
    backgroundColor: "rgba(22,19,40,.85)",
    borderWidth: 1,
    borderColor: C.border,
  },
  mv: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: "#ffffff",
    textAlign: "center",
  },
  ml: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: C.textMuted,
  },

  /* tags */
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: "700",
  },

  /* progress */
  progressBlock: {
    padding: 13,
    borderRadius: 13,
    backgroundColor: "rgba(139,92,246,.10)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,.28)",
  },
  progressTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  progressPct: {
    fontSize: 11,
    fontWeight: "700",
    color: C.purpleLight,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#a78bfa",
  },

  /* desc */
  descCard: {
    borderRadius: 14,
    padding: 14,
    backgroundColor: "rgba(24,21,44,.55)",
    borderWidth: 1,
    borderColor: C.border,
  },

  /* sections */
  section: {
    gap: 10,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: C.textPrimary,
  },
  sectionCount: {
    marginLeft: "auto",
    fontSize: 10.5,
    fontWeight: "600",
    color: C.textMuted,
  },

  /* attachments */
  attList: {
    gap: 8,
  },
  attRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(18,16,31,.8)",
    borderWidth: 1,
    borderColor: C.border,
  },
  attIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,.3)",
  },
  attBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  attTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  attMeta: {
    fontSize: 10.5,
    color: C.textMuted,
  },

  /* flag block */
  flagBlock: {
    padding: 16,
    borderRadius: 15,
    backgroundColor: "rgba(10,9,20,.95)",
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  flagBlockDone: {
    borderColor: "rgba(34,197,94,.4)",
    backgroundColor: "rgba(6,60,34,.22)",
  },
  flagHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  flagTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  flagTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: "#ffffff",
  },
  flagFormat: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,.05)",
    borderWidth: 1,
    borderColor: C.border,
  },
  flagFormatText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: C.textMuted,
  },
  flagRow: {
    flexDirection: "row",
    gap: 8,
  },
  flagInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    paddingHorizontal: 12,
    height: 46,
    borderRadius: 11,
    backgroundColor: "rgba(5,4,12,.8)",
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  flagInputDone: {
    borderColor: "rgba(34,197,94,.4)",
  },
  flagInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: "monospace",
    fontSize: 12.5,
    color: C.textPrimary,
    letterSpacing: 0.3,
    paddingVertical: 0,
  },
  flagBtn: {
    borderRadius: 11,
    overflow: "hidden",
  },
  flagBtnFill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 92,
    height: 46,
    paddingHorizontal: 16,
  },
  flagBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#ffffff",
  },
  flagStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  flagStatusOk: {
    backgroundColor: "rgba(34,197,94,.06)",
    borderRadius: 8,
    padding: 8,
  },
  flagStatusErr: {
    backgroundColor: "rgba(244,63,94,.05)",
    borderRadius: 8,
    padding: 8,
  },
  flagStatusQueued: {
    backgroundColor: "rgba(251,191,36,.08)",
    borderRadius: 8,
    padding: 8,
  },
  flagStatusText: {
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
    flex: 1,
  },
  flagStatusOkText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.green,
    flex: 1,
  },
  authNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    padding: 11,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,.05)",
    borderWidth: 1,
    borderColor: C.border,
  },
  authNoteText: {
    flex: 1,
    fontSize: 10.5,
    color: C.textSecondary,
  },

  /* hints */
  noHints: {
    fontSize: 11,
    color: C.textMuted,
    lineHeight: 16,
    paddingHorizontal: 2,
  },
  hintList: {
    gap: 8,
  },
  hintItem: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "rgba(18,16,31,.8)",
  },
  hintItemOpen: {
    borderColor: "rgba(251,191,36,.32)",
    backgroundColor: "rgba(120,53,15,.16)",
  },
  hintToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  hintNum: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,191,36,.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,.32)",
  },
  hintNumText: {
    fontSize: 11,
    fontWeight: "800",
    color: C.gold,
  },
  hintLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 16,
    color: C.textSecondary,
  },
  hintLabelOpen: {
    color: "#f7e3b0",
  },
  hintCost: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(251,191,36,.1)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,.28)",
  },
  hintCostOpen: {
    backgroundColor: "rgba(34,197,94,.1)",
    borderColor: "rgba(34,197,94,.28)",
  },
  hintCostText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.gold,
  },
  hintCostTextOpen: {
    color: C.green,
  },
  hintBody: {
    paddingHorizontal: 13,
    paddingBottom: 13,
  },

  /* skeleton */
  skCover: {
    height: 204,
    backgroundColor: "rgba(12,10,24,.7)",
  },
  skCoverFill: {
    flex: 1,
  },
  skTitle: {
    height: 24,
    width: "62%",
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,.08)",
  },
  skMeta: {
    flexDirection: "row",
    gap: 8,
  },
  skTile: {
    flex: 1,
    height: 62,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,.05)",
  },
  skLineTall: {
    height: 70,
    width: "100%",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,.05)",
  },
  skLine: {
    height: 12,
    width: "88%",
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,.06)",
  },
  skLineShort: {
    height: 10,
    width: "38%",
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,.05)",
  },

  /* error */
  errCard: {
    alignItems: "center",
    gap: 8,
    padding: 20,
    borderRadius: 15,
    backgroundColor: "rgba(24,21,44,.9)",
    borderWidth: 1,
    borderColor: C.border,
    maxWidth: 300,
  },
  errIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,63,94,.12)",
    borderWidth: 1,
    borderColor: "rgba(244,63,94,.32)",
  },
  errTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.textPrimary,
  },
  errText: {
    fontSize: 10.5,
    lineHeight: 15,
    color: C.textMuted,
    textAlign: "center",
  },
  retryBtn: {
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 11,
    backgroundColor: "rgba(139,92,246,.16)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,.4)",
    marginTop: 4,
  },
  retryText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.purpleLight,
  },

  /* confirm hint sheet */
  sheetCopy: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  sheetIc: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(251,191,36,.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,.34)",
  },
  sheetText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: C.textSecondary,
  },
  sheetAccent: {
    color: C.gold,
    fontWeight: "800",
  },
  sheetActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  sheetBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: 12,
  },
  sheetBtnGhost: {
    backgroundColor: "rgba(255,255,255,.05)",
    borderWidth: 1,
    borderColor: C.border,
  },
  sheetBtnGhostText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.textSecondary,
  },
  sheetBtnGrad: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  sheetBtnFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBtnAccentText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#ffffff",
  },
});