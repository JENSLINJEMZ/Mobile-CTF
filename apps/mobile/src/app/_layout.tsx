import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { useAuthStore } from '@/store/auth-store';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    void useAuthStore.getState().hydrate();
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Tabs screenOptions={{ tabBarActiveTintColor: '#2563eb' }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Challenges',
            tabBarIcon: ({ color, size }) => <Ionicons name="flag" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="terminal"
          options={{
            title: 'Terminal',
            tabBarIcon: ({ color, size }) => <Ionicons name="terminal" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: 'Events',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="calendar" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="leaderboard"
          options={{
            title: 'Leaderboard',
            tabBarIcon: ({ color, size }) => <Ionicons name="trophy" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="toolkit"
          options={{
            title: 'Toolkit',
            tabBarIcon: ({ color, size }) => <Ionicons name="construct" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="challenge/[id]"
          options={{ href: null, title: 'Challenge' }}
        />
        <Tabs.Screen
          name="event/[id]"
          options={{ href: null, title: 'Event' }}
        />
        <Tabs.Screen
          name="teams"
          options={{ href: null, title: 'My Team' }}
        />
        <Tabs.Screen
          name="auth/login"
          options={{ href: null, title: 'Sign in' }}
        />
        <Tabs.Screen
          name="auth/register"
          options={{ href: null, title: 'Create account' }}
        />
      </Tabs>
    </ThemeProvider>
  );
}