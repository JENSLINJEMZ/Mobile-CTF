import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
} from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { Surface } from "@/components/surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useAuthGate } from "@/hooks/use-auth-gate";
import { useTheme } from "@/hooks/use-theme";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notifications";
import {
  disableDevicePush,
  enableDevicePush,
  isPushSupported,
  loadPushPref,
  type PushPref,
} from "@/services/push";
import { useNotificationStore } from "@/store/notification-store";
import { formatRelativeTime, notificationIcon } from "@/utils/notification";
import type { NotificationsResponse } from "@ctf/shared";

const PAGE_LIMIT = 20;

export default function NotificationsScreen() {
  const theme = useTheme();
  const { needsAuth } = useAuthGate();
  const { unreadCount, setUnreadCount, refreshBadge } = useNotificationStore();
  const [data, setData] = useState<NotificationsResponse | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyAll, setBusyAll] = useState(false);
  const [pushPref, setPushPref] = useState<PushPref | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

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
      void loadPushPref().then(setPushPref);
    }, [load]),
  );

  const onTogglePush = useCallback(
    async (value: boolean) => {
      setPushBusy(true);
      try {
        if (value) {
          await enableDevicePush();
        } else {
          await disableDevicePush();
        }
        setPushPref(await loadPushPref());
      } finally {
        setPushBusy(false);
      }
    },
    [],
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
      {needsAuth ? (
        <ThemedView style={styles.authBox}>
          <Ionicons name="notifications-outline" size={40} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.authText}>
            Sign in to see notifications for your solves, events, and achievements.
          </ThemedText>
          <Link href="/auth/login" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in to see notifications"
              style={({ pressed }) => [
                styles.signInButton,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="small"
                style={{ color: theme.onAccent, fontWeight: "600" }}
              >
                Sign in
              </ThemedText>
            </Pressable>
          </Link>
        </ThemedView>
      ) : (
        <>
      {isPushSupported() ? (
        <Surface radius={Radius.lg} style={styles.pushRow}>
          <ThemedView style={styles.flex}>
            <ThemedText type="smallBold">Push notifications</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Receive announcements and achievements on this device
            </ThemedText>
          </ThemedView>
          <Switch
            value={pushPref?.enabled === true}
            onValueChange={(value) => void onTogglePush(value)}
            disabled={pushBusy}
            trackColor={{ true: theme.accent }}
            thumbColor={theme.textInverse}
            accessibilityLabel="Push notifications"
          />
        </Surface>
      ) : null}

      <ThemedView style={styles.toolbar}>
        <Pressable
          onPress={toggleUnreadOnly}
          accessibilityRole="button"
          accessibilityState={{ selected: unreadOnly }}
          style={({ pressed }) => [
            styles.chip,
            { backgroundColor: unreadOnly ? theme.accentSubtle : theme.backgroundElement },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText
            type="small"
            style={{ color: unreadOnly ? theme.accent : theme.text }}
          >
            Unread only ({unreadCount})
          </ThemedText>
        </Pressable>
        {unreadCount > 0 ? (
          <Pressable
            disabled={busyAll}
            onPress={() => void onMarkAllRead()}
            accessibilityRole="button"
            accessibilityHint="Marks every notification as read"
            style={({ pressed }) => [styles.chip, { backgroundColor: theme.backgroundElement }, pressed && styles.pressed]}
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
        <Pressable onPress={() => void load()} accessibilityRole="button">
          <ThemedText
            type="small"
            style={{ color: theme.danger }}
            accessibilityRole="alert"
          >
            {error} — tap to retry
          </ThemedText>
        </Pressable>
      ) : null}

      {!data ? (
        <ActivityIndicator style={{ marginTop: Spacing.five }} color={theme.accent} />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void onRefresh()}
              tintColor={theme.accent}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => void loadMore()}
          renderItem={({ item }) => {
            const unread = item.readAt === null;
            return (
              <Pressable
                onPress={() => void onPressItem(item.id)}
                accessibilityRole="button"
                accessibilityLabel={
                  unread ? `${item.title}, unread` : item.title
                }
                style={({ pressed }) => [
                  pressed && styles.pressed,
                ]}
              >
                <Surface
                  radius={Radius.lg}
                  variant={unread ? "selected" : "elevated"}
                  style={styles.row}
                >
                  <ThemedView
                    style={[styles.iconBadge, unread && [styles.iconBadgeUnread, { backgroundColor: theme.accentSubtle }]]}
                  >
                    <Ionicons
                      name={notificationIcon(item.type)}
                      size={18}
                      color={unread ? theme.accent : theme.textSecondary}
                    />
                  </ThemedView>
                  <ThemedView style={styles.rowBody}>
                    <ThemedView style={styles.rowHeader}>
                      <ThemedText type="smallBold" numberOfLines={1} style={styles.flex}>
                        {item.title}
                      </ThemedText>
                      {unread ? (
                        <ThemedView
                          style={[styles.unreadDot, { backgroundColor: theme.accent }]}
                        />
                      ) : null}
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
                </Surface>
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
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  authBox: {
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.five,
  },
  authText: {
    textAlign: "center",
  },
  signInButton: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TouchTarget.Android,
    paddingHorizontal: Spacing.five,
  },
  pushRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    padding: Spacing.three,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
    minHeight: TouchTarget.Android,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.Android,
    justifyContent: "center",
    alignItems: "center",
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
    padding: Spacing.three,
    minHeight: TouchTarget.Android,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeUnread: {},
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
  },
  empty: {
    marginTop: Spacing.five,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});