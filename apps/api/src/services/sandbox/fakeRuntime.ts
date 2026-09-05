import { randomBytes } from 'node:crypto';
import { PassThrough } from 'node:stream';

import type { SandboxInstance, SandboxRuntime } from './types';

interface FakeContainer {
  containerId: string;
  stream: PassThrough;
  exited: Promise<number | null>;
  resolveExit: (code: number | null) => void;
  inputs: Buffer[];
  ended: boolean;
}

let serial = 0;

function fakeContainerId(): string {
  serial += 1;
  return `fake-${serial}-${randomBytes(4).toString('hex')}`;
}

/**
 * In-memory stand-in for the docker runtime. `emit(sessionId, data)` simulates
 * the container printing output; writes from the app are recorded in
 * `inputs`. Used by unit/integration tests that must not require a docker
 * daemon.
 */
export class FakeSandboxRuntime implements SandboxRuntime {
  readonly type = 'fake';

  readonly containers = new Map<string, FakeContainer>();
  killCalls: string[] = [];

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async create(sessionId: string): Promise<SandboxInstance> {
    const containerId = fakeContainerId();
    const stream = new PassThrough();
    let resolveExit: (code: number | null) => void = () => undefined;
    const exited = new Promise<number | null>((resolve) => {
      resolveExit = resolve;
    });
    const container: FakeContainer = {
      containerId,
      stream,
      exited: exited.finally(() => {
        this.containers.delete(sessionId);
      }),
      resolveExit,
      inputs: [],
      ended: false,
    };
    this.containers.set(sessionId, container);

    stream.on('close', () => {
      if (!container.ended) {
        container.ended = true;
        resolveExit(null);
      }
    });

    return { containerId, stream, exited };
  }

  async write(containerId: string, data: string): Promise<void> {
    for (const container of this.containers.values()) {
      if (container.containerId === containerId) {
        container.inputs.push(Buffer.from(data, 'utf8'));
        if (!container.stream.destroyed) container.stream.write(data);
        return;
      }
    }
  }

  async kill(containerId: string): Promise<void> {
    this.killCalls.push(containerId);
    for (const container of this.containers.values()) {
      if (container.containerId === containerId) {
        if (!container.ended) {
          container.ended = true;
          container.resolveExit(null);
        }
        container.stream.destroy();
        return;
      }
    }
  }

  /** Simulate the container emitting output (as a shell would). */
  emit(sessionId: string, data: string): void {
    const container = this.containers.get(sessionId);
    if (container && !container.stream.destroyed) container.stream.write(data);
  }

  /** Force the container's shell to exit with the given code. */
  exit(sessionId: string, code: number): void {
    const container = this.containers.get(sessionId);
    if (container && !container.ended) {
      container.ended = true;
      container.resolveExit(code);
    }
    container?.stream.destroy();
  }
}