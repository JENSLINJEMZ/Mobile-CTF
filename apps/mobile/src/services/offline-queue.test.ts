import { describe, expect, it } from "vitest";

import {
  applyLocalNoteEdit,
  buildIdempotencyKey,
  createEmptyNoteStore,
  createEmptyQueue,
  enqueueSubmission,
  flushSubmissionQueue,
  mergeWithServer,
  queueSize,
  removeLocalNote,
  removeSubmission,
  type LocalNote,
  type PendingSubmission,
} from "./offline-queue";

function pendingItem(
  overrides: Partial<PendingSubmission> = {},
): PendingSubmission {
  return {
    idempotencyKey: "sub-1-abc123",
    challengeId: 1,
    flag: "ctf{offline}",
    queuedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("submission queue engine", () => {
  it("starts empty", () => {
    expect(queueSize(createEmptyQueue())).toBe(0);
  });

  it("enqueues an item and reports size", () => {
    const queue = enqueueSubmission(createEmptyQueue(), pendingItem());
    expect(queueSize(queue)).toBe(1);
    expect(queue.pending[0].idempotencyKey).toBe("sub-1-abc123");
  });

  it("dedupes identical idempotency keys", () => {
    let queue = createEmptyQueue();
    queue = enqueueSubmission(queue, pendingItem());
    queue = enqueueSubmission(queue, pendingItem());
    expect(queueSize(queue)).toBe(1);
  });

  it("removes a single item by key", () => {
    let queue = enqueueSubmission(createEmptyQueue(), pendingItem());
    queue = removeSubmission(queue, "sub-1-abc123");
    expect(queueSize(queue)).toBe(0);
  });

  it("builds URL-safe idempotency keys", () => {
    const key = buildIdempotencyKey(42, `S0me!nonce ${Date.now()}`);
    expect(key).toMatch(/^sub-42-[a-zA-Z0-9_-]+$/);
    expect(key.length).toBeLessThanOrEqual(64);
  });

  it("flushes successfully-sent items and keeps failed ones", async () => {
    const ok = pendingItem({ idempotencyKey: "sub-1-ok" });
    const bad = pendingItem({ idempotencyKey: "sub-1-bad" });
    let queue = enqueueSubmission(createEmptyQueue(), ok);
    queue = enqueueSubmission(queue, bad);

    const sent: string[] = [];
    const { queue: next, summary } = await flushSubmissionQueue(
      queue,
      async (item) => {
        if (item.idempotencyKey === "sub-1-bad") throw new Error("offline");
        sent.push(item.idempotencyKey);
      },
    );

    expect(sent).toEqual(["sub-1-ok"]);
    expect(summary).toEqual({ pushed: 1, kept: 1, total: 2 });
    expect(queueSize(next)).toBe(1);
    expect(next.pending[0].idempotencyKey).toBe("sub-1-bad");
  });
});

describe("note store engine", () => {
  const base: LocalNote = {
    clientKey: "note-key-a",
    title: "Alpha",
    body: "Hello",
    deleted: false,
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("applies a local edit (upsert by clientKey)", () => {
    const store = applyLocalNoteEdit(createEmptyNoteStore(), base);
    const edited = applyLocalNoteEdit(store, { ...base, body: "Edited" });
    expect(edited.notes).toHaveLength(1);
    expect(edited.notes[0].body).toBe("Edited");
  });

  it("marks a note as deleted locally", () => {
    const store = applyLocalNoteEdit(createEmptyNoteStore(), base);
    const deleted = removeLocalNote(
      store,
      base.clientKey,
      "2026-01-01T00:01:00.000Z",
    );
    expect(deleted.notes[0].deleted).toBe(true);
  });

  it("merges local and server notes with newest winning", () => {
    const local = {
      ...base,
      body: "local newer",
      updatedAt: "2026-01-01T12:00:00.000Z",
    };
    const server = {
      ...base,
      body: "server older",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const { merged, local: nextLocal } = mergeWithServer([server], [local]);

    expect(merged).toHaveLength(1);
    expect(merged[0].body).toBe("local newer");
    expect(nextLocal).toHaveLength(1);
    expect(nextLocal[0].body).toBe("local newer");
  });

  it("drops tombstones accepted by the server after merge", () => {
    const tombstone: LocalNote = {
      clientKey: "note-gone",
      title: "",
      body: "",
      deleted: true,
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const { local } = mergeWithServer([], [tombstone]);
    expect(local).toHaveLength(0);
  });
});
