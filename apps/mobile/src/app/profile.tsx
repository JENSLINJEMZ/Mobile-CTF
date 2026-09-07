import { Ionicons } from "@expo/vector-icons";
import { Link, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet } from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { getAchievements } from "@/services/achievements";
import { listBookmarks } from "@/services/bookmarks";
import { useAuthStore } from "@/store/auth-store";

export default function ProfileScreen() {
  const { status, user, logout, error, clearError } = useAuthStore();
  const [earned, setEarned] = useState<number | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState<number | null>(null);

  const loadStats = useCallback(async () => {
    if (status !== "authenticated") return;
    try {
      const [achievements, bookmarks] = await Promise.all([
        getAchievements(),
        listBookmarks(),
      ]);
      setEarned(achievements.earnedCount);
      setBookmarkCount(bookmarks.items.length);
    } catch {
      // Non-fatal; profile still renders.
    }
  }, [status]);

  const confirmLogout = useCallback(() => {
    Alert.alert(
      "Sign out all devices?",
      "This revokes your session on every device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: () => void logout(),
        },
      ],
    );
  }, [logout]);

  useFocusEffect(
    useCallback(() => {
      void loadStats();
    }, [loadStats]),
  );

  if (status === "loading") {
    return (
      <ScreenShell title="Profile">
        <ActivityIndicator />
      </ScreenShell>
    );
  }

  if (status === "anonymous" || !user) {
    return (
      <ScreenShell title="Profile">
        <ThemedText>Sign in to see your stats, badges, and team.</ThemedText>
        <Link href="/auth/login" asChild>
          <Pressable
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
          >
            <ThemedText style={styles.buttonLabel}>Sign in</ThemedText>
          </Pressable>
        </Link>
        <Link href="/auth/register" asChild>
          <Pressable
            style={styles.ghostButton}
            accessibilityRole="link"
            accessibilityLabel="Create an account"
          >
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

      <ThemedView style={styles.links}>
        <Link href="/achievements" asChild>
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            accessibilityRole="link"
            accessibilityLabel={`Achievements, ${earned ?? 0} badges earned`}
          >
            <Ionicons name="trophy" size={20} color="#2563eb" />
            <ThemedText type="smallBold" style={styles.linkLabel}>
              Achievements
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {earned ?? "—"} badges
            </ThemedText>
          </Pressable>
        </Link>
        <Link href="/bookmarks" asChild>
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            accessibilityRole="link"
            accessibilityLabel={`Bookmarks, ${bookmarkCount ?? 0} saved`}
          >
            <Ionicons name="bookmark" size={20} color="#2563eb" />
            <ThemedText type="smallBold" style={styles.linkLabel}>
              Bookmarks
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {bookmarkCount ?? "—"}
            </ThemedText>
          </Pressable>
        </Link>
        <Link href="/notes" asChild>
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            accessibilityRole="link"
            accessibilityLabel="Private notes"
          >
            <Ionicons name="document-text" size={20} color="#2563eb" />
            <ThemedText type="smallBold" style={styles.linkLabel}>
              Private notes
            </ThemedText>
          </Pressable>
        </Link>
        <Link href="/teams" asChild>
          <Pressable
            style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
            accessibilityRole="link"
            accessibilityLabel="My team"
          >
            <Ionicons name="people" size={20} color="#2563eb" />
            <ThemedText type="smallBold" style={styles.linkLabel}>
              My team
            </ThemedText>
          </Pressable>
        </Link>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          Member since {new Date(user.createdAt).toLocaleDateString()}
        </ThemedText>
      </ThemedView>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={confirmLogout}
        accessibilityRole="button"
        accessibilityLabel="Sign out all devices"
        accessibilityHint="Revokes your session on every device"
      >
        <ThemedText style={styles.buttonLabel}>Sign out all devices</ThemedText>
      </Pressable>

      {error ? (
        <Pressable onPress={clearError} accessibilityRole="button">
          <ThemedText type="small" style={{ color: "#dc2626" }}>
            {error}
          </ThemedText>
        </Pressable>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  links: {
    width: "100%",
    gap: Spacing.two,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  linkLabel: {
    flex: 1,
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.three,
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.85,
  },
  buttonLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  ghostButton: {
    alignItems: "center",
    paddingVertical: Spacing.three,
  },
});
