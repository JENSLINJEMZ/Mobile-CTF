import { Link } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuthStore } from '@/store/auth-store';

export default function ProfileScreen() {
  const { status, user, logout, error, clearError } = useAuthStore();

  if (status === 'loading') {
    return (
      <ScreenShell title="Profile">
        <ActivityIndicator />
      </ScreenShell>
    );
  }

  if (status === 'anonymous' || !user) {
    return (
      <ScreenShell title="Profile">
        <ThemedText>Sign in to see your stats, badges, and team.</ThemedText>
        <Link href="/auth/login" asChild>
          <Pressable style={styles.button}>
            <ThemedText style={styles.buttonLabel}>Sign in</ThemedText>
          </Pressable>
        </Link>
        <Link href="/auth/register" asChild>
          <Pressable style={styles.ghostButton}>
            <ThemedText type="linkPrimary">Create an account</ThemedText>
          </Pressable>
        </Link>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Profile">
      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="subtitle">{user.username}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {user.email}
        </ThemedText>
        <ThemedText type="smallBold" style={{ marginTop: Spacing.one }}>
          Role: {user.role}
        </ThemedText>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Member since {new Date(user.createdAt).toLocaleDateString()}
        </ThemedText>
      </ThemedView>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => void logout()}
      >
        <ThemedText style={styles.buttonLabel}>Sign out all devices</ThemedText>
      </Pressable>

      {error ? (
        <Pressable onPress={clearError}>
          <ThemedText type="small" style={{ color: '#dc2626' }}>
            {error}
          </ThemedText>
        </Pressable>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: '#ffffff',
    fontWeight: '600',
  },
  ghostButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
});