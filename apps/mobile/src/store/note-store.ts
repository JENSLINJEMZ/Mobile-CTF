import { create } from "zustand";

import { syncNotes } from "@/services/notes";
import {
  applyLocalNoteEdit,
  mergeWithServer,
  removeLocalNote,
  type LocalNote,
} from "@/services/offline-queue";
import { loadNoteStore, saveNoteStore } from "@/services/queue-storage";

export function buildClientKey(): string {
  return `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function display(store: { notes: LocalNote[] }): LocalNote[] {
  return store.notes.filter((n) => !n.deleted);
}

interface NoteState {
  notes: LocalNote[];
  hydrated: boolean;
  syncing: boolean;
  syncError: string | null;
  hydrate: () => Promise<void>;
  updateLocal: (note: LocalNote) => Promise<void>;
  deleteLocal: (clientKey: string) => Promise<void>;
  flush: () => Promise<void>;
}

let hydratePromise: Promise<void> | null = null;

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  hydrated: false,
  syncing: false,
  syncError: null,

  hydrate: async () => {
    if (get().hydrated) return;
    if (hydratePromise) return hydratePromise;
    hydratePromise = (async () => {
      const store = await loadNoteStore();
      set({ notes: display(store), hydrated: true });
    })();
    return hydratePromise;
  },

  updateLocal: async (note) => {
    const store = await loadNoteStore();
    const next = applyLocalNoteEdit(store, note);
    await saveNoteStore(next);
    set({ notes: display(next) });
  },

  deleteLocal: async (clientKey) => {
    const store = await loadNoteStore();
    const next = removeLocalNote(store, clientKey, new Date().toISOString());
    await saveNoteStore(next);
    set({ notes: display(next) });
  },

  flush: async () => {
    const { syncing } = get();
    if (syncing) return;
    set({ syncing: true, syncError: null });
    try {
      const store = await loadNoteStore();
      if (store.notes.length === 0) {
        set({ syncing: false });
        return;
      }
      const response = await syncNotes(
        store.notes.map((n) => ({
          clientKey: n.clientKey,
          title: n.title,
          body: n.body,
          deleted: n.deleted,
          updatedAt: n.updatedAt,
        })),
      );
      const { local } = mergeWithServer(response.serverItems, store.notes);
      await saveNoteStore({ notes: local });
      set({ notes: display({ notes: local }), syncing: false });
    } catch (err) {
      set({
        syncing: false,
        syncError: err instanceof Error ? err.message : "Could not sync notes",
      });
    }
  },
}));
