import { useCallback, useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

import { submitFlag } from "./challenges";
import { flushSubmissionQueue } from "./offline-queue";
import { loadSubmissionQueue, saveSubmissionQueue } from "./queue-storage";
import { useNoteStore } from "@/store/note-store";

export interface OfflineFlushHookResult {
  flushing: boolean;
  lastFlushedAt: number | null;
  flush: () => Promise<void>;
}

export function useOfflineFlush(): OfflineFlushHookResult {
  const [flushing, setFlushing] = useState(false);
  const [lastFlushedAt, setLastFlushedAt] = useState<number | null>(null);

  const flush = useCallback(async () => {
    if (flushing) return;
    setFlushing(true);
    try {
      await useNoteStore.getState().flush();
      const queue = await loadSubmissionQueue();
      if (queue.pending.length > 0) {
        const { queue: nextQueue } = await flushSubmissionQueue(
          queue,
          async (item) => {
            await submitFlag(
              item.challengeId,
              item.flag,
              item.eventId,
              item.idempotencyKey,
            );
          },
        );
        await saveSubmissionQueue(nextQueue);
      }
      setLastFlushedAt(Date.now());
    } finally {
      setFlushing(false);
    }
  }, [flushing]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected === true && state.isInternetReachable !== false;
      if (online) void flush();
    });
    return unsubscribe;
  }, [flush]);

  return { flushing, lastFlushedAt, flush };
}
