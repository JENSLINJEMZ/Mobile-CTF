import type {
  ChallengeCategoryDto,
  ChallengeSummaryDto,
  PaginatedResult,
} from "@ctf/shared";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  FlatList,
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
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { LucideIcon, type LucideName } from "@/components/lucide-icon";
import { DIFF_COLORS, C, categoryAccent, categoryIcon, difficultyLabel, withAlpha } from "@/constants/design";
import {
  listChallengeCategories,
  listChallenges,
} from "@/services/challenges";
import { getLeaderboard } from "@/services/leaderboard";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useReduceMotion } from "@/hooks/use-reduce-motion";

/* ------------------------------------------------------------
   Header
   ------------------------------------------------------------ */
function BrandMark() {
  return (
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

function AppHeader({ level }: { level: number }) {
  const router = useRouter();
  return (
    <View style={styles.headerShell}>
      <View style={styles.appHeader}>
        <View style={styles.brand}>
          <BrandMark />
          <View>
            <Text style={styles.brandName}>
              Mobile <Text style={styles.brandCtf}>CTF</Text>
            </Text>
            <Text style={styles.brandTagline}>Learn · Hack · Compete</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push("/notifications")}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            style={styles.iconBtn}
          >
            <LucideIcon name="bell" size={17} color={C.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => router.push("/profile")}
            accessibilityRole="button"
            accessibilityLabel="Profile"
            style={styles.avatarWrap}
          >
            <View style={styles.avatarBox}>
              <MiniAvatar />
            </View>
            <Text style={styles.avatarLv}>Lv. {level}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.pageHead}>
        <View style={styles.pageHeadCopy}>
          <Text style={styles.pageTitle}>Challenges</Text>
          <Text style={styles.pageSub}>
            Browse the battleground. Pick a flag and break it.
          </Text>
        </View>
        <View style={styles.scriptDeco}>
          <Text style={styles.scriptText}>
            FIND{"\n"}THE{"\n"}FLAG
          </Text>
          <Svg width={34} height={7} viewBox="0 0 52 9" style={styles.scriptUnderline}>
            <Path d="M1.5 6 Q 26 -1.5 50.5 6" stroke="rgba(196,181,253,.7)" fill="none" strokeWidth={1.6} strokeLinecap="round" />
          </Svg>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------
   Small primitives
   ------------------------------------------------------------ */
function ErrBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Pressable
      onPress={onRetry}
      accessibilityRole="button"
      style={styles.errBanner}
    >
      <LucideIcon name="radar" size={13} color={C.red} />
      <Text style={styles.errText} numberOfLines={2}>
        {message}. Tap to retry.
      </Text>
    </Pressable>
  );
}

function SectionHead({ total, shown }: { total: number; shown: number }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionTitle}>All Challenges</Text>
      <Text style={styles.sectionHintText}>
        {total > 0 ? `${shown.toLocaleString()} of ${total.toLocaleString()}` : "Explore the board"}
      </Text>
    </View>
  );
}

const DIFF_FILTERS: { key?: string; label: string; tone: string }[] = [
  { label: "All", tone: "#a78bfa" },
  { key: "EASY", label: "Easy", tone: DIFF_COLORS.EASY },
  { key: "MEDIUM", label: "Medium", tone: DIFF_COLORS.MEDIUM },
  { key: "HARD", label: "Hard", tone: DIFF_COLORS.HARD },
  { key: "EXPERT", label: "Expert", tone: DIFF_COLORS.EXPERT },
];

/* ------------------------------------------------------------
   Challenge card
   ------------------------------------------------------------ */
function ChallengeCard({ item }: { item: ChallengeSummaryDto }) {
  const acc = categoryAccent(item.category.name);
  const diffColor = DIFF_COLORS[item.difficulty] ?? withAlpha(C.purpleLight, 1);
  const solved = item.solvedByMe;
  const locked = Boolean(item.locked);
  const icon: LucideName = categoryIcon(item.category.name);

  return (
    <Link href={`/challenge/${item.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Challenge ${item.title}, ${item.basePoints} points, ${difficultyLabel(item.difficulty)}`}
        style={({ pressed }) => [styles.cardOuter, pressed && styles.cardPressed]}
      >
        <LinearGradient
          colors={[acc.soft, "rgba(16,14,28,.95)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardBg}
        />
        <View style={[styles.cardRail, { backgroundColor: acc.color }]} />

        <View style={[styles.catIcon, { backgroundColor: acc.soft, borderColor: acc.line }]}>
          {locked ? (
            <LucideIcon name="lock" size={15} color={C.textSecondary} />
          ) : (
            <LucideIcon name={icon} size={15} color={acc.color} />
          )}
        </View>

        <View style={[styles.cardBody, locked && styles.cardBodyDim]}>
          <View style={styles.cardTop}>
            <Text style={[styles.cardCat, { color: acc.color }]}>
              {String(item.category.name).toUpperCase()}
            </Text>
            {solved ? (
              <View style={styles.solvedPill}>
                <LucideIcon name="check" size={9} color={C.green} />
                <Text style={styles.solvedText}>solved</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.cardMetaRow}>
            <View
              style={[
                styles.diffPill,
                {
                  backgroundColor: withAlpha(diffColor, 0.13),
                  borderColor: withAlpha(diffColor, 0.32),
                },
              ]}
            >
              <Text style={[styles.diffText, { color: diffColor }]}>
                {difficultyLabel(item.difficulty)}
              </Text>
            </View>
            <View style={styles.solvesRow}>
              <LucideIcon name="users" size={10} color={C.textMuted} />
              <Text style={styles.solvesText} numberOfLines={1}>
                {item.solvedCount > 0
                  ? `${item.solvedCount.toLocaleString()} solves`
                  : "Be the first to solve"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.cardPts}>{item.basePoints}</Text>
          <Text style={styles.cardPtsLabel}>PTS</Text>
          <LucideIcon
            name={solved ? "check" : "chevron"}
            size={12}
            color={solved ? C.green : C.textMuted}
          />
        </View>
      </Pressable>
    </Link>
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
      <View style={styles.skIcon} />
      <View style={styles.skBody}>
        <View style={styles.skLineWide} />
        <View style={styles.skLine} />
        <View style={styles.skLineShort} />
      </View>
      <View style={styles.skPts} />
    </Animated.View>
  );
}

/* ------------------------------------------------------------
   Screen
   ------------------------------------------------------------ */
export default function ChallengesScreen() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { status: authStatus } = useAuthGate();
  const [level, setLevel] = useState(1);
  const [categories, setCategories] = useState<ChallengeCategoryDto[]>([]);
  const [data, setData] = useState<PaginatedResult<ChallengeSummaryDto> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedDiff, setSelectedDiff] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const dataRef = useRef<PaginatedResult<ChallengeSummaryDto> | null>(null);

  const load = useCallback(
    async (category?: string, diff?: string, query?: string, append = false) => {
      try {
        setError(null);
        if (!append) setLoading(true);
        const page = append && dataRef.current ? dataRef.current.meta.page + 1 : 1;
        const result = await listChallenges({
          page,
          category,
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
    if (authStatus === "authenticated") {
      void load(selectedCategory, selectedDiff, search);
    }
  }, [authStatus, selectedCategory, selectedDiff, search, load]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void load(selectedCategory, selectedDiff, search);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [selectedCategory, selectedDiff, search, load]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    getLeaderboard("global", 1)
      .then((result) => setLevel(Math.max(1, Math.floor((result.me?.score ?? 0) / 250) + 1)))
      .catch(() => undefined);
  }, [authStatus]);

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
            <View style={[styles.infoIc, { borderColor: "rgba(96,165,250,.30)", backgroundColor: "rgba(96,165,250,.10)" }]}>
              <LucideIcon name="shield" size={17} color="#60a5fa" />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>Sign in required</Text>
              <Text style={styles.infoDesc}>
                Sign in to browse challenges and start earning points.
              </Text>
            </View>
          </View>
          <Link href="/auth/login" asChild>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.signInButton, pressed && styles.cardPressed]}
            >
              <Text style={styles.signInLabel}>Sign in to view challenges</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    );
  }

  const ListHeader = (
    <View>
      <AppHeader level={level} />

      {error ? <ErrBanner message={error} onRetry={() => void load(selectedCategory, selectedDiff, search)} /> : null}

      <View style={styles.searchWrap}>
        <LucideIcon name="search" size={15} color={C.textMuted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search challenges…"
          placeholderTextColor={C.textMuted}
          accessibilityLabel="Search challenges"
          accessibilityRole="search"
          autoCorrect={false}
          autoCapitalize="none"
          style={styles.searchInput}
        />
        {search.length > 0 ? (
          <Pressable
            onPress={() => setSearch("")}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.searchClear}
          >
            <LucideIcon name="x" size={13} color={C.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {!reduceMotion ? (
        <View style={styles.diffRow}>
          {DIFF_FILTERS.map((f) => {
            const active = selectedDiff === f.key;
            return (
              <Pressable
                key={f.label}
                onPress={() => setSelectedDiff(active ? undefined : f.key)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by difficulty ${f.label}`}
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [
                  styles.diffChip,
                  {
                    borderColor: active ? f.tone : C.border,
                    backgroundColor: active ? withAlpha(f.tone, 0.13) : "rgba(18,16,31,.9)",
                  },
                  pressed && styles.chipPressed,
                ]}
              >
                <Text style={[styles.diffChipText, { color: active ? f.tone : C.textSecondary }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {[{ slug: undefined, name: "All", id: 0, sortOrder: -1 }, ...categories].map((item) => {
          const active = selectedCategory === item.slug;
          const acc = item.slug ? categoryAccent(item.name) : ACCENT_ALL;
          return (
            <Pressable
              key={item.slug ?? "all"}
              onPress={() => setSelectedCategory(active ? undefined : item.slug)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by category ${item.name}`}
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.catChip,
                { borderColor: active ? acc.line : C.border, backgroundColor: active ? acc.soft : "rgba(18,16,31,.9)" },
                pressed && styles.chipPressed,
              ]}
            >
              <LucideIcon name={item.slug ? categoryIcon(item.name) : "shield"} size={12} color={active ? acc.color : C.textMuted} />
              <Text style={[styles.catChipText, { color: active ? C.textPrimary : C.textSecondary }]}>
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionHead total={data?.meta.total ?? 0} shown={data?.items.length ?? 0} />
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
          data={data.items}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 10, paddingBottom: 60 + insets.bottom }]}
          onEndReached={() => {
            if (dataRef.current?.meta.hasNext && !loading)
              void load(selectedCategory, selectedDiff, search, true);
          }}
          onEndReachedThreshold={0.4}
          refreshing={loading && !!data}
          refreshControl={
            <RefreshControl
              refreshing={loading && !!data}
              onRefresh={async () => {
                try {
                  await Promise.all([
                    load(selectedCategory, selectedDiff, search, false),
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
              <View style={[styles.emptyIc, { backgroundColor: "rgba(139,92,246,.12)", borderColor: "rgba(139,92,246,.30)" }]}>
                <LucideIcon name="flag" size={18} color={C.purpleLight} />
              </View>
              <Text style={styles.emptyTitle}>No challenges found</Text>
              <Text style={styles.emptyText}>
                {search || selectedCategory || selectedDiff
                  ? "Try changing your filters or search."
                  : "Challenges will appear here once they're published."}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cardList}>
              <ChallengeCard item={item} />
            </View>
          )}
          ListFooterComponent={
            dataRef.current?.meta.hasNext ? (
              <View style={styles.footer}>
                <View style={styles.footerDot} />
                <Text style={styles.footerText}>Loading more…</Text>
                <View style={styles.footerDot} />
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const ACCENT_ALL = categoryAccent("all");

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
  },
  brandName: {
    fontSize: 16,
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
    marginTop: 2,
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
    marginBottom: 16,
  },
  pageHeadCopy: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 29,
    color: C.textPrimary,
  },
  pageSub: {
    fontSize: 11,
    color: C.textSecondary,
    lineHeight: 16,
    maxWidth: 205,
    marginTop: 5,
  },
  scriptDeco: {
    position: "relative",
    paddingTop: 2,
  },
  scriptText: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: "600",
    fontStyle: "italic",
    textAlign: "right",
    color: "rgba(196,181,253,.9)",
    transform: [{ rotate: "-4deg" }],
  },
  scriptUnderline: {
    position: "absolute",
    bottom: -6,
    right: 0,
    transform: [{ rotate: "-4deg" }],
  },

  /* error + search */
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
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    height: 42,
    paddingHorizontal: 13,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "rgba(18,16,31,.92)",
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: C.textPrimary,
    paddingVertical: 0,
  },
  searchClear: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,.06)",
  },

  /* difficulty + category filters */
  diffRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  diffChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
  },
  diffChipText: {
    fontSize: 9.5,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  chipPressed: {
    transform: [{ scale: 0.96 }],
  },
  catRow: {
    gap: 7,
    paddingRight: 14,
    marginBottom: 14,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipText: {
    fontSize: 10.5,
    fontWeight: "600",
  },

  /* section head */
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: C.textPrimary,
  },
  sectionHintText: {
    fontSize: 9.5,
    color: C.textMuted,
  },

  /* challenge cards */
  cardList: {
    gap: 8,
  },
  cardOuter: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 11,
    overflow: "hidden",
  },
  cardBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardRail: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: 3,
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
  },
  catIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  cardBodyDim: {
    opacity: 0.55,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardCat: {
    fontSize: 7.5,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  solvedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "rgba(52,211,153,.12)",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,.32)",
  },
  solvedText: {
    fontSize: 7.5,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: C.green,
  },
  cardTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: C.textPrimary,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  diffPill: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  diffText: {
    fontSize: 7.5,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  solvesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  solvesText: {
    fontSize: 9,
    color: C.textMuted,
    flexShrink: 1,
  },
  cardRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 1,
  },
  cardPts: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: C.textPrimary,
  },
  cardPtsLabel: {
    fontSize: 7.5,
    fontWeight: "700",
    letterSpacing: 1,
    color: C.textMuted,
  },

  /* skeleton */
  skCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 11,
    borderRadius: 14,
    backgroundColor: "rgba(18,16,31,.9)",
    borderWidth: 1,
    borderColor: C.border,
  },
  skIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,.07)",
  },
  skBody: {
    flex: 1,
    gap: 6,
  },
  skLineWide: {
    height: 8,
    width: "52%",
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,.07)",
  },
  skLine: {
    height: 11,
    width: "88%",
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,.09)",
  },
  skLineShort: {
    height: 8,
    width: "34%",
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,.06)",
  },
  skPts: {
    width: 30,
    height: 22,
    borderRadius: 7,
    backgroundColor: "rgba(255,255,255,.07)",
  },

  /* empty + footer */
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 42,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyIc: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 2,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: C.textPrimary,
  },
  emptyText: {
    fontSize: 10,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 14,
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
    borderWidth: 1,
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