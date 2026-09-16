import type { LeaderboardEntryDto, LeaderboardResponse, LeaderboardScope } from "@ctf/shared";
import { LEADERBOARD } from "@ctf/shared";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  Circle,
  Defs,
  Ellipse,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
  Svg,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { LucideIcon } from "@/components/lucide-icon";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { C } from "@/constants/design";
import { Fonts, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getLeaderboard } from "@/services/leaderboard";
import {
  connectLeaderboardSocket,
  disconnectLeaderboardSocket,
  subscribeLeaderboardUpdate,
} from "@/services/socket";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";

const SCOPE_LABELS: Record<LeaderboardScope, string> = {
  global: "Global",
  daily: "Daily",
  weekly: "Weekly",
};

const TONES = {
  gold: { border: "rgba(251,191,36,.6)", glow: "rgba(251,191,36,.45)", bg: "rgba(251,191,36,.14)" },
  silver: { border: "rgba(148,163,184,.55)", glow: "rgba(148,163,184,.4)", bg: "rgba(148,163,184,.14)" },
  bronze: { border: "rgba(234,124,71,.55)", glow: "rgba(234,124,71,.4)", bg: "rgba(234,124,71,.14)" },
  purple: { border: "rgba(167,139,250,.6)", glow: "rgba(167,139,250,.45)", bg: "rgba(167,139,250,.14)" },
  stone: { border: "rgba(120,113,108,.4)", glow: "rgba(120,113,108,.25)", bg: "rgba(120,113,108,.12)" },
  toxic: { border: "rgba(34,197,94,.5)", glow: "rgba(34,197,94,.35)", bg: "rgba(34,197,94,.12)" },
  pink: { border: "rgba(236,72,153,.5)", glow: "rgba(236,72,153,.35)", bg: "rgba(236,72,153,.12)" },
} as const;

type ToneKey = keyof typeof TONES;

const ROW_TONES: ToneKey[] = ["purple", "stone", "pink", "toxic", "purple", "stone"];

function levelFromScore(score: number): number {
  return Math.max(1, Math.floor(score / 250) + 1);
}

function CrownSvg() {
  return (
    <Svg viewBox="0 0 52 44" width={52} height={44}>
      <Defs>
        <SvgLinearGradient id="crownGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#fde68a" />
          <Stop offset="35%" stopColor="#fbbf24" />
          <Stop offset="100%" stopColor="#d97706" />
        </SvgLinearGradient>
      </Defs>
      <Path
        d="M6 32 L10 12 L20 22 L26 6 L32 22 L42 12 L46 32 Z"
        fill="url(#crownGrad)"
        stroke="#b45309"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
      <Path d="M6 32 H46 V38 H6 Z" fill="#b45309" opacity={0.8} />
      <Circle cx={10} cy={10} r={2.6} fill="#fde68a" />
      <Circle cx={26} cy={4} r={2.8} fill="#fde68a" />
      <Circle cx={42} cy={10} r={2.6} fill="#fde68a" />
    </Svg>
  );
}

function LaurelSvg() {
  return (
    <Svg viewBox="0 0 32 70" width={32} height={70}>
      <Ellipse cx={16} cy={8} rx={5.5} ry={3} fill="#fbbf24" transform="rotate(-30 16 8)" opacity={0.85} />
      <Ellipse cx={12} cy={20} rx={5.5} ry={3} fill="#fbbf24" transform="rotate(-22 12 20)" opacity={0.85} />
      <Ellipse cx={10} cy={32} rx={5.5} ry={3} fill="#fbbf24" transform="rotate(-10 10 32)" opacity={0.85} />
      <Ellipse cx={10} cy={44} rx={5.5} ry={3} fill="#fbbf24" transform="rotate(4 10 44)" opacity={0.85} />
      <Ellipse cx={12} cy={56} rx={5.5} ry={3} fill="#fbbf24" transform="rotate(18 12 56)" opacity={0.85} />
      <Ellipse cx={16} cy={65} rx={5.5} ry={3} fill="#fbbf24" transform="rotate(30 16 65)" opacity={0.85} />
      <Path d="M18 4 Q 6 30 18 66" stroke="#fbbf24" strokeWidth={1.6} fill="none" opacity={0.85} />
    </Svg>
  );
}

function LevelHex({ color = "#c4b5fd" }: { color?: string }) {
  return (
    <Svg viewBox="0 0 20 22" width={15} height={17}>
      <Path
        d="M10 1 18 5.5V16.5L10 21 2 16.5V5.5Z"
        stroke={color}
        strokeWidth={1.6}
        strokeLinejoin="round"
        fill="rgba(139,92,246,.18)"
      />
      <Path d="M10 5 15 7.75V13.25L10 16 5 13.25V7.75Z" fill={color} opacity={0.85} />
    </Svg>
  );
}

function InitialAvatar({
  name,
  size,
  tone,
}: {
  name: string;
  size: number;
  tone: ToneKey;
}) {
  const t = TONES[tone];
  const letter = (name || "?").charAt(0).toUpperCase();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: t.border,
          shadowColor: t.glow,
        },
      ]}
    >
      <Text style={[styles.avatarLetter, { fontSize: size * 0.38, color: "#c4b5fd" }]}>
        {letter}
      </Text>
    </View>
  );
}

function PodiumSlot({
  entry,
  spot,
}: {
  entry: LeaderboardEntryDto;
  spot: 1 | 2 | 3;
}) {
  const isFirst = spot === 1;
  const tone: ToneKey = spot === 1 ? "gold" : spot === 2 ? "silver" : "bronze";
  const t = TONES[tone];
  const chipColors: readonly [string, string] =
    spot === 1
      ? ["#fbbf24", "#d97706"]
      : spot === 2
        ? ["#94a3b8", "#64748b"]
        : ["#ea7c47", "#9a3412"];
  const xpColor = spot === 1 ? "#fbbf24" : spot === 2 ? "#cbd5e1" : "#fdba74";
  const ringSize = isFirst ? 86 : 68;

  return (
    <View
      style={[
        styles.podiumSlot,
        isFirst ? styles.podiumP1 : spot === 2 ? styles.podiumP2 : styles.podiumP3,
      ]}
    >
      {isFirst ? (
        <View style={styles.crownWrap}>
          <CrownSvg />
        </View>
      ) : null}
      <View
        style={[
          styles.rankBadge,
          {
            width: isFirst ? 28 : 24,
            height: isFirst ? 28 : 24,
            borderRadius: isFirst ? 8 : 7,
            backgroundColor: "transparent",
            overflow: "hidden",
          },
        ]}
      >
        <LinearGradient colors={chipColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Text style={[styles.rankBadgeText, { fontSize: isFirst ? 13 : 11.5, color: spot === 1 ? "#1a0f00" : "#fff" }]}>
          {spot}
        </Text>
      </View>
      <View
        style={[
          styles.ringWrap,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: t.border,
            shadowColor: t.glow,
            backgroundColor: "#04030a",
          },
        ]}
      >
        <InitialAvatar
          name={entry.username}
          size={ringSize - 6}
          tone={tone}
        />
      </View>
      {isFirst ? (
        <View pointerEvents="none" style={styles.laurels}>
          <View style={styles.laurelLeft}>
            <LaurelSvg />
          </View>
          <View style={styles.laurelRight}>
            <LaurelSvg />
          </View>
        </View>
      ) : null}
      <Text numberOfLines={1} style={[styles.podiumName, isFirst && styles.podiumNameFirst]}>
        {entry.username}
      </Text>
      <Text style={styles.podiumTag}>Level {levelFromScore(entry.score)}</Text>
      <Text style={[styles.podiumXp, { color: xpColor }]}>
        {entry.score.toLocaleString()} XP
      </Text>
      <Text style={styles.podiumSolves}>{entry.solves} solves</Text>
      {isFirst ? (
        <View style={styles.topHacker}>
          <LucideIcon name="crown" size={10} color="#1a0f00" />
          <Text style={styles.topHackerText}>#1 HACKER</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const authStatus = useAuthStore((s) => s.status);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const [scope, setScope] = useState<LeaderboardScope>("global");
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [level, setLevel] = useState(1);

  const load = useCallback(async (targetScope: LeaderboardScope) => {
    try {
      setError(null);
      const result = await getLeaderboard(targetScope, 50);
      setData(result);
      if (result.me?.score != null) {
        setLevel(levelFromScore(result.me.score));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leaderboard");
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

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    await load(scope);
    setRefreshing(false);
  }, [scope, load]);

  const entries = data?.entries ?? [];
  const me = data?.me ?? null;

  const byRank = new Map(entries.slice(0, 3).map((e) => [e.rank, e]));
  const podiumOrder: LeaderboardEntryDto[] = [
    byRank.get(2),
    byRank.get(1),
    byRank.get(3),
  ].filter((e): e is LeaderboardEntryDto => Boolean(e));

  const rows = entries.slice(3);
  const meInRows = entries.some((e) => e.userId === currentUser?.id);
  const meRow: LeaderboardEntryDto | null =
    me && !meInRows
      ? {
          rank: me.rank ?? 0,
          userId: currentUser?.id ?? -1,
          username: currentUser?.username ?? "You",
          score: me.score,
          solves: me.solves,
        }
      : null;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0a0913", "#07070f", "#06060d"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(109,40,217,.22)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGlow}
      />

      {!data ? (
        <View style={styles.stateWrap}>
          {error ? (
            <ErrorState message={error} onRetry={() => void load(scope)} />
          ) : (
            <LoadingState />
          )}
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + 8, paddingBottom: 40 + insets.bottom },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor={theme.accent}
            />
          }
        >
          <View style={styles.headerWrap}>
            <AppHeader level={level} unreadCount={unreadCount} />
          </View>

          <View style={styles.pageHead}>
            <View style={styles.titleBlock}>
              <LinearGradient
                colors={["rgba(139,92,246,.22)", "rgba(20,16,34,.9)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pageIcon}
              >
                <LucideIcon name="trophy" size={20} color="#c4b5fd" />
              </LinearGradient>
              <View>
                <Text style={styles.pageTitle}>Leaderboard</Text>
                <Text style={styles.pageSub}>
                  Top minds. Real impact. Are you on the list?
                </Text>
              </View>
            </View>
            <View style={styles.scriptDeco}>
              <Text style={styles.decoText}>
                Hack{`\n`}Climb{`\n`}Repeat
              </Text>
            </View>
          </View>

          <View style={styles.tabBar}>
            {LEADERBOARD.SCOPES.map((value) => {
              const active = scope === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="tab"
                  accessibilityLabel={`${SCOPE_LABELS[value]} leaderboard`}
                  accessibilityState={{ selected: active }}
                  onPress={() => setScope(value)}
                  style={styles.tab}
                >
                  {active ? (
                    <LinearGradient
                      colors={["#8b5cf6", "#7c3aed"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.tabActiveBg}
                    />
                  ) : null}
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {SCOPE_LABELS[value]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {entries.length === 0 ? (
            <EmptyState message="No scores yet. Be the first to solve a challenge!" icon="trophy-outline" />
          ) : (
            <>
              <View style={styles.podium}>
                {podiumOrder.map((entry) => (
                  <PodiumSlot
                    key={entry.userId}
                    entry={entry}
                    spot={entry.rank as 1 | 2 | 3}
                  />
                ))}
              </View>

              <View style={styles.lbTable}>
                <View style={styles.lbHead}>
                  <Text style={[styles.headCell, styles.headRank]}>#</Text>
                  <Text style={[styles.headCell, styles.headUser]}>User</Text>
                  <Text style={[styles.headCell, styles.headNum]}>Level</Text>
                  <Text style={[styles.headCell, styles.headNum]}>Solves</Text>
                  <Text style={[styles.headCell, styles.headNum]}>XP</Text>
                </View>

                {rows.map((entry, index) => {
                  const isMe = entry.userId === currentUser?.id;
                  return (
                    <Row
                      key={entry.userId}
                      entry={entry}
                      isMe={isMe}
                      tone={ROW_TONES[index % ROW_TONES.length]}
                    />
                  );
                })}

                {meRow ? <Row entry={meRow} isMe tone="gold" /> : null}
              </View>

              <View style={styles.keepCard}>
                <LinearGradient
                  colors={["rgba(139,92,246,.22)", "rgba(20,16,34,.9)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.keepIcon}
                >
                  <LucideIcon name="gift" size={22} color="#c4b5fd" />
                </LinearGradient>
                <View style={styles.keepBody}>
                  <Text style={styles.keepTitle}>Keep Hacking!</Text>
                  <Text style={styles.keepDesc}>Solve more challenges and climb higher.</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="View rewards"
                  onPress={() => router.push("/achievements")}
                  style={({ pressed }) => [styles.keepBtn, pressed && styles.pressed]}
                >
                  <LucideIcon name="gift" size={14} color="#c4b5fd" />
                  <Text style={styles.keepBtnText}>View Rewards</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function Row({
  entry,
  isMe,
  tone,
}: {
  entry: LeaderboardEntryDto;
  isMe?: boolean;
  tone: ToneKey;
}) {
  const xpColor = isMe ? "#fbbf24" : "#c4b5fd";
  return (
    <View style={[styles.lbRow, isMe && styles.rankMe]}>
      <Text style={[styles.lbRank, isMe && styles.lbRankMe]}>
        {isMe ? `# ${entry.rank}` : String(entry.rank)}
      </Text>
      <View style={styles.lbUser}>
        <InitialAvatar name={entry.username} size={34} tone={tone} />
        <View style={styles.lbInfo}>
          <View style={styles.lbNameLine}>
            <Text numberOfLines={1} style={styles.lbName}>
              {entry.username}
            </Text>
            {isMe ? (
              <LinearGradient
                colors={["#fbbf24", "#f59e0b"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.youPill}
              >
                <Text style={styles.youPillText}>YOU</Text>
              </LinearGradient>
            ) : null}
          </View>
          <Text style={styles.lbTag}>Level {levelFromScore(entry.score)}</Text>
        </View>
      </View>
      <View style={styles.lbLevel}>
        <LevelHex />
        <Text style={styles.lbLevelText}>{levelFromScore(entry.score)}</Text>
      </View>
      <Text style={styles.lbNum}>{entry.solves}</Text>
      <Text style={[styles.lbNum, { color: xpColor }]}>
        {entry.score.toLocaleString()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bgPrimary,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 40,
  },
  stateWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 40,
  },

  /* page head */
  headerWrap: {
    marginTop: 4,
    marginBottom: 14,
  },
  pageHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.three,
    marginTop: 8,
    marginBottom: 18,
  },
  titleBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    flexShrink: 1,
  },
  pageIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,.4)",
  },
  pageTitle: {
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: -1.1,
    lineHeight: 34,
    marginBottom: 6,
    color: C.textPrimary,
  },
  pageSub: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 19,
    maxWidth: 230,
  },
  scriptDeco: {
    alignItems: "flex-end",
    paddingTop: 6,
    transform: [{ rotate: "-4deg" }],
  },
  decoText: {
    fontSize: 20,
    lineHeight: 18,
    fontWeight: "700",
    fontStyle: "italic",
    fontFamily: Fonts.serif,
    textAlign: "right",
    color: "rgba(196,181,253,.95)",
    letterSpacing: 0.5,
  },

  /* tab bar */
  tabBar: {
    flexDirection: "row",
    gap: 0,
    padding: 5,
    borderRadius: 14,
    backgroundColor: "rgba(20,17,36,.85)",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 10,
    minHeight: 42,
    overflow: "hidden",
  },
  tabActiveBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 10,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
  },
  tabLabelActive: {
    color: "#fff",
  },

  /* podium */
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 22,
  },
  podiumSlot: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 16,
    backgroundColor: "rgba(24,21,44,.6)",
    borderWidth: 1,
    overflow: "visible",
  },
  podiumP2: {
    paddingBottom: 18,
    borderColor: "rgba(148,163,184,.35)",
    backgroundColor: "rgba(148,163,184,.08)",
  },
  podiumP1: {
    paddingTop: 20,
    paddingBottom: 22,
    borderColor: "rgba(251,191,36,.5)",
    backgroundColor: "rgba(251,191,36,.08)",
    marginBottom: 18,
  },
  podiumP3: {
    paddingBottom: 18,
    borderColor: "rgba(234,124,71,.35)",
    backgroundColor: "rgba(234,124,71,.08)",
  },
  crownWrap: {
    position: "absolute",
    top: -30,
    left: "50%",
    marginLeft: -26,
    zIndex: 3,
  },
  rankBadge: {
    position: "absolute",
    top: -10,
    left: "50%",
    marginLeft: -12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    opacity: 1,
  },
  rankBadgeText: {
    fontWeight: "800",
    textAlign: "center",
  },
  ringWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    borderWidth: 2,
  },
  laurels: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    zIndex: 0,
    opacity: 0.9,
  },
  laurelLeft: {
    position: "absolute",
    left: 0,
  },
  laurelRight: {
    position: "absolute",
    right: 0,
    transform: [{ scaleX: -1 }],
  },
  podiumName: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: "#fff",
    lineHeight: 16,
    marginBottom: 4,
    maxWidth: "100%",
  },
  podiumNameFirst: {
    fontSize: 15,
    fontWeight: "900",
  },
  podiumTag: {
    fontSize: 10,
    fontWeight: "500",
    color: C.textSecondary,
    lineHeight: 13,
    marginBottom: 8,
  },
  podiumXp: {
    fontSize: 14.5,
    fontWeight: "900",
    letterSpacing: -0.4,
    lineHeight: 16,
    marginBottom: 3,
  },
  podiumSolves: {
    fontSize: 10.5,
    fontWeight: "600",
    color: C.textMuted,
  },
  topHacker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(251,191,36,.9)",
  },
  topHackerText: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#1a0f00",
  },

  /* avatar */
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#04030a",
    borderWidth: 2,
  },
  avatarLetter: {
    fontWeight: "800",
    textAlign: "center",
  },

  /* table */
  lbTable: {
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(18,16,31,.6)",
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  lbHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    backgroundColor: "rgba(255,255,255,.025)",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headCell: {
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: C.textMuted,
  },
  headRank: {
    width: 32,
  },
  headUser: {
    flex: 1,
  },
  headNum: {
    width: 58,
    textAlign: "right",
  },
  lbRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,.04)",
  },
  rankMe: {
    backgroundColor: "rgba(139,92,246,.12)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(167,139,250,.35)",
    paddingVertical: 14,
  },
  lbRank: {
    width: 32,
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: C.textSecondary,
  },
  lbRankMe: {
    color: C.purpleLight,
  },
  lbUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  lbInfo: {
    flex: 1,
    minWidth: 0,
  },
  lbNameLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  lbName: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: "#fff",
    lineHeight: 15,
  },
  youPill: {
    paddingVertical: 1,
    paddingHorizontal: 5,
    borderRadius: 5,
  },
  youPillText: {
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.5,
    color: "#1a0f00",
  },
  lbTag: {
    fontSize: 10.5,
    fontWeight: "500",
    color: C.textMuted,
    lineHeight: 12,
  },
  lbLevel: {
    width: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 5,
  },
  lbLevelText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.1,
    color: "#c4b5fd",
  },
  lbNum: {
    width: 58,
    fontSize: 12.5,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: "#fff",
    textAlign: "right",
  },

  /* keep hacking */
  keepCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 14,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: "rgba(24,21,44,.7)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,.32)",
    marginTop: 14,
  },
  keepIcon: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,.45)",
  },
  keepBody: {
    flex: 1,
    minWidth: 0,
  },
  keepTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.25,
    color: C.purpleLight,
    marginBottom: 3,
  },
  keepDesc: {
    fontSize: 11,
    color: C.textSecondary,
    lineHeight: 15,
  },
  keepBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderRadius: 11,
    backgroundColor: "rgba(139,92,246,.14)",
    borderWidth: 1,
    borderColor: "rgba(167,139,250,.45)",
  },
  keepBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#c4b5fd",
  },
  pressed: {
    opacity: 0.85,
  },
});