import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from "react-native-svg";

import { HeroArt } from "@/components/hero-art";
import { LucideIcon, type LucideName } from "@/components/lucide-icon";
import { ErrorState } from "@/components/state-views";
import { difficultyColor } from "@/constants/theme";
import { listChallenges } from "@/services/challenges";
import { listEvents, joinEvent } from "@/services/events";
import { getAchievements } from "@/services/achievements";
import { getLeaderboard } from "@/services/leaderboard";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useTheme } from "@/hooks/use-theme";
import type {
  ChallengeSummaryDto,
  EventSummaryDto,
  LeaderboardMeDto,
} from "@ctf/shared";

/* ------------------------------------------------------------
   Design tokens (ported from /home/jemzi/Developement/UI)
   ------------------------------------------------------------ */
const C = {
  bgPrimary: "#07070f",
  bgSecondary: "#0b0a16",
  surface: "#12101f",
  surface2: "#181530",
  purple: "#8b5cf6",
  purpleLight: "#a78bfa",
  purpleDeep: "#6d28d9",
  blue: "#60a5fa",
  cyan: "#22d3ee",
  pink: "#ec4899",
  green: "#34d399",
  orange: "#f59e0b",
  red: "#f43f5e",
  rose: "#fb7185",
  gold: "#fbbf24",
  textPrimary: "#f2f0fb",
  textSecondary: "#b0abc9",
  textMuted: "#7a7699",
  border: "rgba(255, 255, 255, 0.07)",
  borderStrong: "rgba(255, 255, 255, 0.13)",
};

type Accent = { color: string; soft: string; line: string; glow: string };

const ACCENTS: Record<string, Accent> = {
  purple: { color: "#a78bfa", soft: "rgba(167,139,250,.12)", line: "rgba(167,139,250,.32)", glow: "rgba(167,139,250,.28)" },
  red: { color: "#f87171", soft: "rgba(248,113,113,.12)", line: "rgba(248,113,113,.32)", glow: "rgba(248,113,113,.28)" },
  green: { color: "#34d399", soft: "rgba(52,211,153,.12)", line: "rgba(52,211,153,.32)", glow: "rgba(52,211,153,.28)" },
  orange: { color: "#f59e0b", soft: "rgba(245,158,11,.12)", line: "rgba(245,158,11,.32)", glow: "rgba(245,158,11,.28)" },
  blue: { color: "#60a5fa", soft: "rgba(96,165,250,.12)", line: "rgba(96,165,250,.32)", glow: "rgba(96,165,250,.28)" },
  pink: { color: "#ec4899", soft: "rgba(236,72,153,.12)", line: "rgba(236,72,153,.32)", glow: "rgba(236,72,153,.28)" },
  cyan: { color: "#22d3ee", soft: "rgba(34,211,238,.12)", line: "rgba(34,211,238,.32)", glow: "rgba(34,211,238,.28)" },
};

const ACCENT_ORDER = ["green", "orange", "blue", "pink", "cyan", "purple", "red"];

const CATEGORY_ICON: Record<string, LucideName> = {
  cryptography: "lock",
  forensics: "file",
  "mobile security": "bug",
  "web exploitation": "globe",
  "reverse engineering": "cpu",
  network: "activity",
  hardware: "logic",
  osint: "search",
  web: "globe",
  recon: "radar",
};

export function categoryIcon(category: string): LucideName {
  return CATEGORY_ICON[String(category ?? "").toLowerCase()] ?? "cube";
}

function withAlpha(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function difficultyLabel(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function cleanMarkdown(value: string): string {
  return value
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s*#{1,6}\s*/, "")
        .replace(/^\s*[-*+]\s*/, "")
        .replace(/[*_`]/g, ""),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLeadingTitle(value: string, title: string): string {
  const clean = value.trim();
  const prefix = title.trim();
  if (clean.startsWith(prefix)) {
    const rest = clean
      .slice(prefix.length)
      .replace(/^\s*[-–—:.]?\s*/, "")
      .trim();
    if (rest) return rest;
  }
  return clean;
}

/* ------------------------------------------------------------
   Header
   ------------------------------------------------------------ */
function Header({
  level,
  onSearch,
  onBell,
  onAvatar,
}: {
  level: number;
  onSearch: () => void;
  onBell: () => void;
  onAvatar: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.brand}>
          <Svg width={26} height={19} viewBox="0 0 40 28">
            <Defs>
              <SvgLinearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0%" stopColor="#c4b5fd" />
                <Stop offset="55%" stopColor="#8b5cf6" />
                <Stop offset="100%" stopColor="#6d28d9" />
              </SvgLinearGradient>
            </Defs>
            <Path
              d="M2 26 L12 2 L20 13.5 L28 2 L38 26 L29 26 L24.5 15.5 L20 22 L15.5 15.5 L11 26 Z"
              fill="url(#brandGrad)"
            />
          </Svg>
          <Text style={styles.brandName}>
            Mobile <Text style={styles.brandCtf}>CTF</Text>
          </Text>
        </View>

        <View style={styles.headerActions}>
          <Pressable onPress={onSearch} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Search challenges">
            <LucideIcon name="search" size={17} color={C.textSecondary} />
          </Pressable>
          <Pressable onPress={onBell} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Notifications">
            <View style={styles.notifDot} />
            <LucideIcon name="bell" size={17} color={C.textSecondary} />
          </Pressable>
          <Pressable onPress={onAvatar} style={styles.avatar} accessibilityRole="button" accessibilityLabel="Profile">
            <LinearGradient
              colors={["#2c1c52", "#0e0919"]}
              style={styles.avatarFill}
            >
              <View style={styles.avatarFace} />
              <View style={styles.avatarBody} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>

      <View style={styles.headerBottom}>
        <Text style={styles.tagline}>Learn · Hack · Compete · Anywhere</Text>
        <View style={styles.headerMeta}>
          <Text style={styles.quote}>“Same Curiosity,{`\n`}A Wider World.”</Text>
          <Text style={styles.levelTag}>Lv. {level}</Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------
   Hero event card
   ------------------------------------------------------------ */
function HeroCard({
  event,
  running,
  onPress,
}: {
  event: EventSummaryDto;
  running: boolean;
  onPress: () => void;
}) {
  const deadline = new Date(event.endsAt).getTime() - Date.now();
  const [joined, setJoined] = useState(event.joinedByMe);

  useEffect(() => {
    setJoined(event.joinedByMe);
  }, [event.joinedByMe]);

  const handlePress = () => {
    if (!joined) void joinEvent(event.id).catch(() => undefined);
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open event ${event.title}`}
      onPress={handlePress}
      style={styles.heroCard}
    >
      <View style={styles.heroBg}>
        <HeroArt />
      </View>
      <LinearGradient
        colors={["rgba(6,5,12,.96)", "rgba(8,6,16,.88)", "rgba(10,7,20,.5)", "rgba(10,7,20,.12)"]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.heroScrim}
      />
      <LinearGradient
        colors={["rgba(6,5,12,.82)", "rgba(6,5,12,0)"]}
        start={{ x: 0, y: 1 }}
        end={{ x: 0, y: 0 }}
        style={styles.heroScrim}
      />

      <View style={styles.heroContent}>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeLabel}>
            {running ? "Live Event" : "Upcoming Event"}
          </Text>
        </View>

        <Text style={styles.heroTitle} numberOfLines={2}>
          {event.title}
        </Text>
        <Text style={styles.heroDesc} numberOfLines={1}>
          {event.description
            ? stripLeadingTitle(cleanMarkdown(event.description), event.title)
            : "Solve challenges, earn points, and be the best!"}
        </Text>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <View style={styles.hsTop}>
              <LucideIcon name="users" size={11} color={C.purpleLight} />
              <Text style={styles.hsTopValue}>
                {event.participantCount.toLocaleString()}
              </Text>
            </View>
            <Text style={styles.hsLabel}>Players</Text>
          </View>
          <View style={styles.heroStat}>
            <View style={styles.hsTop}>
              <LucideIcon name="users" size={11} color={C.purpleLight} />
              <Text style={styles.hsTopValue}>
                {event.teamCount.toLocaleString()}
              </Text>
            </View>
            <Text style={styles.hsLabel}>Teams</Text>
          </View>
          <View style={styles.heroStat}>
            <View style={styles.hsTop}>
              <LucideIcon name="clock" size={11} color={C.purpleLight} />
              <Text style={styles.hsTopValue}>{formatRemaining(deadline)}</Text>
            </View>
            <Text style={styles.hsLabel}>{running ? "Time Left" : "Starts In"}</Text>
          </View>
        </View>

        <LinearGradient
          colors={joined ? ["#059669", "#047857"] : ["#8b5cf6", "#7c3aed", "#6d28d9"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.joinBtn}
        >
          <Text style={styles.joinLabel}>
            {joined ? "Joined" : "Join Event"}
          </Text>
          <LucideIcon name={joined ? "check" : "arrow"} size={14} color="#ffffff" />
        </LinearGradient>
      </View>

      <View style={styles.heroDeco} pointerEvents="none">
        <Text style={styles.decoScript}>HACK{`\n`}LEARN{`\n`}GROW</Text>
        <Svg width={33} height={7} viewBox="0 0 44 8" style={styles.decoUnderline}>
          <Path
            d="M1.5 5.5 Q 22 -1.5 42.5 5"
            stroke="rgba(196,181,253,.75)"
            fill="none"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </Svg>
        <Text style={styles.decoBottom}>Different Skills{`\n`}Same Passion</Text>
      </View>
    </Pressable>
  );
}

/* ------------------------------------------------------------
   Quick nav
   ------------------------------------------------------------ */
type QuickLink = {
  label: string;
  icon: LucideName;
  accent: string;
  href: `/challenges` | `/events` | `/terminal` | `/toolkit` | `/teams` | `/leaderboard`;
};

const QUICK_LINKS: QuickLink[] = [
  { label: "Challenges", icon: "shield", accent: "purple", href: "/challenges" },
  { label: "Events", icon: "calendar", accent: "red", href: "/events" },
  { label: "Terminal", icon: "terminal", accent: "green", href: "/terminal" },
  { label: "Tools", icon: "briefcase", accent: "orange", href: "/toolkit" },
  { label: "Teams", icon: "users", accent: "blue", href: "/teams" },
  { label: "Leaderboard", icon: "bars", accent: "pink", href: "/leaderboard" },
];

function QuickNav() {
  const router = useRouter();
  return (
    <View style={styles.quickNav}>
      {QUICK_LINKS.map((link) => {
        const acc = ACCENTS[link.accent];
        return (
          <Pressable
            key={link.label}
            accessibilityRole="button"
            accessibilityLabel={`Go to ${link.label}`}
            onPress={() => router.push(link.href)}
            style={styles.qnItem}
          >
            <LinearGradient
              colors={[acc.soft, "rgba(18,16,31,.92)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.qnIcon, { borderColor: acc.line }]}
            >
              <LucideIcon name={link.icon} size={18} color={acc.color} />
            </LinearGradient>
            <Text style={styles.qnLabel}>{link.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ------------------------------------------------------------
   Learning grid
   ------------------------------------------------------------ */
function LearnCard({ item, index }: { item: ChallengeSummaryDto; index: number }) {
  const theme = useTheme();
  const acc = ACCENTS[ACCENT_ORDER[index % ACCENT_ORDER.length]];
  const pct = Math.round((item.solvedCount / Math.max(1, item.solvedCount)) * 100);
  const diffColor = difficultyColor(item.difficulty, theme);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Challenge ${item.title}`}
      style={styles.learnCard}
    >
      <LinearGradient
        colors={[acc.soft, "rgba(16,14,28,.95)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.learnCardBg}
      >
        <View style={styles.learnIcon}>
          <LucideIcon name={categoryIcon(item.category.name)} size={18} color={acc.color} />
        </View>
        <Text style={styles.learnTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.learnCat} numberOfLines={1}>
          {item.category.name}
        </Text>
        <View
          style={[
            styles.diff,
            { backgroundColor: withAlpha(diffColor, 0.14), borderColor: withAlpha(diffColor, 0.3) },
          ]}
        >
          <Text style={[styles.diffText, { color: diffColor }]}>
            {difficultyLabel(item.difficulty)}
          </Text>
        </View>
        <View style={styles.learnProgress}>
          <View style={styles.lpBar}>
            <LinearGradient
              colors={[acc.color, acc.glow]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.lpFill, { width: `${pct}%` }]}
            />
          </View>
          <Text style={styles.lpPct}>{pct}%</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/* ------------------------------------------------------------
   Offline packs / toolkit rows
   ------------------------------------------------------------ */
function LinkTile({
  icon,
  iconColor,
  iconBg,
  iconBorder,
  title,
  subtitle,
  chips,
  onPress,
}: {
  icon: LucideName;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
  title: string;
  subtitle: string;
  chips?: LucideName[];
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={styles.linkTile}
    >
      <LinearGradient
        colors={[C.surface2, "rgba(14,12,24,.92)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.linkIcon, { backgroundColor: iconBg, borderColor: iconBorder }]}>
        <LucideIcon name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.linkText}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkSub} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {chips ? (
        <View style={styles.toolChips}>
          {chips.map((chip) => (
            <View key={chip} style={styles.toolChip}>
              <LucideIcon name={chip} size={12} color={C.textSecondary} />
            </View>
          ))}
        </View>
      ) : null}
      <LucideIcon name="chevron" size={14} color={C.textMuted} />
    </Pressable>
  );
}

/* ------------------------------------------------------------
   Stat tile (progress card)
   ------------------------------------------------------------ */
function Stat({ value, label, icon, tone }: { value: string; label: string; icon: LucideName; tone: string }) {
  const tones: Record<string, { color: string; border: string; bg: string }> = {
    gold: { color: C.gold, border: "rgba(251,191,36,.28)", bg: "rgba(251,191,36,.10)" },
    blue: { color: "#60a5fa", border: "rgba(96,165,250,.28)", bg: "rgba(96,165,250,.10)" },
    red: { color: "#f87171", border: "rgba(248,113,113,.28)", bg: "rgba(248,113,113,.10)" },
    pink: { color: "#f472b6", border: "rgba(244,114,182,.28)", bg: "rgba(244,114,182,.10)" },
  };
  const t = tones[tone];
  return (
    <View style={styles.stat}>
      <View style={[styles.statIc, { borderColor: t.border, backgroundColor: t.bg }]}>
        <LucideIcon name={icon} size={12} color={t.color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------
   Screen
   ------------------------------------------------------------ */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status: authStatus } = useAuthGate();
  const [challenges, setChallenges] = useState<ChallengeSummaryDto[]>([]);
  const [events, setEvents] = useState<EventSummaryDto[]>([]);
  const [me, setMe] = useState<LeaderboardMeDto | null>(null);
  const [badges, setBadges] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const [challengeResult, eventList] = await Promise.all([
        listChallenges({ page: 1 }),
        listEvents().catch(() => []),
      ]);
      setChallenges(challengeResult.items);
      setEvents(eventList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (authStatus !== "authenticated") {
      setMe(null);
      setBadges(null);
      return;
    }
    getLeaderboard("global", 1)
      .then((result) => setMe(result.me))
      .catch(() => setMe(null));
    getAchievements()
      .then((result) => setBadges(result.earnedCount))
      .catch(() => setBadges(null));
  }, [authStatus]);

  const runningEvent = events.find((e) => e.status === "RUNNING") ?? null;
  const scheduledEvent = runningEvent ?? events.find((e) => e.status === "SCHEDULED") ?? null;
  const heroEvent = scheduledEvent;

  const level = Math.max(1, Math.floor((me?.score ?? 0) / 250) + 1);
  const featured = challenges.slice(0, 4);
  const nextUnsolved = challenges.find((c) => !c.solvedByMe) ?? challenges[0] ?? null;
  const missionDeadline = runningEvent ? new Date(runningEvent.endsAt).getTime() - Date.now() : 0;
  const milestone = Math.max(500, Math.ceil((me?.score ?? 0) / 500) * 500);
  const xpPct = Math.min(100, Math.round(((me?.score ?? 0) / milestone) * 100));

  const heroCta = () => {
    if (heroEvent) router.push(`/event/${heroEvent.id}`);
  };

  const missionCta = () => {
    if (nextUnsolved) router.push(`/challenge/${nextUnsolved.id}`);
  };

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

      {loading && challenges.length === 0 ? (
        <View style={styles.centerWrap}>
          <ErrorState message="Loading home…" onRetry={() => void load()} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + 12, paddingBottom: 40 + insets.bottom },
          ]}
        >
          <Header
            level={level}
            onSearch={() => router.push("/challenges")}
            onBell={() => router.push("/notifications")}
            onAvatar={() => router.push("/profile")}
          />

          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}

          {heroEvent ? (
            <HeroCard event={heroEvent} running={Boolean(runningEvent)} onPress={heroCta} />
          ) : null}

          <QuickNav />

          {featured.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>Continue Learning</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="See all challenges"
                  onPress={() => router.push("/challenges")}
                >
                  <View style={styles.linkBtn}>
                    <Text style={styles.linkBtnText}>See All</Text>
                    <Text style={styles.linkBtnText}>→</Text>
                  </View>
                </Pressable>
              </View>
              <View style={styles.learningGrid}>
                {featured.map((item, index) => (
                  <LearnCard key={item.id} item={item} index={index} />
                ))}
              </View>
            </View>
          ) : null}

          <LinkTile
            icon="download"
            iconColor="#60a5fa"
            iconBg="rgba(59,130,246,.13)"
            iconBorder="rgba(59,130,246,.30)"
            title="Offline Packs"
            subtitle="Download challenges and play anytime, anywhere."
            onPress={() => router.push("/toolkit")}
          />

          <View style={styles.statsRow}>
            <View style={[styles.card, styles.missionCard]}>
              <View style={styles.cardHead}>
                <View style={styles.chTitle}>
                  <LucideIcon name="radar" size={13} color={C.purpleLight} />
                  <Text style={styles.chTitleText}>Daily Mission</Text>
                </View>
                <View style={styles.chMeta}>
                  <LucideIcon name="clock" size={10} color={C.textMuted} />
                  <Text style={styles.chMetaText}>
                    {runningEvent ? formatCountdown(missionDeadline) : "24:00:00"}
                  </Text>
                </View>
              </View>

              <Text style={styles.missionQ}>Can you find the flag?</Text>

              <View style={styles.pillRow}>
                <View style={styles.pill}>
                  <LucideIcon name="star" size={9} color={C.gold} />
                  <Text style={styles.pillText}>+{nextUnsolved?.basePoints ?? 100} XP</Text>
                </View>
                <View style={styles.pill}>
                  <LucideIcon name="heart" size={9} color="#f87171" />
                  <Text style={styles.pillText}>
                    +{Math.max(10, Math.round((nextUnsolved?.basePoints ?? 100) / 2))} Bonus
                  </Text>
                </View>
              </View>

              <LinearGradient
                colors={["#8b5cf6", "#7c3aed", "#6d28d9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startBtn}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Start Challenge"
                  onPress={missionCta}
                  style={styles.startBtnFill}
                >
                  <Text style={styles.startBtnLabel}>Start Challenge</Text>
                  <LucideIcon name="arrow" size={12} color="#ffffff" />
                </Pressable>
              </LinearGradient>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHead}>
                <View style={styles.chTitle}>
                  <LucideIcon name="bars" size={13} color="#f472b6" />
                  <Text style={styles.chTitleText}>Your Progress</Text>
                </View>
                <View style={styles.chMeta}>
                  <Text style={styles.chMetaText}>Level {level}</Text>
                </View>
              </View>

              <View style={styles.xpRow}>
                <Text style={styles.xpText}>
                  {(me?.score ?? 0).toLocaleString()} / {milestone.toLocaleString()} XP
                </Text>
              </View>
              <View style={styles.xpBar}>
                <LinearGradient
                  colors={["#7c3aed", "#a78bfa", "#c4b5fd"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.xpFill, { width: `${xpPct}%` }]}
                />
              </View>
              <View style={styles.statGrid}>
                <Stat value={String(me?.solves ?? "—")} label="Solved" icon="trophy" tone="gold" />
                <Stat value="—" label="First Blood" icon="flag" tone="blue" />
                <Stat value="—" label="Day Streak" icon="flame" tone="red" />
                <Stat value={String(badges ?? "—")} label="Badges" icon="medal" tone="pink" />
              </View>
            </View>
          </View>

          <LinkTile
            icon="wrench"
            iconColor={C.cyan}
            iconBg="rgba(34,211,238,.12)"
            iconBorder="rgba(34,211,238,.30)"
            title="Cyber Toolkit"
            subtitle="Powerful tools for every hacker."
            chips={["terminal", "hash", "search", "image", "doc"]}
            onPress={() => router.push("/toolkit")}
          />
        </ScrollView>
      )}
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
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 14,
    gap: 0,
  },

  /* header */
  header: {
    paddingVertical: 6,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: C.textPrimary,
  },
  brandCtf: {
    color: C.purple,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 6.5,
    height: 6.5,
    borderRadius: 3.25,
    backgroundColor: C.red,
  },
  avatar: {
    width: 29,
    height: 29,
    borderRadius: 15,
    marginLeft: 3,
    borderWidth: 1.2,
    borderColor: "rgba(167,139,250,.45)",
    overflow: "hidden",
  },
  avatarFill: {
    flex: 1,
  },
  avatarFace: {
    position: "absolute",
    top: 7,
    left: 8.5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#e9c9a6",
  },
  avatarBody: {
    position: "absolute",
    bottom: -2,
    left: 3,
    width: 23,
    height: 12,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: "#1a1130",
  },
  headerBottom: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  tagline: {
    fontSize: 7.5,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.textMuted,
    paddingTop: 4,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  quote: {
    fontSize: 8,
    lineHeight: 10.5,
    fontStyle: "italic",
    textAlign: "right",
    color: "rgba(176,171,201,.68)",
  },
  levelTag: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.2,
    color: C.purpleLight,
    backgroundColor: "rgba(139,92,246,.14)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,.3)",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden",
  },

  /* hero */
  heroCard: {
    marginTop: 4,
    borderRadius: 18,
    minHeight: 228,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,.22)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  heroBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContent: {
    padding: 15,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    backgroundColor: "rgba(244,63,94,.13)",
    borderWidth: 1,
    borderColor: "rgba(244,63,94,.38)",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.red,
  },
  liveBadgeLabel: {
    fontSize: 7.5,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: C.rose,
  },
  heroTitle: {
    marginTop: 9,
    fontSize: 21,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 23,
    color: C.textPrimary,
    maxWidth: "88%",
  },
  heroDesc: {
    marginTop: 7,
    fontSize: 10,
    lineHeight: 15,
    color: "rgba(226,222,245,.78)",
    maxWidth: "78%",
  },
  heroStats: {
    flexDirection: "row",
    gap: 15,
    marginTop: 12,
  },
  heroStat: {
    flexDirection: "column",
    gap: 3,
  },
  hsTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hsTopValue: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#ece9fb",
  },
  hsLabel: {
    fontSize: 7.5,
    color: "rgba(176,171,201,.7)",
  },
  joinBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 38,
    borderRadius: 11,
    paddingHorizontal: 15,
    alignSelf: "flex-start",
    maxWidth: "62%",
  },
  joinLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  heroDeco: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  decoScript: {
    position: "absolute",
    top: 12,
    right: 13,
    fontSize: 16,
    lineHeight: 16,
    fontWeight: "600",
    fontStyle: "italic",
    textAlign: "right",
    color: "rgba(233,227,255,.82)",
    transform: [{ rotate: "-4deg" }],
  },
  decoUnderline: {
    position: "absolute",
    top: 62,
    right: 14,
    transform: [{ rotate: "-4deg" }],
  },
  decoBottom: {
    position: "absolute",
    right: 13,
    bottom: 13,
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "right",
    lineHeight: 10.5,
    color: "rgba(233,227,255,.55)",
  },

  /* quick nav */
  quickNav: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
  },
  qnItem: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  qnIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  qnLabel: {
    fontSize: 7.5,
    fontWeight: "600",
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 9,
  },

  /* continue learning */
  section: {
    marginTop: 16,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 2,
    marginBottom: 9,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: C.textPrimary,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  linkBtnText: {
    fontSize: 10,
    fontWeight: "600",
    color: C.purpleLight,
  },
  learningGrid: {
    flexDirection: "row",
    gap: 7,
  },
  learnCard: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  learnCardBg: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 7,
    gap: 5,
  },
  learnIcon: {
    marginBottom: 1,
  },
  learnTitle: {
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 11.5,
    letterSpacing: -0.1,
    color: "#f0eefb",
    minHeight: 23,
  },
  learnCat: {
    fontSize: 7,
    color: C.textMuted,
    lineHeight: 9.5,
    letterSpacing: 0.1,
  },
  diff: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 5.5,
    paddingVertical: 1.5,
  },
  diffText: {
    fontSize: 7,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  learnProgress: {
    marginTop: "auto",
    paddingTop: 2,
  },
  lpBar: {
    height: 3.5,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,.08)",
    overflow: "hidden",
  },
  lpFill: {
    height: "100%",
    borderRadius: 2,
  },
  lpPct: {
    marginTop: 3,
    fontSize: 7,
    fontWeight: "600",
    color: C.textMuted,
    textAlign: "right",
  },

  /* offline / toolkit tiles */
  linkTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 15,
    padding: 11,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  linkIcon: {
    width: 33,
    height: 33,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  linkText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  linkTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: C.textPrimary,
  },
  linkSub: {
    fontSize: 9.5,
    color: C.textMuted,
    lineHeight: 12,
  },
  toolChips: {
    flexDirection: "row",
    gap: 4,
    marginRight: 6,
  },
  toolChip: {
    width: 23,
    height: 23,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.05)",
    borderWidth: 1,
    borderColor: C.border,
  },

  /* mission + progress */
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "rgba(24,21,44,.9)",
    borderWidth: 1,
    borderColor: C.border,
  },
  missionCard: {
    borderColor: "rgba(139,92,246,.22)",
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 10,
  },
  chTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    minWidth: 0,
  },
  chTitleText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: C.textPrimary,
  },
  chMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  chMetaText: {
    fontSize: 8.5,
    fontWeight: "600",
    color: C.textMuted,
  },
  missionQ: {
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 14,
    color: C.textPrimary,
    marginBottom: 10,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 12,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,.05)",
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 7,
  },
  pillText: {
    fontSize: 8,
    fontWeight: "700",
    color: C.textSecondary,
  },
  startBtn: {
    marginTop: "auto",
    overflow: "hidden",
    height: 33,
    borderRadius: 10,
  },
  startBtnFill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  startBtnLabel: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  xpRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 5,
  },
  xpText: {
    fontSize: 8.5,
    fontWeight: "600",
    color: C.textMuted,
  },
  xpBar: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,.08)",
    overflow: "hidden",
    marginBottom: 12,
  },
  xpFill: {
    height: "100%",
    borderRadius: 2,
  },
  statGrid: {
    flexDirection: "row",
    gap: 4,
  },
  stat: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    textAlign: "center",
  },
  statIc: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statValue: {
    fontSize: 11,
    fontWeight: "800",
    color: C.textPrimary,
  },
  statLabel: {
    fontSize: 6.8,
    color: C.textMuted,
    lineHeight: 8,
    textAlign: "center",
  },
});