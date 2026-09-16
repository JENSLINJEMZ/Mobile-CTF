import type { EventSummaryDto } from "@ctf/shared";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppHeader } from "@/components/app-header";
import { EventCard } from "@/components/event-card";
import { FeaturedCarousel } from "@/components/featured-carousel";
import { LucideIcon } from "@/components/lucide-icon";
import { ErrorState, LoadingState, EmptyState } from "@/components/state-views";
import { C } from "@/constants/design";
import { Spacing } from "@/constants/theme";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";
import { listEvents } from "@/services/events";
import { getLeaderboard } from "@/services/leaderboard";
import { useTheme } from "@/hooks/use-theme";

type EventTab = "upcoming" | "ongoing" | "past";

const TABS: { key: EventTab; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "ongoing", label: "Ongoing" },
  { key: "past", label: "Past" },
];

function tabMatches(tab: EventTab, status: EventSummaryDto["status"]): boolean {
  switch (tab) {
    case "upcoming":
      return status === "SCHEDULED" || status === "DRAFT";
    case "ongoing":
      return status === "RUNNING";
    case "past":
      return status === "ENDED";
  }
}

const COMMUNITY = [
  {
    icon: "users" as const,
    title: "Weekly CTF",
    meta: "Every Sunday",
    desc: "Short challenges. Big learning.",
    count: "48 events",
  },
  {
    icon: "cap" as const,
    title: "Workshop Series",
    meta: "Various Dates",
    desc: "Hands-on sessions with experts.",
    count: "12 events",
  },
];

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const router = useRouter();
  const [tab, setTab] = useState<EventTab>("upcoming");
  const [events, setEvents] = useState<EventSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [level, setLevel] = useState(1);
  const authStatus = useAuthStore((s) => s.status);
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const load = useCallback(async () => {
    try {
      setError(null);
      const items = await listEvents();
      setEvents(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    getLeaderboard("global", 1)
      .then((result) =>
        setLevel(Math.max(1, Math.floor((result.me?.score ?? 0) / 250) + 1)),
      )
      .catch(() => undefined);
  }, [authStatus]);

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const grouped = (events ?? []).reduce<Record<EventTab, EventSummaryDto[]>>(
    (acc, event) => {
      for (const t of TABS) {
        if (tabMatches(t.key, event.status)) {
          acc[t.key].push(event);
          break;
        }
      }
      return acc;
    },
    { upcoming: [], ongoing: [], past: [] },
  );

  const activeEvents = grouped[tab];
  const featured = activeEvents.slice(0, 3);
  const sectionTitle =
    tab === "upcoming"
      ? "Featured Events"
      : tab === "ongoing"
        ? "Happening Now"
        : "Past Events";

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

      {!events ? (
        <LoadingState />
      ) : error && events.length === 0 ? (
        <ErrorState message={error} onRetry={() => void load()} />
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
          {/* App header */}
          <View style={styles.headerWrap}>
            <AppHeader level={level} unreadCount={unreadCount} />
          </View>

          {/* Page head */}
          <View style={styles.pageHead}>
            <View style={styles.titleBlock}>
              <LinearGradient
                colors={["rgba(139,92,246,.22)", "rgba(20,16,34,.9)"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.pageIcon}
              >
                <LucideIcon name="calendar" size={20} color="#c4b5fd" />
              </LinearGradient>
              <View>
                <Text style={styles.pageTitle}>Events</Text>
                <Text style={styles.pageSub}>
                  Compete. Learn. Be part of the community.
                </Text>
              </View>
            </View>
            <View style={styles.scriptDeco}>
              <Text style={styles.decoText}>
                More{`\n`}Than{`\n`}Just CTF
              </Text>
            </View>
          </View>

          {/* Tab bar */}
          <View style={styles.tabBar}>
            {TABS.map((t) => {
              const active = tab === t.key;
              const count = grouped[t.key].length;
              return (
                <Pressable
                  key={t.key}
                  accessibilityRole="tab"
                  accessibilityLabel={`${t.label} events, ${count}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => setTab(t.key)}
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
                  <Text
                    style={[styles.tabLabel, active && styles.tabLabelActive]}
                  >
                    {t.label}
                  </Text>
                  {count > 0 ? (
                    <Text
                      style={[
                        styles.tabCount,
                        active && styles.tabCountActive,
                      ]}
                    >
                      {count}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {/* Featured carousel */}
          {featured.length > 0 ? (
            <FeaturedCarousel
              events={featured}
              onEventPress={(event) => router.push(`/event/${event.id}`)}
            />
          ) : null}

          {/* Featured / list section */}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>{sectionTitle}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="See all events"
              onPress={() => setTab(tab)}
              style={styles.linkBtn}
            >
              <Text style={styles.linkBtnText}>See All</Text>
              <Text style={styles.linkBtnText}>→</Text>
            </Pressable>
          </View>

          {activeEvents.length === 0 ? (
            <EmptyState message="No events right now. Check back soon!" />
          ) : (
            <View style={styles.eventList}>
              {activeEvents.map((event, index) => (
                <View key={event.id} style={styles.cardWrap}>
                  <LinearGradient
                    colors={[C.surface2, "rgba(11,10,22,.94)"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardBg}
                  />
                  <EventCard event={event} index={index} />
                </View>
              ))}
            </View>
          )}

          {/* Community events grid */}
          <View style={[styles.sectionHead, styles.communityHead]}>
            <Text style={styles.sectionTitle}>Community Events</Text>
            <View style={styles.linkBtn}>
              <Text style={styles.linkBtnText}>See All</Text>
              <Text style={styles.linkBtnText}>→</Text>
            </View>
          </View>
          <View style={styles.communityGrid}>
            {COMMUNITY.map((c, index) => (
              <CommunityCard key={c.title} item={c} index={index} />
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function CommunityCard({
  item,
  index,
}: {
  item: (typeof COMMUNITY)[number];
  index: number;
}) {
  const theme = useTheme();
  const accents = [C.purple, C.purpleLight];
  const accent = accents[index % accents.length];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Community event ${item.title}`}
      style={({ pressed }) => [styles.communityCard, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={[C.surface2, "rgba(11,10,22,.94)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.commIcon,
          { borderColor: theme.borderStrong },
        ]}
      >
        <LucideIcon name={item.icon} size={18} color={accent} />
      </View>
      <View>
        <Text style={styles.commTitle}>{item.title}</Text>
        <View style={styles.commMeta}>
          <LucideIcon name="calendar" size={11} color={C.purpleLight} />
          <Text style={[styles.commMetaText, { color: theme.accent }]}>
            {item.meta}
          </Text>
        </View>
        <Text style={styles.commDesc}>{item.desc}</Text>
      </View>
      <View style={styles.commFoot}>
        <Text style={styles.commCount}>{item.count}</Text>
        <LucideIcon name="chevron" size={14} color={C.purpleLight} />
      </View>
    </Pressable>
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
    fontSize: 16,
    lineHeight: 17,
    fontWeight: "600",
    fontStyle: "italic",
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
    marginBottom: 18,
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
  tabCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,.14)",
    color: C.textSecondary,
  },
  tabCountActive: {
    backgroundColor: "rgba(255,255,255,.25)",
    color: "#fff",
  },

  /* section head */
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 2,
    marginBottom: 12,
  },
  communityHead: {
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: C.textPrimary,
  },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
  },
  linkBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: C.purpleLight,
  },

  /* event list */
  eventList: {
    flexDirection: "column",
    gap: 11,
    marginBottom: 22,
  },
  cardWrap: {
    position: "relative",
    borderRadius: 15,
    overflow: "hidden",
  },
  cardBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 15,
  },

  /* community grid */
  communityGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  communityCard: {
    flex: 1,
    flexDirection: "column",
    gap: 9,
    padding: 13,
    borderRadius: 15,
    overflow: "hidden",
  },
  commIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,92,246,.14)",
    borderWidth: 1,
  },
  commTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: -0.25,
    lineHeight: 16,
    color: "#fff",
    marginBottom: 3,
  },
  commMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 3,
  },
  commMetaText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  commDesc: {
    fontSize: 11,
    lineHeight: 15,
    color: C.textSecondary,
  },
  commFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 4,
  },
  commCount: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textMuted,
  },
  pressed: {
    opacity: 0.85,
  },
});