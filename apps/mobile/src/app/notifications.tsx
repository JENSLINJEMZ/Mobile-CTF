import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
} from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";
import { useNotificationStore } from "@/store/notification-store";
import { formatRelativeTime, notificationIcon } from "@/utils/notification";
import type { NotificationsResponse } from "@ctf/shared";

const PAGE_LIMIT = 20;

export default function NotificationsScreen() {
  const theme = useTheme();
  const { unreadCount, setUnreadCount, refreshBadge } = useNotificationStore();
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyAll, setBusyAll] = useState(false);

  const loadPage = useCallback(
    async (page: number, onlyUnread: boolean) => {
      const res = await getNotifications({
        page,
        limit: PAGE_LIMIT,
        unreadOnly: onlyUnread,
      });
      setData((prev) =>
        page === 1
          ? res
          : prev
            ? {
                ...res,
                items: [...prev.items, ...res.items],
              }
            : res,
      );
      setUnreadCount(res.unreadCount);
      return res;
    },
    [setUnreadCount],
  );

  const load = useCallback(
    async (onlyUnread = unreadOnly) => {
      setError(null);
      try {
        await loadPage(1, onlyUnread);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load notifications",
        );
      }
    },
    [loadPage, unreadOnly],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
      await refreshBadge();
    } finally {
      setRefreshing(false);
    }
  }, [load, refreshBadge]);

  const loadMore = useCallback(async () => {
    if (!data || !data.meta.hasNext || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadPage(data.meta.page + 1, unreadOnly);
    } catch {
      // Keep the list as-is; user can pull-to-refresh to retry.
    } finally {
      setLoadingMore(false);
    }
  }, [data, loadingMore, loadPage, unreadOnly]);

  const toggleUnreadOnly = useCallback(() => {
    const next = !unreadOnly;
    setUnreadOnly(next);
    void load(next);
  }, [load, unreadOnly]);

  const onPressItem = useCallback(
    async (id: number) => {
      const current = data?.items.find((n) => n.id === id);
      if (!current || current.readAt) return;
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((n) =>
                n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
              ),
            }
          : prev,
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
      try {
        await markNotificationRead(id);
      } catch {
        // Optimistic; badge will reconcile on next refresh.
      }
    },
    [data, setUnreadCount, unreadCount],
  );

  const onMarkAllRead = useCallback(async () => {
    setBusyAll(true);
    try {
      await markAllNotificationsRead();
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((n) =>
                n.readAt ? n : { ...n, readAt: new Date().toISOString() },
              ),
            }
          : prev,
      );
      setUnreadCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update");
    } finally {
      setBusyAll(false);
    }
  }, [setUnreadCount]);

  return (
    <ScreenShell title="Notifications">
      <ThemedView style={styles.toolbar}>
        <Pressable
          onPress={toggleUnreadOnly}
          style={({ pressed }) => [
            styles.chip,
            unreadOnly && styles.chipActive,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText
            type="small"
            style={unreadOnly ? styles.chipTextActive : undefined}
          >
            Unread only ({unreadCount})
          </ThemedText>
        </Pressable>
        {unreadCount > 0 ? (
          <Pressable
            disabled={busyAll}
            onPress={() => void onMarkAllRead()}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            {busyAll ? (
              <ActivityIndicator size="small" />
            ) : (
              <ThemedText type="small">Mark all read</ThemedText>
            )}
          </Pressable>
        ) : null}
      </ThemedView>

      {error ? (
        <Pressable onPress={() => void load()}>
          <ThemedText type="small" style={{ color: "#dc2626" }}>
            {error} — tap to retry
          </ThemedText>
        </Pressable>
      ) : null}

      {!data ? (
        <ActivityIndicator style={{ marginTop: Spacing.five }} />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => void loadMore()}
          renderItem={({ item }) => {
            const unread = item.readAt === null;
            return (
              <Pressable
                onPress={() => void onPressItem(item.id)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedView
                  type="backgroundElement"
                  style={[styles.iconBadge, unread && styles.iconBadgeUnread]}
                >
                  <Ionicons
                    name={notificationIcon(item.type)}
                    size={18}
                    color={unread ? "#2563eb" : theme.textSecondary}
                  />
                </ThemedView>
                <ThemedView style={styles.rowBody}>
                  <ThemedView style={styles.rowHeader}>
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.flex}>
                      {item.title}
                    </ThemedText>
                    {unread ? <ThemedView style={styles.unreadDot} /> : null}
                  </ThemedView>
                  {item.body ? (
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      numberOfLines={3}
                    >
                      {item.body}
                    </ThemedText>
                  ) : null}
                  <ThemedText type="small" themeColor="textSecondary">
                    {formatRelativeTime(item.createdAt)}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          }}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                style={{ marginTop: Spacing.three }}
                size="small"
              />
            ) : null
          }
          ListEmptyComponent={
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.empty}
            >
              {unreadOnly
                ? "No unread notifications"
                : "No notifications yet"}
            </ThemedText>
          }
        />
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: "rgba(128,128,128,0.15)",
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: "rgba(37,99,235,0.18)",
  },
  chipTextActive: {
    color: "#2563eb",
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: Spacing.four,
    flexGrow: 1,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.three,
    alignItems: "flex-start",
    borderRadius: 16,
    padding: Spacing.three,
    backgroundColor: "rgba(128,128,128,0.10)",
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeUnread: {
    backgroundColor: "rgba(37,99,235,0.18)",
  },
  rowBody: {
    flex: 1,
    gap: Spacing.half,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#2563eb",
  },
  empty: {
    marginTop: Spacing.five,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.6,
  },
});