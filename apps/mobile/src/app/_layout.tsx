import { Tabs } from "expo-router";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, Text, View, useColorScheme, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LucideIcon, type LucideName } from "@/components/lucide-icon";
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

function TabIcon({
  icon,
  color,
  focused,
}: {
  icon: LucideName;
  color: ColorValue;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      {focused ? <View style={styles.activeBar} /> : null}
      <LucideIcon name={icon} size={19} color={color as string} />
    </View>
  );
}

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
          tabBarActiveTintColor: "#a78bfa",
          tabBarInactiveTintColor: "#7a7699",
          tabBarShowLabel: true,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: "#0b0a16",
              borderTopColor: "rgba(255, 255, 255, 0.07)",
              height: 60 + insets.bottom,
              paddingBottom: insets.bottom,
              paddingTop: 4,
            },
          ],
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarIconStyle: styles.tabBarIcon,
          sceneStyle: [styles.scene, { backgroundColor: "#07070f" }],
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon="home" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="challenges"
          options={{
            title: "Challenges",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon="shield" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: "Events",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon="calendar" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="terminal"
          options={{
            title: "Terminal",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon="terminal" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon="user" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="toolkit"
          options={{
            title: "Toolkit",
            href: null,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon="briefcase" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: "Leaderboard",
            href: null,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon="bars" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="notes"
          options={{
            title: "Notes",
            href: null,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon icon="notes" color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: "Notifications",
            href: null,
            tabBarIcon: ({ color, focused }) => (
              <View style={styles.badgeWrap}>
                <LucideIcon name="bell" size={19} color={color as string} />
                {focused ? <View style={styles.activeBar} /> : null}
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
    fontSize: 8.5,
    lineHeight: 10,
    fontWeight: "600",
  },
  tabBarIcon: {
    marginVertical: 2,
  },
  iconWrap: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  activeBar: {
    position: "absolute",
    top: -6,
    width: 18,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: "#a78bfa",
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
