import NetInfo from "@react-native-community/netinfo";

import type { SubmitFlagResponse } from "@ctf/shared";

import { submitFlag } from "./challenges";
import {
  buildIdempotencyKey,
  enqueueSubmission,
  flushSubmissionQueue,
  queueSize,
} from "./offline-queue";
import { loadSubmissionQueue, saveSubmissionQueue } from "./queue-storage";

export type FlagSubmissionResult =
  | { status: "queued"; queuedAt: string }
  | { status: "accepted"; response: SubmitFlagResponse };

function newNonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The single submit-flag seam. A screen calls this whether online or offline:
 * online it posts to the server (with an idempotency key so retries and
 * reconnects never double-score); offline it enqueues to persistent storage
 * for the reconnect drain.
 */
export async function submitFlagViaGateway(
  challengeId: number,
  flag: string,
  eventId: number | undefined,
  isOnline: boolean,
): Promise<FlagSubmissionResult> {
  if (isOnline) {
    const response = await submitFlag(
      challengeId,
      flag,
      eventId,
      buildIdempotencyKey(challengeId, newNonce()),
    );
    return { status: "accepted", response };
  }

  const item = {
    idempotencyKey: buildIdempotencyKey(challengeId, newNonce()),
    challengeId,
    flag,
    eventId,
    queuedAt: new Date().toISOString(),
  };
  const queue = await loadSubmissionQueue();
  await saveSubmissionQueue(enqueueSubmission(queue, item));
  return { status: "queued", queuedAt: item.queuedAt };
}

/**
 * Drains queued flag submissions to the server, removing only the items the
 * server accepted. Idempotency keys make re-drains and retries safe.
 */
let drainInFlight = false;

export async function drainSubmissionQueue(): Promise<void> {
  if (drainInFlight) return;
  drainInFlight = true;
  try {
    const queue = await loadSubmissionQueue();
    if (queue.pending.length === 0) return;
    const { queue: next } = await flushSubmissionQueue(queue, async (item) => {
      await submitFlag(
        item.challengeId,
        item.flag,
        item.eventId,
        item.idempotencyKey,
      );
    });
    await saveSubmissionQueue(next);
  } finally {
    drainInFlight = false;
  }
}

export async function pendingSubmissionCount(): Promise<number> {
  const queue = await loadSubmissionQueue();
  return queueSize(queue);
}

/**
 * Idempotent, auto-drains on reconnect. Mount once from the app root; returns
 * an unsubscribe used by React effects.
 */
export function startSubmissionGateway(): () => void {
  let online = false;
  return NetInfo.addEventListener((state) => {
    const isOnline =
      state.isConnected === true && state.isInternetReachable !== false;
    if (isOnline && !online) void drainSubmissionQueue();
    online = isOnline;
  });
}