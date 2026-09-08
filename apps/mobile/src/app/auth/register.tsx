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
import { GlassInput } from "@/components/glass-input";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/auth-store";

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { register, clearError, error } = useAuthStore();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    email.trim().length > 0 &&
    username.trim().length > 0 &&
    password.length >= 8;

  const onRegister = async () => {
    if (submitting || !canSubmit) return;
    setSubmitting(true);
    clearError();
    try {
      await register(email, username, password);
      router.replace("/");
    } catch {
      // error surfaced via store
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenShell title="Create account">
      <ThemedText type="small" themeColor="textSecondary">
        Choose a username (3-32 chars: letters, digits, _ or -) and a password
        of at least 8 characters.
      </ThemedText>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.form}
      >
        <GlassInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            accessibilityLabel="Email"
          />

          <GlassInput
            value={username}
            onChangeText={setUsername}
            placeholder="Username"
            autoCapitalize="none"
            autoComplete="username"
            accessibilityLabel="Username"
          />

          <GlassInput
            value={password}
            onChangeText={setPassword}
            placeholder="Password (min 8 chars)"
            secureTextEntry
            autoComplete="new-password"
            accessibilityLabel="Password"
          />

        {password.length > 0 && password.length < 8 ? (
          <ThemedText type="small" style={{ color: theme.warning }}>
            Password must be at least 8 characters.
          </ThemedText>
        ) : null}

        {error ? (
          <ThemedText
            type="small"
            style={{ color: theme.danger }}
            accessibilityRole="alert"
          >
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.accent },
            pressed && styles.buttonPressed,
            !canSubmit && styles.buttonDisabled,
          ]}
          disabled={submitting || !canSubmit}
          onPress={() => void onRegister()}
          accessibilityRole="button"
          accessibilityLabel="Create account"
          accessibilityState={{ disabled: submitting || !canSubmit }}
          accessibilityHint="Registers a new CTF Platform account"
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.buttonLabel}>Create account</ThemedText>
          )}
        </Pressable>

        <Link href="/auth/login" asChild>
          <Pressable
            style={styles.linkRow}
            accessibilityRole="link"
            accessibilityLabel="Sign in to existing account"
          >
            <ThemedText type="linkPrimary">
              Already registered? Sign in
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
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  linkRow: {
    alignItems: "center",
    minHeight: TouchTarget.Android,
    justifyContent: "center",
    paddingVertical: Spacing.two,
  },
});
