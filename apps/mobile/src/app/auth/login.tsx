import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { Input } from "@/components/input";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/auth-store";

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { login, clearError, error, status } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onLogin = async () => {
    if (submitting) return;
    setSubmitting(true);
    clearError();
    try {
      await login(email, password);
      router.replace("/");
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
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.form}
      >
        <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            accessibilityLabel="Email"
            accessibilityRole="text"
          />

          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoComplete="current-password"
            accessibilityLabel="Password"
            accessibilityRole="text"
          />

        {error ? (
          <ThemedText
            type="small"
            style={{ color: theme.danger }}
            accessibilityRole="alert"
            accessibilityLabel={`Login failed: ${error}`}
          >
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.accent },
            pressed && styles.buttonPressed,
          ]}
          disabled={submitting || status === "loading"}
          onPress={() => void onLogin()}
          accessibilityRole="button"
          accessibilityLabel="Sign in"
          accessibilityState={{ disabled: submitting || status === "loading" }}
          accessibilityHint="Logs you into your CTF Platform account"
        >
          {submitting ? (
            <ActivityIndicator color={theme.onAccent} />
          ) : (
            <ThemedText style={[styles.buttonLabel, { color: theme.onAccent }]}>
              Sign in
            </ThemedText>
          )}
        </Pressable>

        <Link href="/auth/register" asChild>
          <Pressable
            style={styles.linkRow}
            accessibilityRole="link"
            accessibilityLabel="Create an account"
          >
            <ThemedText type="linkPrimary">
              New here? Create an account
            </ThemedText>
          </Pressable>
        </Link>
      </KeyboardAvoidingView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  form: {
    width: "100%",
    gap: Spacing.two,
  },
  button: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TouchTarget.Android,
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    fontWeight: "600",
  },
  linkRow: {
    alignItems: "center",
    minHeight: TouchTarget.Android,
    justifyContent: "center",
    paddingVertical: Spacing.two,
  },
});
