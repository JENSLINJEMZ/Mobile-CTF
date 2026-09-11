import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ToastProvider } from "@/components/toast";
import { useAuthStore } from "@/store/auth-store";
import { useNotificationStore } from "@/store/notification-store";
import {
  autoRegisterPushedToken,
  subscribeToPushEvents,
} from "@/services/push";
import { startSubmissionGateway } from "@/services/offline-submissions";
import { useTheme } from "@/hooks/use-theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const refreshBadge = useNotificationStore((s) => s.refreshBadge);
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);

  useEffect(() => {
    void useAuthStore.getState().hydrate();
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      void refreshBadge();
      void autoRegisterPushedToken();
    } else if (status !== "loading") {
      setUnreadCount(0);
    }
  }, [status, refreshBadge, setUnreadCount]);

  useEffect(() => {
    const unsubscribe = subscribeToPushEvents();
    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = startSubmissionGateway();
    return unsubscribe;
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <ToastProvider>
        <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarShowLabel: true,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: theme.tabBar.bg,
              borderTopColor: theme.tabBar.border,
              height: 60 + insets.bottom,
              paddingBottom: insets.bottom,
              paddingTop: 8,
            },
          ],
          tabBarLabelStyle: [
            styles.tabBarLabel,
            { color: theme.textSecondary },
          ],
          tabBarIconStyle: styles.tabBarIcon,
          sceneStyle: [styles.scene, { backgroundColor: theme.background }],
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="flag" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="terminal"
          options={{
            title: "Terminal",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="terminal" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: "Events",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: "Leaderboard",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trophy" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            title: "Notes",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="document-text" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="toolkit"
          options={{
            title: "Toolkit",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="construct" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: "Notifications",
            tabBarIcon: ({ color, size }) => (
              <View style={styles.badgeWrap}>
                <Ionicons name="notifications" size={size} color={color} />
                {unreadCount > 0 ? (
                  <Text
                    style={[
                      styles.badge,
                      {
                        backgroundColor: theme.badge.bg,
                        color: theme.badge.fg,
                      },
                    ]}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                ) : null}
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="challenge/[id]"
          options={{ href: null, title: "Challenge" }}
        />
        <Tabs.Screen
          name="event/[id]"
          options={{ href: null, title: "Event" }}
        />
        <Tabs.Screen name="teams" options={{ href: null, title: "My Team" }} />
        <Tabs.Screen
          name="note/[key]"
          options={{ href: null, title: "Note" }}
        />
        <Tabs.Screen
          name="achievements"
          options={{ href: null, title: "Achievements" }}
        />
        <Tabs.Screen
          name="bookmarks"
          options={{ href: null, title: "Bookmarks" }}
        />
        <Tabs.Screen
          name="auth/login"
          options={{ href: null, title: "Sign in" }}
        />
        <Tabs.Screen
          name="auth/register"
          options={{ href: null, title: "Create account" }}
        />
        </Tabs>
      </ToastProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: "transparent",
  },
  tabBar: {
    position: "absolute",
    borderTopWidth: StyleSheet.hairlineWidth,
    elevation: 0,
  },
  tabBarLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "600",
  },
  tabBarIcon: {
    marginVertical: 2,
  },
  badgeWrap: {
    width: 28,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    fontSize: 10,
    lineHeight: 16,
    fontWeight: "700",
    textAlign: "center",
    overflow: "hidden",
  },
});
