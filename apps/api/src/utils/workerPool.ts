interface Task<T> {
  run: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

/**
 * Bounded-concurrency pool. Submits are queued and started as workers free up.
 * Used by the sandbox runtime so container creation (the expensive op) never
 * bursts the docker daemon.
 */
export class WorkerPool {
  private readonly queue: Task<unknown>[] = [];
  private active = 0;

  constructor(private readonly concurrency: number) {}

  run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        run: task as () => Promise<unknown>,
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      this.pump();
    });
  }

  get pending(): number {
    return this.queue.length;
  }

  get running(): number {
    return this.active;
  }

  private pump(): void {
    while (this.active < this.concurrency) {
      const next = this.queue.shift();
      if (!next) break;
      this.active += 1;
      void next
        .run()
        .then(next.resolve, next.reject)
        .finally(() => {
          this.active -= 1;
          this.pump();
        });
    }
  }
}
