export interface PendingSubmission {
  idempotencyKey: string;
  challengeId: number;
  flag: string;
  eventId?: number;
  queuedAt: string;
}

export interface SubmissionQueue {
  pending: PendingSubmission[];
}

export interface FlushSummary {
  pushed: number;
  kept: number;
  total: number;
}

export function createEmptyQueue(): SubmissionQueue {
  return { pending: [] };
}

export function enqueueSubmission(
  queue: SubmissionQueue,
  item: PendingSubmission,
): SubmissionQueue {
  const exists = queue.pending.some(
    (p) => p.idempotencyKey === item.idempotencyKey,
  );
  if (exists) return queue;
  return { pending: [...queue.pending, item] };
}

export function removeSubmission(
  queue: SubmissionQueue,
  idempotencyKey: string,
): SubmissionQueue {
  return {
    pending: queue.pending.filter((p) => p.idempotencyKey !== idempotencyKey),
  };
}

export function queueSize(queue: SubmissionQueue): number {
  return queue.pending.length;
}

export function buildIdempotencyKey(
  challengeId: number,
  nonce: string,
): string {
  const sanitized = nonce.replace(/[^a-zA-Z0-9_-]/g, "");
  return `sub-${challengeId}-${sanitized.slice(0, 40)}`;
}

export async function flushSubmissionQueue(
  queue: SubmissionQueue,
  send: (item: PendingSubmission) => Promise<void>,
): Promise<{ queue: SubmissionQueue; summary: FlushSummary }> {
  let next = queue;
  let pushed = 0;
  let kept = 0;
  for (const item of queue.pending) {
    try {
      await send(item);
      next = removeSubmission(next, item.idempotencyKey);
      pushed += 1;
    } catch {
      kept += 1;
    }
  }
  return {
    queue: next,
    summary: { pushed, kept, total: queue.pending.length },
  };
}

export interface LocalNote {
  clientKey: string;
  title: string;
  body: string;
  deleted: boolean;
  updatedAt: string;
}

export interface NoteStore {
  notes: LocalNote[];
}

export function createEmptyNoteStore(): NoteStore {
  return { notes: [] };
}

export function applyLocalNoteEdit(
  store: NoteStore,
  note: LocalNote,
): NoteStore {
  const exists = store.notes.some((n) => n.clientKey === note.clientKey);
  return {
    notes: exists
      ? store.notes.map((n) => (n.clientKey === note.clientKey ? note : n))
      : [...store.notes, note],
  };
}

export function removeLocalNote(
  store: NoteStore,
  clientKey: string,
  updatedAt: string,
): NoteStore {
  return applyLocalNoteEdit(store, {
    clientKey,
    title: "",
    body: "",
    deleted: true,
    updatedAt,
  });
}

export function localNoteCount(store: NoteStore): number {
  return store.notes.length;
}

export function newestWins<T extends { updatedAt: string }>(a: T, b: T): T {
  return new Date(a.updatedAt).getTime() >= new Date(b.updatedAt).getTime()
    ? a
    : b;
}

export function mergeWithServer(
  server: LocalNote[],
  local: LocalNote[],
): { merged: LocalNote[]; local: LocalNote[] } {
  const byKey = new Map<string, LocalNote>();
  for (const note of local) byKey.set(note.clientKey, note);
  for (const note of server) {
    const existing = byKey.get(note.clientKey);
    byKey.set(note.clientKey, existing ? newestWins(existing, note) : note);
  }
  const merged = [...byKey.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  const nextLocal = merged.filter((n) => !n.deleted);
  return { merged, local: nextLocal };
}
