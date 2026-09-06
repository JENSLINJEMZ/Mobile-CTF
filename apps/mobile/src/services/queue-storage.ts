import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  createEmptyNoteStore,
  createEmptyQueue,
  type NoteStore,
  type SubmissionQueue,
} from "./offline-queue";

const QUEUE_KEY = "offline:submission-queue";
const NOTES_KEY = "offline:notes";

async function load<T>(key: string, fallback: () => T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback();
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

async function save<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistence failures must never throw into submission/note flows.
  }
}

export async function loadSubmissionQueue(): Promise<SubmissionQueue> {
  return load<SubmissionQueue>(QUEUE_KEY, createEmptyQueue);
}

export async function saveSubmissionQueue(
  queue: SubmissionQueue,
): Promise<void> {
  await save(QUEUE_KEY, queue);
}

export async function loadNoteStore(): Promise<NoteStore> {
  return load<NoteStore>(NOTES_KEY, createEmptyNoteStore);
}

export async function saveNoteStore(store: NoteStore): Promise<void> {
  await save(NOTES_KEY, store);
}

export async function clearAllOfflineData(): Promise<void> {
  await AsyncStorage.multiRemove([QUEUE_KEY, NOTES_KEY]).catch(() => undefined);
}
