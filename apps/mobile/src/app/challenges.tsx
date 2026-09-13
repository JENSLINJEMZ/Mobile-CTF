import type {
  ChallengeCategoryDto,
  ChallengeSummaryDto,
  PaginatedResult,
} from "@ctf/shared";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { LucideIcon, type LucideName } from "@/components/lucide-icon";
import {
  C,
  categoryAccent,
  categoryIcon,
  difficultyLabel,
  withAlpha,
} from "@/constants/design";
import {
  listChallengeCategories,
  listChallenges,
} from "@/services/challenges";
import { addBookmark, listBookmarks, removeBookmark } from "@/services/bookmarks";
import { getLeaderboard } from "@/services/leaderboard";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useReduceMotion } from "@/hooks/use-reduce-motion";

/* ------------------------------------------------------------
   Palettes (ported from /home/jemzi/Developement/UI/2/challenge.html)
   ------------------------------------------------------------ */
const DIFF_RAMP: Record<string, { colors: [string, string]; fg: string }> = {
  EASY: { colors: ["#22c55e", "#15803d"], fg: "#ffffff" },
  MEDIUM: { colors: ["#fbbf24", "#f59e0b"], fg: "#1a0f00" },
  HARD: { colors: ["#ef4444", "#b91c1c"], fg: "#ffffff" },
  EXPERT: { colors: ["#f43f5e", "#9f1239"], fg: "#ffffff" },
};

const DIFF_GLOW: Record<string, string> = {
  EASY: "rgba(34,197,94,.16)",
  MEDIUM: "rgba(251,191,36,.16)",
  HARD: "rgba(239,68,68,.16)",
  EXPERT: "rgba(244,63,94,.16)",
};

type SortKey = "newest" | "popular" | "easiest" | "hardest";

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "popular", label: "Most Solves" },
  { id: "easiest", label: "Easiest First" },
  { id: "hardest", label: "Hardest First" },
];

const TAG_TONES = ["blue", "purple", "pink", "cyan", "gold", "green"] as const;

/* ------------------------------------------------------------
   Header
   ------------------------------------------------------------ */
function BrandMark() {
  return (
    <Svg width={30} height={21} viewBox="0 0 40 28">
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
  );
}

function MiniAvatar() {
  return (
    <Svg viewBox="0 0 40 40" width="100%" height="100%">
      <Defs>
        <SvgLinearGradient id="avBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#1a1030" />
          <Stop offset="100%" stopColor="#0a0616" />
        </SvgLinearGradient>
        <SvgLinearGradient id="avHood" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#6d28d9" />
          <Stop offset="100%" stopColor="#2a1a52" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="40" height="40" fill="url(#avBg)" rx="20" />
      <Path d="M20 6 Q30 8 30 18 Q30 30 20 34 Q10 30 10 18 Q10 8 20 6Z" fill="url(#avHood)" />
      <Ellipse cx="20" cy="21" rx="6" ry="7" fill="#05030c" />
      <Circle cx="17.5" cy="20" r="1" fill="#22d3ee" />
      <Circle cx="22.5" cy="20" r="1" fill="#22d3ee" />
      <Path d="M14 33 q6 -4 12 0 l4 7H10Z" fill="#0d0818" />
    </Svg>
  );
}

function ScriptDeco() {
  return (
    <View style={styles.scriptDeco}>
      <Text style={styles.scriptText}>
        Solve{"\n"}Learn{"\n"}Repeat
      </Text>
      <Svg width={44} height={9} viewBox="0 0 58 9" style={styles.scriptUnderline}>
        <Path
          d="M1.5 6 Q 28 -1.5 56.5 6"
          stroke="rgba(196,181,253,.7)"
          fill="none"
          strokeWidth={1.6}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

function AppHeader({
  level,
  filterActive,
  onOpenFilter,
  onSearch,
}: {
  level: number;
  filterActive: boolean;
  onOpenFilter: () => void;
  onSearch: () => void;
}) {
  return (
    <View style={styles.headerShell}>
      <View style={styles.appHeader}>
        <View style={styles.brand}>
          <BrandMark />
          <View style={styles.brandBlock}>
            <Text style={styles.brandName}>
              Mobile <Text style={styles.brandCtf}>CTF</Text>
            </Text>
            <Text style={styles.brandTagline}>Play · Learn · Hack · Grow</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={onSearch}
            accessibilityRole="button"
            accessibilityLabel="Search"
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressedDim]}
          >
            <LucideIcon name="search" size={18} color={C.textSecondary} />
          </Pressable>
          <Pressable
            onPress={onOpenFilter}
            accessibilityRole="button"
            accessibilityLabel="Filter"
            accessibilityState={{ selected: filterActive }}
            style={({ pressed }) => [styles.iconBtn, styles.iconBtnFilter, pressed && styles.pressedDim]}
          >
            <LucideIcon
              name="filter"
              size={18}
              color={filterActive ? C.purpleLight : C.textSecondary}
            />
            {filterActive ? <View style={styles.filterDot} /> : null}
          </Pressable>
          <Link href="/profile" asChild>
            <Pressable accessibilityRole="button" style={styles.avatarWrap}>
              <View style={styles.avatarBox}>
                <MiniAvatar />
              </View>
              <Text style={styles.avatarLv}>Lv. {level}</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      <View style={styles.pageHead}>
        <View style={styles.pageHeadCopy}>
          <Text style={styles.pageTitle}>Challenges</Text>
          <Text style={styles.pageSub}>Real problems. Real skills. On your device.</Text>
        </View>
        <ScriptDeco />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------
   Progress card
   ------------------------------------------------------------ */
function ProgressRing({ pct }: { pct: number }) {
  const circumference = 2 * Math.PI * 26;
  const offset = circumference * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <View style={styles.ringWrap}>
      <Svg width={66} height={66} viewBox="0 0 60 60">
        <Defs>
          <SvgLinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#a78bfa" />
            <Stop offset="100%" stopColor="#7c3aed" />
          </SvgLinearGradient>
        </Defs>
        <G rotation={-90} origin="30, 30">
          <Circle cx="30" cy="30" r="26" stroke="rgba(255,255,255,.08)" strokeWidth={5} fill="none" />
          <Circle
            cx="30"
            cy="30"
            r="26"
            stroke="url(#ringGrad)"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            fill="none"
          />
        </G>
      </Svg>
      <Text style={styles.ringVal}>{pct}%</Text>
    </View>
  );
}

function ProgressCard({ solved, total }: { solved: number; total: number }) {
  const pct = total > 0 ? Math.round((solved / total) * 100) : 0;
  return (
    <View style={styles.progressCard}>
      <View style={styles.progressGlow} />
      <View style={styles.progressInner}>
        <View style={styles.progLeft}>
          <View style={styles.progLeftTop}>
            <LucideIcon name="chart" size={15} color={C.purpleLight} />
            <Text style={styles.progLeftTopText}>Your Progress</Text>
          </View>
          <Text style={styles.progNum}>
            {solved} / {total}
          </Text>
          <Text style={styles.progLabel}>Challenges Solved</Text>
        </View>
        <ProgressRing pct={pct} />
        <View style={styles.progRight}>
          <Text style={styles.quote}>“A small step today, a hacker tomorrow.”</Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------
   Pills
   ------------------------------------------------------------ */
function ActivePills({
  categoryLabel,
  difficulty,
  search,
  onClearCat,
  onClearDiff,
  onClearSearch,
  onClearAll,
}: {
  categoryLabel?: string;
  difficulty?: string;
  search: string;
  onClearCat: () => void;
  onClearDiff: () => void;
  onClearSearch: () => void;
  onClearAll: () => void;
}) {
  const count = Number(Boolean(categoryLabel)) + Number(Boolean(difficulty)) + Number(Boolean(search));
  if (count === 0) return null;
  return (
    <View style={styles.pillsRow}>
      {categoryLabel ? (
        <View style={styles.pill}>
          <LucideIcon name="grid" size={10} color={C.purpleLight} />
          <Text style={styles.pillText}>{categoryLabel}</Text>
          <Pressable
            onPress={onClearCat}
            accessibilityRole="button"
            accessibilityLabel="Remove category filter"
            style={styles.pillX}
          >
            <LucideIcon name="x" size={10} color={C.purpleLight} />
          </Pressable>
        </View>
      ) : null}
      {difficulty ? (
        <View style={styles.pill}>
          <Text style={styles.pillText}>{difficulty}</Text>
          <Pressable
            onPress={onClearDiff}
            accessibilityRole="button"
            accessibilityLabel="Remove difficulty filter"
            style={styles.pillX}
          >
            <LucideIcon name="x" size={10} color={C.purpleLight} />
          </Pressable>
        </View>
      ) : null}
      {search ? (
        <View style={styles.pill}>
          <Text style={styles.pillText}>“{search}”</Text>
          <Pressable
            onPress={onClearSearch}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.pillX}
          >
            <LucideIcon name="x" size={10} color={C.purpleLight} />
          </Pressable>
        </View>
      ) : null}
      {count > 1 ? (
        <Pressable
          onPress={onClearAll}
          accessibilityRole="button"
          style={styles.pillClear}
        >
          <Text style={styles.pillClearText}>Clear all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------
   Challenge card (2/ reference design)
   ------------------------------------------------------------ */
function CardThumb({ item }: { item: ChallengeSummaryDto }) {
  const acc = categoryAccent(item.category.name);
  const icon: LucideName = categoryIcon(item.category.name);
  const locked = Boolean(item.locked);
  return (
    <View style={[styles.thumb, { borderColor: withAlpha(acc.color, 0.18) }]}>
      <LinearGradient
        colors={["#0b0a16", "#0b0818", "#04030a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["transparent", withAlpha(acc.color, 0.16)]}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.thumbHalo, { backgroundColor: acc.glow }]} />
      <View style={styles.thumbIcon}>
        <LucideIcon
          name={locked ? "lock" : icon}
          size={26}
          color={locked ? C.textMuted : acc.color}
        />
      </View>
      <LinearGradient
        colors={["transparent", "rgba(4,3,9,.82)"]}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.thumbCat} numberOfLines={1}>
        {locked ? "Locked" : String(item.category.name).toUpperCase()}
      </Text>
    </View>
  );
}

function TagPill({ name }: { name: string }) {
  const tone = TAG_TONES[name.length % TAG_TONES.length];
  const palette = {
    blue: { color: "#93c5fd", bg: "rgba(59,130,246,.14)", line: "rgba(59,130,246,.28)" },
    purple: { color: "#c4b5fd", bg: "rgba(139,92,246,.14)", line: "rgba(139,92,246,.28)" },
    pink: { color: "#f9a8d4", bg: "rgba(236,72,153,.14)", line: "rgba(236,72,153,.28)" },
    cyan: { color: "#67e8f9", bg: "rgba(34,211,238,.14)", line: "rgba(34,211,238,.28)" },
    gold: { color: "#fcd34d", bg: "rgba(251,191,36,.14)", line: "rgba(251,191,36,.28)" },
    green: { color: "#86efac", bg: "rgba(34,197,94,.14)", line: "rgba(34,197,94,.28)" },
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: palette.bg, borderColor: palette.line }]}>
      <Text style={[styles.tagText, { color: palette.color }]} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

function DifficultyPill({ difficulty }: { difficulty: string }) {
  const ramp = DIFF_RAMP[difficulty] ?? DIFF_RAMP.EASY;
  return (
    <LinearGradient colors={ramp.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.diffPill}>
      <Text style={[styles.diffPillText, { color: ramp.fg }]}>{difficultyLabel(difficulty)}</Text>
    </LinearGradient>
  );
}

function ChallengeCard({
  item,
  bookmarked,
  onBookmark,
}: {
  item: ChallengeSummaryDto;
  bookmarked: boolean;
  onBookmark: (id: number) => void;
}) {
  const solved = item.solvedByMe;
  const locked = Boolean(item.locked);
  const glow = DIFF_GLOW[item.difficulty] ?? "transparent";

  return (
    <View style={[styles.card, solved && styles.cardSolved]}>
      <View style={[styles.cardGlow, { backgroundColor: glow }]} />
      {solved ? (
        <View style={styles.cardSolvedRibbon}>
          <LucideIcon name="check" size={9} color="#ffffff" />
          <Text style={styles.cardSolvedText}>SOLVED</Text>
        </View>
      ) : null}

      <CardThumb item={item} />

      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <DifficultyPill difficulty={item.difficulty} />
          <View style={styles.ptsPill}>
            <LucideIcon name="star" size={10} color={C.gold} />
            <Text style={styles.ptsPillText}>{item.basePoints}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => onBookmark(item.id)}
          accessibilityRole="button"
          accessibilityLabel={bookmarked ? "Remove bookmark" : "Bookmark"}
          accessibilityState={{ selected: bookmarked }}
          hitSlop={6}
          style={({ pressed }) => [
            styles.bookmarkBtn,
            pressed && styles.pressedDim,
          ]}
        >
          <LucideIcon
            name="bookmark"
            size={16}
            color={bookmarked ? C.purpleLight : C.textMuted}
          />
        </Pressable>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.cardCategory} numberOfLines={1}>
          {locked
            ? (item.lockedReason ?? "Locked challenge")
            : String(item.category.name)}
        </Text>

        <View style={styles.cardTags}>
          {(item.tags ?? []).slice(0, 3).map((tag) => (
            <TagPill key={tag.id} name={tag.name} />
          ))}
        </View>

        <View style={styles.cardStats}>
          <View style={styles.stat}>
            <LucideIcon name="users" size={12} color={C.textMuted} />
            <Text style={styles.statText}>
              {item.solvedCount > 0 ? item.solvedCount.toLocaleString() : "0"} solves
            </Text>
          </View>
          <View style={styles.stat}>
            <LucideIcon
              name={locked ? "lock" : solved ? "check" : "shield"}
              size={12}
              color={locked ? C.textMuted : solved ? C.green : C.textMuted}
            />
            <Text style={[styles.statText, solved && { color: C.green }]}>
              {locked ? "Locked" : solved ? "Solved" : "Open"}
            </Text>
          </View>
        </View>
      </View>

      <Link href={`/challenge/${item.id}`} asChild>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
          style={styles.cardArrow}
        >
          <LucideIcon name="arrow" size={16} color="#ffffff" strokeWidth={2.4} />
        </Pressable>
      </Link>
    </View>
  );
}

/* ------------------------------------------------------------
   Filter sheet
   ------------------------------------------------------------ */
function DesignSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.sheetRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss sheet"
          style={styles.sheetScrim}
          onPress={onClose}
        />
        <View style={styles.sheetPanel}>
          <View style={styles.sheetGrab} />
          {children}
        </View>
      </View>
    </Modal>
  );
}

function SheetHead({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <View style={styles.sheetHead}>
      <Text style={styles.sheetHeadText}>{title}</Text>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        style={({ pressed }) => [styles.sheetClose, pressed && styles.pressedDim]}
      >
        <LucideIcon name="x" size={15} color={C.textSecondary} />
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------
   Screen
   ------------------------------------------------------------ */
export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { status: authStatus } = useAuthGate();
  const searchRef = useRef<TextInput | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dataRef = useRef<PaginatedResult<ChallengeSummaryDto> | null>(null);

  const [level, setLevel] = useState(1);
  const [categories, setCategories] = useState<ChallengeCategoryDto[]>([]);
  const [data, setData] = useState<PaginatedResult<ChallengeSummaryDto> | null>(null);
  const [progress, setProgress] = useState<{ solved: number; total: number }>({ solved: 0, total: 0 });

  const [category, setCategory] = useState<string | undefined>();
  const [difficulty, setDifficulty] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [sheet, setSheet] = useState<"filter" | "sort" | null>(null);
  const [pendingCategory, setPendingCategory] = useState<string | undefined>();
  const [pendingDifficulty, setPendingDifficulty] = useState<string | undefined>();

  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [bookmarkBusy, setBookmarkBusy] = useState<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterCount = Number(Boolean(category)) + Number(Boolean(difficulty));

  const load = useCallback(
    async (cat?: string, diff?: string, query?: string, append = false) => {
      try {
        setError(null);
        if (append) setLoadingMore(true);
        else setLoading(true);
        const page = append && dataRef.current ? dataRef.current.meta.page + 1 : 1;
        const result = await listChallenges({
          page,
          category: cat,
          difficulty: diff,
          search: query && query.trim().length >= 2 ? query.trim() : undefined,
        });
        const merged =
          append && dataRef.current
            ? { ...result, items: [...dataRef.current.items, ...result.items] }
            : result;
        dataRef.current = merged;
        setData(merged);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load challenges");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  useEffect(() => {
    void listChallengeCategories()
      .then(setCategories)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    void load(category, difficulty, search);
  }, [authStatus, category, difficulty, load, search]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void load(category, difficulty, search);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [category, difficulty, search, load]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    getLeaderboard("global", 1)
      .then((result) => setLevel(Math.max(1, Math.floor((result.me?.score ?? 0) / 250) + 1)))
      .catch(() => undefined);
  }, [authStatus]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    void (async () => {
      try {
        const [agg, solvedRes, bm] = await Promise.all([
          listChallenges({ page: 1 }),
          listChallenges({ page: 1, solved: "solved" }),
          listBookmarks(),
        ]);
        setProgress({ total: agg.meta.total, solved: solvedRes.meta.total });
        setBookmarks(new Set(bm.items.map((b) => b.challengeId)));
      } catch {
        // non-critical decorations — ignore
      }
    })();
  }, [authStatus]);

  const onToggleBookmark = useCallback(
    async (id: number) => {
      if (bookmarkBusy.has(id)) return;
      setBookmarkBusy((prev) => new Set(prev).add(id));
      const was = bookmarks.has(id);
      setBookmarks((prev) => {
        const next = new Set(prev);
        if (was) next.delete(id);
        else next.add(id);
        return next;
      });
      try {
        if (was) await removeBookmark(id);
        else await addBookmark(id);
      } catch {
        setBookmarks((prev) => {
          const next = new Set(prev);
          if (was) next.add(id);
          else next.delete(id);
          return next;
        });
      } finally {
        setBookmarkBusy((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [bookmarks, bookmarkBusy],
  );

  const sortedItems = useMemo(() => {
    const items = [...(data?.items ?? [])];
    const diffOrder = { EASY: 1, MEDIUM: 2, HARD: 3, EXPERT: 4 };
    switch (sort) {
      case "popular":
        items.sort((a, b) => b.solvedCount - a.solvedCount);
        break;
      case "easiest":
        items.sort((a, b) => (diffOrder[a.difficulty] ?? 9) - (diffOrder[b.difficulty] ?? 9));
        break;
      case "hardest":
        items.sort((a, b) => (diffOrder[b.difficulty] ?? 0) - (diffOrder[a.difficulty] ?? 0));
        break;
      default:
        break;
    }
    return items;
  }, [data, sort]);

  const hasFilters = Boolean(category || difficulty || search.trim().length >= 2);

  const openFilterSheet = useCallback(() => {
    setPendingCategory(category);
    setPendingDifficulty(difficulty);
    setSheet("filter");
  }, [category, difficulty]);

  const applyFilters = useCallback(() => {
    setCategory(pendingCategory);
    setDifficulty(pendingDifficulty);
    setSheet(null);
  }, [pendingCategory, pendingDifficulty]);

  if (authStatus !== "authenticated") {
    return (
      <View style={styles.root}>
        <LinearGradient
          colors={["#0a0913", "#07070f", "#06060d"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LinearGradient
          colors={["rgba(109,40,217,.20)", "transparent"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topGlow}
        />
        <View style={styles.centerWrap}>
          <View style={styles.infoCard}>
            <View style={styles.infoIc}>
              <LucideIcon name="shield" size={17} color={C.purpleLight} />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>Sign in required</Text>
              <Text style={styles.infoDesc}>Sign in to browse challenges and start earning points.</Text>
            </View>
          </View>
          <Link href="/auth/login" asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.signInButton, pressed && styles.pressedDim]}
            >
              <Text style={styles.signInLabel}>Sign in to view challenges</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    );
  }

  const catCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of data?.items ?? []) {
      map.set(item.category.name, (map.get(item.category.name) ?? 0) + 1);
    }
    return map;
  }, [data]);

  const ListHeader = (
    <View>
      <AppHeader
        level={level}
        filterActive={filterCount > 0}
        onOpenFilter={openFilterSheet}
        onSearch={() => searchRef.current?.focus()}
      />

      {error ? (
        <Pressable
          onPress={() => void load(category, difficulty, search)}
          accessibilityRole="button"
          style={styles.errBanner}
        >
          <LucideIcon name="radar" size={13} color={C.red} />
          <Text style={styles.errText} numberOfLines={2}>
            {error}. Tap to retry.
          </Text>
        </Pressable>
      ) : null}

      <View style={styles.toolbar}>
        <View style={styles.searchField}>
          <LucideIcon name="search" size={16} color={C.textMuted} />
          <TextInput
            ref={searchRef}
            value={search}
            onChangeText={setSearch}
            placeholder="Search challenges…"
            placeholderTextColor={C.textMuted}
            accessibilityLabel="Search challenges"
            accessibilityRole="search"
            autoCorrect={false}
            autoCapitalize="none"
            style={styles.searchInput}
            returnKeyType="search"
          />
          {search.length > 0 ? (
            <Pressable
              onPress={() => setSearch("")}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              style={styles.searchClear}
            >
              <LucideIcon name="x" size={12} color={C.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <Pressable
          onPress={openFilterSheet}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          style={({ pressed }) => [
            styles.toolBtn,
            filterCount > 0 && styles.toolBtnActive,
            pressed && styles.pressedDim,
          ]}
        >
          <LucideIcon name="filter" size={16} color={filterCount > 0 ? C.purpleLight : C.textPrimary} />
          <Text style={[styles.toolBtnLabel, filterCount > 0 && styles.toolBtnLabelActive]}>
            Filter
          </Text>
          {filterCount > 0 ? (
            <View style={styles.toolBtnCount}>
              <Text style={styles.toolBtnCountText}>{filterCount}</Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => setSheet("sort")}
          accessibilityRole="button"
          accessibilityLabel="Sort"
          style={({ pressed }) => [styles.toolBtn, pressed && styles.pressedDim]}
        >
          <LucideIcon name="sort" size={16} color={C.textPrimary} />
          <Text style={styles.toolBtnLabel}>Sort</Text>
        </Pressable>
      </View>

      <ActivePills
        categoryLabel={
          category
            ? (categories.find((x) => x.slug === category)?.name ??
              (categoryAccent(category).color && category))
            : undefined
        }
        difficulty={difficulty ? difficultyLabel(difficulty) : undefined}
        search={search.trim().length >= 2 ? search : ""}
        onClearCat={() => setCategory(undefined)}
        onClearDiff={() => setDifficulty(undefined)}
        onClearSearch={() => setSearch("")}
        onClearAll={() => {
          setCategory(undefined);
          setDifficulty(undefined);
          setSearch("");
        }}
      />

      <ProgressCard solved={progress.solved} total={progress.total} />

      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>
          {hasFilters ? `${(data?.items.length ?? 0)} Result${data?.items.length === 1 ? "" : "s"}` : "Recommended"}
        </Text>
        {!hasFilters ? (
          <Text style={styles.sectionCount}>
            {sortedItems.length.toLocaleString()} of {data?.meta.total ?? 0}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0a0913", "#07070f", "#06060d"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(109,40,217,.20)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGlow}
      />

      {!data ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 10, paddingBottom: 60 + insets.bottom }]}
        >
          {ListHeader}
          <View style={styles.cardList}>
            {[0, 1, 2].map((n) => (
              <SkeletonCard key={n} reduce={reduceMotion} />
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={sortedItems}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 10, paddingBottom: 60 + insets.bottom }]}
          onEndReached={() => {
            if (dataRef.current?.meta.hasNext && !loading && !loadingMore)
              void load(category, difficulty, search, true);
          }}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={loading && !!data}
              onRefresh={async () => {
                try {
                  await Promise.all([
                    load(category, difficulty, search, false),
                    listChallengeCategories().then(setCategories),
                  ]);
                } catch {
                  // error surfaced via load()
                }
              }}
              tintColor={C.purpleLight}
              colors={[C.purpleLight]}
              progressBackgroundColor="#12101f"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIc}>
                <LucideIcon name="flag" size={18} color={C.purpleLight} />
              </View>
              <Text style={styles.emptyTitle}>No challenges found</Text>
              <Text style={styles.emptyText}>
                Try a different category, difficulty or search term.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <ChallengeCard
              item={item}
              bookmarked={bookmarks.has(item.id)}
              onBookmark={(id) => void onToggleBookmark(id)}
            />
          )}
          ListFooterComponent={
            dataRef.current?.meta.hasNext ? (
              <View style={styles.footer}>
                {loadingMore ? (
                  <ActivityIndicator size="small" color={C.purpleLight} />
                ) : (
                  <>
                    <View style={styles.footerDot} />
                    <Text style={styles.footerText}>Keep scrolling…</Text>
                    <View style={styles.footerDot} />
                  </>
                )}
              </View>
            ) : null
          }
        />
      )}

      {/* filter sheet */}
      <DesignSheet visible={sheet === "filter"} onClose={() => setSheet(null)}>
        <SheetHead title="Filter Challenges" onClose={() => setSheet(null)} />
        <ScrollView style={styles.sheetBody} showsVerticalScrollIndicator={false}>
          <View style={styles.filterGroup}>
            <View style={styles.filterGroupHead}>
              <LucideIcon name="grid" size={12} color={C.textMuted} />
              <Text style={styles.filterGroupTitle}>Category</Text>
            </View>
            <View style={styles.catGrid}>
              <Pressable
                onPress={() => setPendingCategory(undefined)}
                accessibilityRole="button"
                accessibilityState={{ selected: pendingCategory === undefined }}
                style={({ pressed }) => [
                  styles.catBtn,
                  pendingCategory === undefined && styles.catBtnActive,
                  pressed && styles.pressedDim,
                ]}
              >
                <LucideIcon
                  name="grid"
                  size={16}
                  color={pendingCategory === undefined ? "#ffffff" : C.textSecondary}
                />
                <Text style={pendingCategory === undefined ? styles.catBtnActiveText : styles.catBtnText}>
                  All
                </Text>
                <View style={styles.catCount}>
                  <Text style={styles.catCountText}>{data?.meta.total ?? 0}</Text>
                </View>
              </Pressable>
              {categories.map((item) => {
                const active = pendingCategory === item.slug;
                return (
                  <Pressable
                    key={item.slug}
                    onPress={() => setPendingCategory(active ? undefined : item.slug)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.catBtn,
                      active && styles.catBtnActive,
                      pressed && styles.pressedDim,
                    ]}
                  >
                    <LucideIcon
                      name={categoryIcon(item.name)}
                      size={16}
                      color={active ? "#ffffff" : C.textSecondary}
                    />
                    <Text style={active ? styles.catBtnActiveText : styles.catBtnText} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.catCount}>
                      <Text style={styles.catCountText}>{catCounts.get(item.name) ?? 0}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <View style={styles.filterGroupHead}>
              <LucideIcon name="chart" size={12} color={C.textMuted} />
              <Text style={styles.filterGroupTitle}>Difficulty</Text>
            </View>
            <View style={styles.diffRow}>
              {(["EASY", "MEDIUM", "HARD", "EXPERT"] as const).map((key) => {
                const active = pendingDifficulty === key;
                const ramp = DIFF_RAMP[key];
                return (
                  <Pressable
                    key={key}
                    onPress={() => setPendingDifficulty(active ? undefined : key)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.diffBtn,
                      active && { backgroundColor: ramp.colors[0], borderColor: "transparent" },
                      pressed && styles.pressedDim,
                    ]}
                  >
                    <Text
                      style={[
                        styles.diffBtnText,
                        active && { color: ramp.fg },
                      ]}
                    >
                      {difficultyLabel(key)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
        <View style={styles.sheetFoot}>
          <Pressable
            onPress={() => {
              setPendingCategory(undefined);
              setPendingDifficulty(undefined);
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.btnGhost, pressed && styles.pressedDim]}
          >
            <Text style={styles.btnGhostText}>Reset</Text>
          </Pressable>
          <Pressable
            onPress={applyFilters}
            accessibilityRole="button"
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressedDim]}
          >
            <Text style={styles.btnPrimaryText}>Show results</Text>
            <LucideIcon name="arrow" size={15} color="#ffffff" strokeWidth={2.2} />
          </Pressable>
        </View>
      </DesignSheet>

      {/* sort sheet */}
      <DesignSheet visible={sheet === "sort"} onClose={() => setSheet(null)}>
        <SheetHead title="Sort" onClose={() => setSheet(null)} />
        <View style={styles.sheetBody}>
          <View style={styles.filterGroup}>
            <View style={styles.filterGroupHead}>
              <LucideIcon name="chart" size={12} color={C.textMuted} />
              <Text style={styles.filterGroupTitle}>Sort by</Text>
            </View>
            <View style={styles.catGridOne}>
              {SORT_OPTIONS.map((opt) => {
                const active = sort === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => setSort(opt.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.catBtn,
                      active && styles.catBtnActive,
                      pressed && styles.pressedDim,
                    ]}
                  >
                    <LucideIcon
                      name={opt.id === "newest" ? "clock" : opt.id === "popular" ? "users" : "chart"}
                      size={16}
                      color={active ? "#ffffff" : C.textSecondary}
                    />
                    <Text style={active ? styles.catBtnActiveText : styles.catBtnText}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
        <View style={styles.sheetFoot}>
          <Pressable
            onPress={() => setSheet(null)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressedDim]}
          >
            <Text style={styles.btnPrimaryText}>Apply</Text>
          </Pressable>
        </View>
      </DesignSheet>
    </View>
  );
}

/* ------------------------------------------------------------
   Skeleton
   ------------------------------------------------------------ */
function SkeletonCard({ reduce }: { reduce: boolean }) {
  const value = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(value, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, value]);

  return (
    <Animated.View style={[styles.skCard, { opacity: value }]}>
      <View style={styles.skThumb} />
      <View style={styles.skBody}>
        <View style={styles.skLineWide} />
        <View style={styles.skLine} />
        <View style={styles.skLineShort} />
      </View>
      <View style={styles.skPts} />
    </Animated.View>
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
    padding: 24,
    gap: 14,
  },
  listContent: {
    paddingHorizontal: 14,
  },
  pressedDim: {
    opacity: 0.75,
  },

  /* header */
  headerShell: {
    paddingBottom: 2,
  },
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
    flexShrink: 1,
  },
  brandBlock: {
    minWidth: 0,
  },
  brandName: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: C.textPrimary,
  },
  brandCtf: {
    color: C.purple,
  },
  brandTagline: {
    fontSize: 6.8,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.textMuted,
    marginTop: 3,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnFilter: {
    position: "relative",
  },
  filterDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.purpleLight,
    borderWidth: 1.5,
    borderColor: C.bgPrimary,
  },
  avatarWrap: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    marginLeft: 3,
  },
  avatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(167,139,250,.5)",
  },
  avatarLv: {
    fontSize: 8,
    fontWeight: "700",
    color: C.textSecondary,
  },

  /* page head */
  pageHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 14,
    marginBottom: 14,
  },
  pageHeadCopy: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 32,
    color: C.textPrimary,
  },
  pageSub: {
    fontSize: 11.5,
    color: C.textSecondary,
    lineHeight: 16,
    maxWidth: 230,
    marginTop: 6,
  },
  scriptDeco: {
    position: "relative",
    paddingTop: 4,
    flexShrink: 0,
  },
  scriptText: {
    fontSize: 17,
    lineHeight: 16,
    fontWeight: "600",
    fontStyle: "italic",
    textAlign: "right",
    color: "rgba(196,181,253,.95)",
    transform: [{ rotate: "-4deg" }],
  },
  scriptUnderline: {
    position: "absolute",
    bottom: -6,
    right: 0,
  },

  /* toolbar */
  toolbar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  searchField: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    height: 46,
    paddingHorizontal: 14,
    minWidth: 0,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: "rgba(18,16,31,.9)",
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 13,
    color: C.textPrimary,
    paddingVertical: 0,
  },
  searchClear: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,.06)",
  },
  toolBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: "rgba(18,16,31,.9)",
  },
  toolBtnActive: {
    borderColor: "rgba(167,139,250,.5)",
    backgroundColor: "rgba(139,92,246,.16)",
  },
  toolBtnLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textPrimary,
  },
  toolBtnLabelActive: {
    color: C.purpleLight,
  },
  toolBtnCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,92,246,.9)",
  },
  toolBtnCountText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#ffffff",
  },

  /* pills */
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingLeft: 11,
    paddingRight: 8,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(139,92,246,.13)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,.3)",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.purpleLight,
  },
  pillX: {
    width: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
  },
  pillClear: {
    height: 28,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,.05)",
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  pillClearText: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textSecondary,
  },

  /* progress card */
  progressCard: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,.24)",
    backgroundColor: "#0a0814",
  },
  progressGlow: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "rgba(139,92,246,.22)",
  },
  progressInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    minHeight: 118,
  },
  progLeft: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  progLeftTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  progLeftTopText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.purpleLight,
  },
  progNum: {
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.8,
    lineHeight: 30,
    color: "#ffffff",
  },
  progLabel: {
    fontSize: 10,
    color: C.textMuted,
  },
  ringWrap: {
    width: 66,
    height: 66,
    position: "relative",
    flexShrink: 0,
  },
  ringVal: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    textAlign: "center",
    textAlignVertical: "center",
    fontSize: 15,
    fontWeight: "800",
    color: "#ffffff",
  },
  progRight: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    justifyContent: "flex-end",
    paddingLeft: 6,
  },
  quote: {
    fontSize: 14,
    lineHeight: 15,
    fontWeight: "600",
    fontStyle: "italic",
    textAlign: "right",
    color: "rgba(233,227,255,.95)",
    transform: [{ rotate: "-2deg" }],
    maxWidth: 128,
    textShadowColor: "rgba(0,0,0,.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },

  /* section head */
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 2,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: C.textPrimary,
  },
  sectionCount: {
    fontSize: 10.5,
    color: C.textMuted,
  },

  /* error banner */
  errBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(244,63,94,.35)",
    backgroundColor: "rgba(244,63,94,.10)",
  },
  errText: {
    flex: 1,
    fontSize: 10.5,
    color: C.rose,
    lineHeight: 14,
  },

  /* cards */
  cardList: {
    gap: 11,
  },
  card: {
    position: "relative",
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    backgroundColor: "rgba(11,10,22,.92)",
  },
  cardSolved: {
    borderColor: "rgba(34,197,94,.35)",
  },
  cardGlow: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: "34%",
    opacity: 0.28,
  },
  cardSolvedRibbon: {
    position: "absolute",
    top: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    backgroundColor: "rgba(34,197,94,.9)",
    zIndex: 5,
  },
  cardSolvedText: {
    fontSize: 7.5,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#ffffff",
  },
  thumb: {
    position: "relative",
    width: 96,
    height: 118,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "#04030a",
  },
  thumbHalo: {
    position: "absolute",
    top: -20,
    right: -26,
    width: 90,
    height: 90,
    borderRadius: 45,
    opacity: 0.55,
  },
  thumbIcon: {
    position: "absolute",
    top: 26,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  thumbCat: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    fontSize: 7.2,
    fontWeight: "700",
    letterSpacing: 1,
    color: C.textSecondary,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: 40,
    paddingTop: 2,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  diffPill: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  diffPillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  ptsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(251,191,36,.12)",
    borderWidth: 1,
    borderColor: "rgba(251,191,36,.3)",
  },
  ptsPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: C.gold,
  },
  bookmarkBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 19,
    color: "#ffffff",
  },
  cardCategory: {
    fontSize: 10.5,
    color: C.textSecondary,
    marginTop: 3,
  },
  cardTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 8,
  },
  tag: {
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 9,
    fontWeight: "600",
  },
  cardStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    marginTop: 10,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    fontSize: 9.5,
    color: C.textSecondary,
  },
  cardArrow: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,92,246,.9)",
  },

  /* skeleton */
  skCard: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(18,16,31,.9)",
    borderWidth: 1,
    borderColor: C.border,
  },
  skThumb: {
    width: 96,
    height: 118,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,.06)",
  },
  skBody: {
    flex: 1,
    gap: 8,
    paddingTop: 4,
  },
  skLineWide: {
    height: 11,
    width: "58%",
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,.08)",
  },
  skLine: {
    height: 11,
    width: "88%",
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,.06)",
  },
  skLineShort: {
    height: 9,
    width: "40%",
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,.05)",
  },
  skPts: {
    width: 34,
    height: 26,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,.06)",
  },

  /* empty + footer */
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 20,
    gap: 6,
  },
  emptyIc: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,92,246,.12)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,.3)",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: C.textSecondary,
  },
  emptyText: {
    fontSize: 11,
    color: C.textMuted,
    textAlign: "center",
    maxWidth: 240,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
  footerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.purpleLight,
    opacity: 0.6,
  },
  footerText: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: C.textMuted,
  },

  /* sheets */
  sheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheetScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(4,3,9,.72)",
  },
  sheetPanel: {
    position: "relative",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(167,139,250,.25)",
    backgroundColor: "#0d0b18",
    maxHeight: "88%",
    paddingBottom: 16,
  },
  sheetGrab: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,.18)",
    marginTop: 12,
  },
  sheetHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
  },
  sheetHeadText: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: C.textSecondary,
  },
  sheetClose: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,.05)",
    borderWidth: 1,
    borderColor: C.border,
  },
  sheetBody: {
    paddingHorizontal: 18,
    flexGrow: 0,
  },
  filterGroup: {
    marginBottom: 22,
  },
  filterGroupHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  filterGroupTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: C.textMuted,
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catGridOne: {
    gap: 8,
  },
  catBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: "rgba(24,21,44,.7)",
    flexBasis: "47%",
    flexGrow: 1,
  },
  catBtnActive: {
    backgroundColor: "rgba(139,92,246,.92)",
    borderColor: "transparent",
  },
  catBtnText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: C.textSecondary,
  },
  catBtnActiveText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#ffffff",
  },
  catCount: {
    minWidth: 22,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    paddingHorizontal: 5,
    backgroundColor: "rgba(255,255,255,.06)",
  },
  catCountText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: C.textMuted,
  },
  diffRow: {
    flexDirection: "row",
    gap: 8,
  },
  diffBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: "rgba(24,21,44,.7)",
  },
  diffBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSecondary,
  },
  sheetFoot: {
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  btnGhost: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,.05)",
    borderWidth: 1,
    borderColor: C.borderStrong,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSecondary,
  },
  btnPrimary: {
    flex: 1.4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: "rgba(139,92,246,.92)",
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },

  /* auth gates */
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 13,
    backgroundColor: "rgba(24,21,44,.9)",
    borderWidth: 1,
    borderColor: C.border,
    alignSelf: "stretch",
  },
  infoIc: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,92,246,.12)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,.3)",
  },
  infoBody: {
    flex: 1,
    gap: 3,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: C.textPrimary,
  },
  infoDesc: {
    fontSize: 10,
    lineHeight: 14,
    color: C.textMuted,
  },
  signInButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(139,92,246,.16)",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,.4)",
    alignSelf: "stretch",
  },
  signInLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: C.purpleLight,
  },
});