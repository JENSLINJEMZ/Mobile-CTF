import { useLocalSearchParams } from "expo-router";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
} from "react-native";

import { OfflineBanner } from "@/components/offline-banner";
import { ScreenShell } from "@/components/screen-shell";
import { GlassInput } from "@/components/glass-input";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing, TouchTarget } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useNetwork } from "@/hooks/use-network";
import { useNoteStore } from "@/store/note-store";

const SAVE_DEBOUNCE_MS = 1200;

export default function NoteEditorScreen() {
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key: string }>();
  const clientKey = key ?? "";
  const theme = useTheme();
  const isOnline = useNetwork();

  const { notes, syncError, flush } = useNoteStore();
  const existing = notes.find((n) => n.clientKey === clientKey);

  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState("Not saved");
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current && existing) {
      setTitle(existing.title);
      setBody(existing.body);
      loadedRef.current = true;
    }
  }, [existing]);

  const persist = useCallback(
    async (nextTitle: string, nextBody: string) => {
      setSaving(true);
      await useNoteStore.getState().updateLocal({
        clientKey,
        title: nextTitle,
        body: nextBody,
        deleted: false,
        updatedAt: new Date().toISOString(),
      });
      setSaving(false);
      setSavedLabel("Saved locally");
      if (isOnline) {
        void flush().then(() => setSavedLabel("Synced"));
      }
    },
    [clientKey, isOnline, flush],
  );

  const onTitle = useCallback((value: string) => {
    setTitle(value);
  }, []);

  const onBody = useCallback((value: string) => {
    setBody(value);
  }, []);

  useEffect(() => {
    if (title === (existing?.title ?? "") && body === (existing?.body ?? ""))
      return;
    setSavedLabel("...");
    const timer = setTimeout(() => void persist(title, body), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [title, body, existing, persist]);

  const onDelete = useCallback(() => {
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
              router.back();
            })();
          },
        },
      ],
    );
  }, [clientKey, isOnline, flush, router]);

  return (
    <ScreenShell title="Note">
      <OfflineBanner />
      <ThemedView style={styles.toolbar}>
        <ThemedText type="small" themeColor="textSecondary">
          {isOnline ? savedLabel : "Offline — will sync later"}
        </ThemedText>
        {saving ? <ActivityIndicator size="small" /> : null}
        <Pressable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete note"
          accessibilityHint="Permanently deletes this note"
          style={({ pressed }) => [
            styles.deleteButton,
            { minHeight: TouchTarget.Android, justifyContent: "center" },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="small" style={{ color: theme.danger }}>
            Delete
          </ThemedText>
        </Pressable>
      </ThemedView>

      {syncError ? (
        <ThemedText
          type="small"
          style={{ color: theme.danger }}
          accessibilityRole="alert"
        >
          {syncError}
        </ThemedText>
      ) : null}

      <GlassInput
        value={title}
        onChangeText={onTitle}
        placeholder="Note title"
        style={styles.titleInput}
        accessibilityLabel="Note title"
      />
      <GlassInput
        value={body}
        onChangeText={onBody}
        placeholder="Write your notes… markdown supported"
        style={styles.bodyInput}
        containerStyle={styles.bodyField}
        multiline
        textAlignVertical="top"
        accessibilityLabel="Note body"
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  deleteButton: {
    marginLeft: "auto",
    padding: Spacing.one,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "600",
  },
  bodyField: {
    flex: 1,
  },
  bodyInput: {
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.85,
  },
});
