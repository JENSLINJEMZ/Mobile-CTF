import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { login, clearError, error, status } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onLogin = async () => {
    if (submitting) return;
    setSubmitting(true);
    clearError();
    try {
      await login(email, password);
      router.replace('/');
    } catch {
      // error surfaced via store
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell title="Sign in">
      <ThemedText type="small" themeColor="textSecondary">
        Use your CTF Platform account. Demo user: user@ctf.test
      </ThemedText>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.form}
      >
        <ThemedView type="backgroundElement" style={styles.field}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Email"
            placeholderTextColor="#8e8e93"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.field}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Password"
            placeholderTextColor="#8e8e93"
            secureTextEntry
            autoComplete="current-password"
            value={password}
            onChangeText={setPassword}
          />
        </ThemedView>

        {error ? (
          <ThemedText type="small" style={{ color: '#dc2626' }}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          disabled={submitting || status === 'loading'}
          onPress={() => void onLogin()}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.buttonLabel}>Sign in</ThemedText>
          )}
        </Pressable>

        <Link href="/auth/register" asChild>
          <Pressable style={styles.linkRow}>
            <ThemedText type="linkPrimary">New here? Create an account</ThemedText>
          </Pressable>
        </Link>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: {
    width: '100%',
    gap: Spacing.two,
  },
  field: {
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  input: {
    fontSize: 16,
    paddingVertical: Spacing.one,
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
  linkRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
});