import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
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
            placeholder="Username"
            placeholderTextColor="#8e8e93"
            autoCapitalize="none"
            autoComplete="username"
            value={username}
            onChangeText={setUsername}
          />
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.field}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Password (min 8 chars)"
            placeholderTextColor="#8e8e93"
            secureTextEntry
            autoComplete="new-password"
            value={password}
            onChangeText={setPassword}
          />
        </ThemedView>

        {error ? (
          <ThemedText type="small" style={{ color: "#dc2626" }}>
            {error}
          </ThemedText>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            !canSubmit && styles.buttonDisabled,
          ]}
          disabled={submitting || !canSubmit}
          onPress={() => void onRegister()}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.buttonLabel}>Create account</ThemedText>
          )}
        </Pressable>

        <Link href="/auth/login" asChild>
          <Pressable style={styles.linkRow}>
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
    backgroundColor: "#2563eb",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
    paddingVertical: Spacing.two,
  },
});
