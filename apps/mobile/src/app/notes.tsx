import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
} from "react-native";

import { OfflineBanner } from "@/components/offline-banner";
import { EmptyState } from "@/components/state-views";
import { ScreenShell } from "@/components/screen-shell";
import { Surface } from "@/components/surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useNetwork } from "@/hooks/use-network";
import { buildClientKey, useNoteStore } from "@/store/note-store";

export default function NotesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const isOnline = useNetwork();
  const { notes, hydrated, syncing, syncError, hydrate, flush } =
    useNoteStore();
  const [dismissedError, setDismissedError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    setDismissedError(false);
  }, [syncError]);

  useFocusEffect(
    useCallback(() => {
      if (isOnline) void flush();
    }, [isOnline, flush]),
  );

  const openNote = useCallback(
    (clientKey: string) => {
      router.push(`/note/${clientKey}`);
    },
    [router],
  );

  const createNote = useCallback(() => {
    const clientKey = buildClientKey();
    router.push(`/note/${clientKey}`);
  }, [router]);

  const onDelete = useCallback(
    (clientKey: string) => {
      Alert.alert(
        "Delete this note?",
        "This permanently deletes the note from all your devices.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => {
              void (async () => {
                await useNoteStore.getState().deleteLocal(clientKey);
                if (isOnline) void flush();
              })();
            },
          },
        ],
      );
    },
    [isOnline, flush],
  );

  const onPullRefresh = useCallback(() => {
    setRefreshing(true);
    void (async () => {
      await hydrate();
      if (isOnline) await flush();
      setRefreshing(false);
    })();
  }, [hydrate, isOnline, flush]);

  return (
    <ScreenShell title="Notes">
      <OfflineBanner />
      <ThemedView style={styles.toolbar}>
        <ThemedText type="small" themeColor="textSecondary">
          <ThemedText type="metric">{notes.length}</ThemedText> note
          {notes.length === 1 ? "" : "s"}
        </ThemedText>
        <Pressable
          onPress={() => (isOnline ? void flush() : undefined)}
          accessibilityRole="button"
          accessibilityLabel={isOnline ? "Sync now" : "Offline"}
          accessibilityState={{ disabled: !isOnline || syncing }}
          style={({ pressed }) => [
            styles.syncButton,
            {
              backgroundColor: isOnline ? theme.accent : theme.backgroundElement,
              borderColor: isOnline ? "transparent" : theme.borderStrong,
            },
            pressed && styles.pressed,
          ]}
        >
          {syncing ? (
            <ActivityIndicator size="small" color={theme.onAccent} />
          ) : (
            <ThemedText
              type="small"
              style={{
                color: isOnline ? theme.onAccent : theme.textSecondary,
                fontWeight: "600",
              }}
            >
              {isOnline ? "Sync now" : "Offline"}
            </ThemedText>
          )}
        </Pressable>
      </ThemedView>

      {syncError && !dismissedError ? (
        <Surface
          variant="selected"
          radius={Radius.md}
          style={[
            styles.syncError,
            { backgroundColor: theme.dangerSubtle },
          ]}
          accessibilityRole="alert"
          accessibilityLabel={`Sync failed: ${syncError}`}
        >
          <ThemedText type="small" style={{ color: theme.dangerStrong, flex: 1 }}>
            {syncError}
          </ThemedText>
          <Pressable
            onPress={() => setDismissedError(true)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss sync error"
            hitSlop={12}
          >
            <Ionicons name="close" size={18} color={theme.danger} />
          </Pressable>
        </Surface>
      ) : null}

      {!hydrated ? (
        <ActivityIndicator style={{ marginTop: Spacing.five }} color={theme.accent} />
      ) : notes.length === 0 ? (
        <EmptyState message="No notes yet. Notes are private and sync automatically when you're back online." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onPullRefresh}
              tintColor={theme.accent}
            />
          }
        >
          {notes.map((note) => (
            <Surface
              key={note.clientKey}
              radius={Radius.lg}
              style={styles.noteRow}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.noteMain,
                  pressed && styles.pressed,
                ]}
                onPress={() => openNote(note.clientKey)}
                accessibilityRole="button"
                accessibilityLabel={`Open note ${note.title || "Untitled"}`}
              >
                <ThemedText type="smallBold" numberOfLines={1}>
                  {note.title || "Untitled"}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={2}
                >
                  {note.body || "Empty note"}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {new Date(note.updatedAt).toLocaleString()}
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => onDelete(note.clientKey)}
                accessibilityRole="button"
                accessibilityLabel={`Delete note ${note.title || "Untitled"}`}
                accessibilityHint="Permanently deletes this note"
                style={styles.deleteButton}
                hitSlop={12}
              >
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
              </Pressable>
            </Surface>
          ))}
        </ScrollView>
      )}

      <Pressable
        onPress={createNote}
        accessibilityRole="button"
        accessibilityLabel="Create new note"
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: theme.accent },
          pressed && styles.pressed,
        ]}
      >
        <Ionicons name="add" size={26} color={theme.onAccent} />
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: TouchTarget.Android,
  },
  syncButton: {
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    minWidth: 96,
    minHeight: TouchTarget.Android,
    alignItems: "center",
    justifyContent: "center",
  },
  syncError: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.six + Spacing.four,
  },
  noteRow: {
    width: "100%",
    padding: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    minHeight: TouchTarget.Android,
  },
  noteMain: {
    flex: 1,
    gap: Spacing.half,
    paddingVertical: Spacing.one,
  },
  deleteButton: {
    padding: Spacing.one,
    minWidth: TouchTarget.Android,
    minHeight: TouchTarget.Android,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    right: Spacing.four,
    bottom: Spacing.six,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.85,
  },
});
