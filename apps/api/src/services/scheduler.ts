import { logger } from '../utils/logger';

export interface ScheduledTask {
  name: string;
  run: () => Promise<unknown>;
  intervalMs: number;
}

/**
 * Tiny interval scheduler. Tasks never overlap: while a task is running its
 * next tick is skipped. `runNow(name)` drives tasks synchronously in tests.
 */
export class Scheduler {
  private readonly timers = new Map<string, NodeJS.Timeout>();
  private readonly running = new Set<string>();
  private started = false;

  constructor(private readonly tasks: ScheduledTask[] = []) {
    if (this.tasks.length === 0) {
      throw new Error('Scheduler requires at least one task');
    }
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    for (const task of this.tasks) {
      this.timers.set(
        task.name,
        setInterval(() => void this.tick(task), task.intervalMs),
      );
      // Fire once shortly after start so TTL sweeps don't wait a full interval.
      this.timers.get(task.name)!.unref();
      setTimeout(() => void this.tick(task), 50).unref();
    }
    logger.info({ tasks: this.tasks.map((t) => t.name) }, 'scheduler started');
  }

  stop(): void {
    for (const timer of this.timers.values()) clearInterval(timer);
    this.timers.clear();
    this.started = false;
    logger.info('scheduler stopped');
  }

  async runNow(name: string): Promise<unknown> {
    const task = this.tasks.find((t) => t.name === name);
    if (!task) throw new Error(`unknown scheduled task: ${name}`);
    return this.tick(task);
  }

  private async tick(task: ScheduledTask): Promise<void> {
    if (this.running.has(task.name)) return;
    this.running.add(task.name);
    try {
      await task.run();
    } catch (err) {
      logger.error({ err, task: task.name }, 'scheduled task failed');
    } finally {
      this.running.delete(task.name);
    }
  }
}