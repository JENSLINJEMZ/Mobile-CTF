import NetInfo from "@react-native-community/netinfo";

import type { SubmitFlagResponse } from "@ctf/shared";

import { submitFlag } from "./challenges";
import { isApiReachable } from "./http";
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
 * Enqueue-only fallback: the network is genuinely gone, so persist the attempt
 * for the reconnect drain instead of failing the user.
 */
async function enqueueFlag(
  challengeId: number,
  flag: string,
  eventId: number | undefined,
  idempotencyKey: string,
): Promise<FlagSubmissionResult> {
  const item = {
    idempotencyKey,
    challengeId,
    flag,
    eventId,
    queuedAt: new Date().toISOString(),
  };
  const queue = await loadSubmissionQueue();
  await saveSubmissionQueue(enqueueSubmission(queue, item));
  return { status: "queued", queuedAt: item.queuedAt };
}

/** RN fetch rejects with a TypeError when the server can't be reached. */
function isNetworkFailure(err: unknown): boolean {
  return err instanceof TypeError;
}

/**
 * Attempts a live submission. A network-level failure (server unreachable)
 * degrades to the offline queue; HTTP responses — even 4xx/5xx — always
 * surface to the caller so wrong flags, rate limits etc. never get queued.
 */
async function attemptLiveSubmit(
  challengeId: number,
  flag: string,
  eventId: number | undefined,
): Promise<FlagSubmissionResult> {
  const idempotencyKey = buildIdempotencyKey(challengeId, newNonce());
  try {
    const response = await submitFlag(
      challengeId,
      flag,
      eventId,
      idempotencyKey,
    );
    return { status: "accepted", response };
  } catch (err) {
    if (!isNetworkFailure(err)) throw err;
    return enqueueFlag(challengeId, flag, eventId, idempotencyKey);
  }
}

/**
 * The single submit-flag seam. A screen calls this whether online or offline:
 * online it posts to the server (with an idempotency key so retries and
 * reconnects never double-score); offline it enqueues to persistent storage
 * for the reconnect drain.
 *
 * "Offline" is decided by the backend actually being unreachable, not by the
 * device's internet state — over a LAN/USB-tunnel the API can be up while
 * NetInfo reports no internet, and flags must still send.
 */
export async function submitFlagViaGateway(
  challengeId: number,
  flag: string,
  eventId: number | undefined,
  isOnline: boolean,
): Promise<FlagSubmissionResult> {
  if (isOnline || (await isApiReachable())) {
    return attemptLiveSubmit(challengeId, flag, eventId);
  }
  return enqueueFlag(
    challengeId,
    flag,
    eventId,
    buildIdempotencyKey(challengeId, newNonce()),
  );
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
 * Auto-drains the queue as soon as the backend is reachable. NetInfo events
 * are just the trigger — the actual decision is a reachability probe, so a
 * USB-tunnel/LAN setup drains even though the phone reports no internet.
 * Started once from the app root; returns an unsubscribe used by React effects.
 */
export function startSubmissionGateway(): () => void {
  const drainIfReachable = () => {
    void (async () => {
      if (await isApiReachable()) await drainSubmissionQueue();
    })();
  };
  drainIfReachable();
  return NetInfo.addEventListener(drainIfReachable);
}