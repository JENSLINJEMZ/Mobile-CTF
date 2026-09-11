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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.scroll}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          <ThemedText type="title" style={styles.welcomeText}>
            Welcome Back
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Login to continue your journey
          </ThemedText>
        </View>

        <View style={styles.form}>
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
              placeholder="Enter your password"
              secureTextEntry
              autoComplete="current-password"
              accessibilityLabel="Password"
            />
          </View>

          <Pressable
            style={styles.forgotRow}
            accessibilityRole="link"
            accessibilityLabel="Forgot password"
          >
            <ThemedText type="small" style={{ color: theme.accent }}>
              Forgot Password?
            </ThemedText>
          </Pressable>

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
              styles.primaryButton,
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}
            disabled={submitting || status === "loading"}
            onPress={() => void onLogin()}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: submitting || status === "loading" }}
          >
            {submitting ? (
              <ActivityIndicator color={theme.onAccent} />
            ) : (
              <ThemedText style={[styles.primaryLabel, { color: theme.onAccent }]}>
                Login
              </ThemedText>
            )}
          </Pressable>

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

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: theme.separator }]} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.dividerText}>
              or
            </ThemedText>
            <View style={[styles.divider, { backgroundColor: theme.separator }]} />
          </View>

          <Link href="/auth/register" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.accent },
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Register"
            >
              <ThemedText type="small" style={[styles.secondaryLabel, { color: theme.accent }]}>
                Register
              </ThemedText>
            </Pressable>
          </Link>
        </View>

        <Link href="/auth/register" asChild>
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
  forgotRow: {
    alignSelf: "flex-end",
    minHeight: TouchTarget.Android,
    justifyContent: "center",
  },
  primaryButton: {
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TouchTarget.Android,
    paddingVertical: Spacing.two + Spacing.one,
    marginTop: Spacing.one,
  },
  secondaryButton: {
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TouchTarget.Android,
    paddingVertical: Spacing.two + Spacing.one,
  },
  pressed: {
    opacity: 0.85,
  },
  primaryLabel: {
    fontWeight: "600",
  },
  secondaryLabel: {
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    opacity: 0.6,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    minHeight: TouchTarget.Android,
    paddingVertical: Spacing.two,
  },
});
