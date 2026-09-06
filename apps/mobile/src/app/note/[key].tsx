import { useLocalSearchParams } from "expo-router";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
} from "react-native";
import { useColorScheme } from "react-native";

import { OfflineBanner } from "@/components/offline-banner";
import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";
import { useNetwork } from "@/hooks/use-network";
import { useNoteStore } from "@/store/note-store";

const SAVE_DEBOUNCE_MS = 1200;

export default function NoteEditorScreen() {
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key: string }>();
  const clientKey = key ?? "";
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const surface = isDark ? "#1f2937" : "#f3f4f6";
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

  const onDelete = useCallback(async () => {
    await useNoteStore.getState().deleteLocal(clientKey);
    if (isOnline) void flush();
    router.back();
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
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="small" style={{ color: "#dc2626" }}>
            Delete
          </ThemedText>
        </Pressable>
      </ThemedView>

      {syncError ? (
        <ThemedText type="small" style={{ color: "#dc2626" }}>
          {syncError}
        </ThemedText>
      ) : null}

      <TextInput
        value={title}
        onChangeText={onTitle}
        placeholder="Note title"
        placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
        style={[
          styles.titleInput,
          { backgroundColor: surface, color: isDark ? "#f9fafb" : "#111827" },
        ]}
      />
      <TextInput
        value={body}
        onChangeText={onBody}
        placeholder="Write your notes… markdown supported"
        placeholderTextColor={isDark ? "#9ca3af" : "#6b7280"}
        style={[
          styles.bodyInput,
          { backgroundColor: surface, color: isDark ? "#f9fafb" : "#111827" },
        ]}
        multiline
        textAlignVertical="top"
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
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.one,
    fontSize: 18,
    fontWeight: "600",
  },
  bodyInput: {
    width: "100%",
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 15,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.85,
  },
});
