import type { AnnouncementDto, EventSummaryDto } from "@ctf/shared";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";

import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { listAnnouncements } from "@/services/announcements";
import { joinEvent, leaveEvent, listEvents } from "@/services/events";
import { useAuthStore } from "@/store/auth-store";

function statusColor(status: EventSummaryDto["status"]): string {
  switch (status) {
    case "DRAFT":
      return "#6b7280";
    case "SCHEDULED":
      return "#2563eb";
    case "RUNNING":
      return "#16a34a";
    case "ENDED":
      return "#dc2626";
  }
}

function remainingLabel(event: EventSummaryDto): string {
  if (event.status === "SCHEDULED") {
    const s = event.startsInSeconds ?? 0;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    return `Starts in ${h > 0 ? `${h}h ` : ""}${m}m`;
  }
  if (event.status === "RUNNING") {
    const end = new Date(event.endsAt).getTime();
    const diff = Math.max(0, end - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  }
  if (event.status === "ENDED") return "Ended";
  return "Draft";
}

export default function EventsScreen() {
  const authStatus = useAuthStore((s) => s.status);
  const [events, setEvents] = useState<EventSummaryDto[] | null>(null);
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [items, announcements] = await Promise.all([
        listEvents(),
        listAnnouncements().catch(() => []),
      ]);
      setEvents(items);
      setAnnouncements(announcements);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onAction = useCallback(
    async (event: EventSummaryDto) => {
      if (busyId !== null) return;
      setBusyId(event.id);
      try {
        if (event.joinedByMe) {
          await leaveEvent(event.id);
        } else {
          await joinEvent(event.id);
        }
        void load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed");
      } finally {
        setBusyId(null);
      }
    },
    [busyId, load],
  );

  const onPullRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const isAuthenticated = authStatus === "authenticated";

  return (
    <ScreenShell title="Events">
      {announcements.length > 0 ? (
        <FlatList
          horizontal
          data={announcements}
          keyExtractor={(item) => String(item.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            gap: Spacing.two,
            paddingBottom: Spacing.two,
          }}
          renderItem={({ item }) => (
            <ThemedView
              type="backgroundElement"
              style={[
                styles.announcement,
                item.pinned && styles.announcementPinned,
              ]}
            >
              <ThemedText type="smallBold" numberOfLines={1}>
                {item.pinned ? "📌 " : ""}
                {item.title}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={2}
              >
                {item.body}
              </ThemedText>
            </ThemedView>
          )}
        />
      ) : null}

      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : null}

      {!events ? (
        <LoadingState />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor="#2563eb"
            />
          }
          renderItem={({ item }) => (
            <ThemedView type="backgroundElement" style={styles.card}>
              <Link href={`/event/${item.id}`} asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open event ${item.title}`}
                  style={({ pressed }) => [
                    styles.cardHeader,
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedView style={styles.cardBody}>
                    <ThemedView style={styles.titleRow}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {item.title}
                      </ThemedText>
                      <ThemedView
                        style={[
                          styles.statusDot,
                          { backgroundColor: statusColor(item.status) },
                        ]}
                      />
                    </ThemedView>
                    <ThemedText
                      type="small"
                      style={{ color: statusColor(item.status) }}
                    >
                      {remainingLabel(item)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.participantCount} participant
                      {item.participantCount === 1 ? "" : "s"} ·{" "}
                      {item.teamCount} team{item.teamCount === 1 ? "" : "s"}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              </Link>

              {isAuthenticated && item.status !== "ENDED" ? (
                <Pressable
                  disabled={busyId !== null || item.status === "DRAFT"}
                  onPress={() => void onAction(item)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    item.joinedByMe ? `Leave event ${item.title}` : `Join event ${item.title}`
                  }
                  accessibilityState={{
                    disabled: busyId !== null || item.status === "DRAFT",
                  }}
                  style={({ pressed }) => [
                    styles.actionButton,
                    item.joinedByMe ? styles.actionJoined : styles.actionJoin,
                    (busyId !== null || item.status === "DRAFT") &&
                      styles.pressed,
                    pressed && styles.pressed,
                  ]}
                >
                  {busyId === item.id ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <ThemedText
                      type="small"
                      style={{ color: "#ffffff", fontWeight: "600" }}
                    >
                      {item.joinedByMe
                        ? "Leave"
                        : item.status === "DRAFT"
                          ? "Draft"
                          : "Join"}
                    </ThemedText>
                  )}
                </Pressable>
              ) : null}
            </ThemedView>
          )}
          ListEmptyComponent={
            <EmptyState message="No events right now. Check back soon!" />
          }
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  announcement: {
    width: 260,
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  announcementPinned: {
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  card: {
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardBody: {
    flex: 1,
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionButton: {
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: Spacing.two + Spacing.half,
  },
  actionJoin: {
    backgroundColor: "#2563eb",
  },
  actionJoined: {
    backgroundColor: "#dc2626",
  },
  pressed: {
    opacity: 0.6,
  },
});
