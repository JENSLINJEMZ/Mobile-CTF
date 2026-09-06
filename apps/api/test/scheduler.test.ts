import { describe, expect, it } from "vitest";

import { Scheduler } from "../src/services/scheduler";
import { WorkerPool } from "../src/utils/workerPool";

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe("Scheduler", () => {
  it("requires at least one task", () => {
    expect(() => new Scheduler([])).toThrow(/at least one task/);
  });

  it("runs a task on demand and records completion", async () => {
    const log: string[] = [];
    const scheduler = new Scheduler([
      { name: "a", run: async () => log.push("a"), intervalMs: 1000 },
    ]);
    await scheduler.runNow("a");
    expect(log).toEqual(["a"]);
    scheduler.stop();
  });

  it("never overlaps a running task", async () => {
    let started = 0;
    let settled = 0;
    const scheduler = new Scheduler([
      {
        name: "slow",
        run: async () => {
          started += 1;
          await delay(50);
          settled += 1;
        },
        intervalMs: 1000,
      },
    ]);
    const first = scheduler.runNow("slow");
    const second = scheduler.runNow("slow");
    await Promise.all([first, second]);
    expect(started).toBe(1);
    expect(settled).toBe(1);
    scheduler.stop();
  });

  it("throws for unknown task names", async () => {
    const scheduler = new Scheduler([
      { name: "a", run: async () => undefined, intervalMs: 1000 },
    ]);
    await expect(scheduler.runNow("nope")).rejects.toThrow(/unknown/);
  });

  it("start/stop manage timers idempotently", () => {
    const scheduler = new Scheduler([
      { name: "a", run: async () => undefined, intervalMs: 1000 },
    ]);
    scheduler.start();
    scheduler.start();
    scheduler.stop();
    scheduler.stop();
    scheduler.start();
    scheduler.stop();
  });
});

describe("WorkerPool", () => {
  it("caps concurrency and runs everything", async () => {
    let active = 0;
    let maxActive = 0;
    const pool = new WorkerPool(2);

    const results = await Promise.all(
      Array.from({ length: 8 }, async (_, i) =>
        pool.run(async () => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          await delay(10 + i);
          active -= 1;
          return i;
        }),
      ),
    );

    expect(results).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(pool.running).toBe(0);
  });

  it("propagates task rejections", async () => {
    const pool = new WorkerPool(1);
    await expect(
      pool.run(async () => Promise.reject(new Error("boom"))),
    ).rejects.toThrow("boom");
    expect(pool.pending).toBe(0);
  });

  it("queues pending work and drains it", async () => {
    let release: (() => void) | undefined;
    const pool = new WorkerPool(1);
    const first = pool.run(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const second = pool.run(async () => "done");
    expect(pool.running).toBe(1);
    expect(pool.pending).toBe(1);
    release?.();
    await first;
    await expect(second).resolves.toBe("done");
    expect(pool.pending).toBe(0);
  });
});
