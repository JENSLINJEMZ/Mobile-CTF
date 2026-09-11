import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { Input } from "@/components/input";
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
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit =
    email.trim().length > 0 &&
    username.trim().length > 0 &&
    password.length >= 8 &&
    password === confirmPassword;

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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.brandText}>
            MOBILECTF
          </ThemedText>
          <ThemedText type="title" style={styles.welcomeText}>
            Join the CTF Community
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.fieldGroup}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              Username
            </ThemedText>
            <Input
              value={username}
              onChangeText={setUsername}
              placeholder="Choose a username"
              autoCapitalize="none"
              autoComplete="username"
              accessibilityLabel="Username"
            />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              Email
            </ThemedText>
            <Input
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              accessibilityLabel="Email"
            />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              Password
            </ThemedText>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Create a password"
              secureTextEntry
              autoComplete="new-password"
              accessibilityLabel="Password"
            />
          </View>

          <View style={styles.fieldGroup}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.label}>
              Confirm Password
            </ThemedText>
            <Input
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
              secureTextEntry
              autoComplete="new-password"
              accessibilityLabel="Confirm password"
            />
          </View>

          {password.length > 0 && password.length < 8 ? (
            <ThemedText type="small" style={{ color: theme.warning }}>
              Password must be at least 8 characters.
            </ThemedText>
          ) : null}

          {password.length >= 8 && confirmPassword.length > 0 && password !== confirmPassword ? (
            <ThemedText type="small" style={{ color: theme.warning }}>
              Passwords do not match.
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
            style={styles.checkboxRow}
            accessibilityRole="checkbox"
            accessibilityLabel="I agree to the Terms & Conditions"
          >
            <View style={[styles.checkbox, { borderColor: theme.accent }]} />
            <ThemedText type="small" themeColor="textSecondary">
              I agree to the Terms &amp; Conditions
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
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
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <ThemedText style={[styles.primaryLabel, { color: theme.onAccent }]}>
                Register
              </ThemedText>
            )}
          </Pressable>
        </View>

        <Link href="/auth/login" asChild>
          <Pressable
            style={styles.switchRow}
            accessibilityRole="link"
            accessibilityLabel="Already have an account? Login"
          >
            <ThemedText type="small" themeColor="textSecondary">
              Already have an account?{" "}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.accent }}>
              Login
            </ThemedText>
          </Pressable>
        </Link>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    gap: Spacing.one,
  },
  brandText: {
    fontWeight: "800",
    letterSpacing: 1,
    fontSize: 14,
  },
  welcomeText: {
    fontWeight: "700",
  },
  form: {
    gap: Spacing.two,
  },
  fieldGroup: {
    gap: Spacing.one,
  },
  label: {
    marginBottom: Spacing.half,
  },
  primaryButton: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TouchTarget.Android,
    paddingVertical: Spacing.two + Spacing.one,
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryLabel: {
    fontWeight: "600",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    minHeight: TouchTarget.Android,
    paddingVertical: Spacing.one,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    minHeight: TouchTarget.Android,
    paddingVertical: Spacing.two,
  },
});
