import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

import { prisma } from "@ctf/database";
import Dockerode from "dockerode";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { env } from "../src/config/env";
import { DockerSandboxRuntime } from "../src/services/sandbox/dockerRuntime";
import {
  closeTerminalSession,
  configureSandboxRuntime,
  createTerminalSession,
  getSandboxRuntime,
} from "../src/services/terminalSessions";

const SANDBOX_DIR = resolve(
  import.meta.dirname,
  "../../../infrastructure/sandbox",
);
const BUILD_TIMEOUT_MS = 240_000;

function hasDocker(): boolean {
  try {
    execFileSync("docker", ["info"], { stdio: "ignore", timeout: 10_000 });
    return true;
  } catch {
    return false;
  }
}

function imageExists(image: string): boolean {
  try {
    execFileSync("docker", ["image", "inspect", image], {
      stdio: "ignore",
      timeout: 10_000,
    });
    return true;
  } catch {
    return false;
  }
}

const DOCKER_AVAILABLE = hasDocker();
const docker = new Dockerode({ socketPath: env.sandboxSocketPath });

describe.skipIf(!DOCKER_AVAILABLE)("sandbox isolation (docker-gated)", () => {
  const runtime = new DockerSandboxRuntime({ image: env.sandboxImage });

  let realSessionId = "";
  let realContainerId = "";

  beforeAll(async () => {
    if (!imageExists(env.sandboxImage)) {
      execFileSync("docker", ["build", "-t", env.sandboxImage, SANDBOX_DIR], {
        stdio: "inherit",
        timeout: BUILD_TIMEOUT_MS,
      });
    }
    configureSandboxRuntime(runtime);
    return Promise.resolve();
  }, BUILD_TIMEOUT_MS);

  afterAll(async () => {
    const container = realContainerId
      ? docker.getContainer(realContainerId)
      : null;
    if (container) {
      await container.kill().catch(() => undefined);
      await container.remove({ force: true }).catch(() => undefined);
    }
    await prisma.$disconnect();
  });

  it("creates a container with the hardened runtime configuration", async () => {
    const instance = await runtime.create("iso-hardening");
    realContainerId = instance.containerId;

    const info = await docker.getContainer(realContainerId).inspect();
    expect(info.Config.User).toBe("ctf:ctf");
    expect(info.Config.Image).toBe(env.sandboxImage);
    expect(info.Config.Cmd).toEqual(["/bin/bash"]);
    expect(info.Config.Tty).toBe(true);
    expect(info.Config.OpenStdin).toBe(true);

    expect(info.HostConfig.CapDrop).toContain("ALL");
    expect(info.HostConfig.SecurityOpt).toContain("no-new-privileges");
    expect(info.HostConfig.NetworkMode).toBe("none");
    expect(info.HostConfig.ReadonlyRootfs).toBe(true);
    expect(info.HostConfig.Memory).toBe(env.sandboxMemoryMb * 1024 * 1024);
    expect(info.HostConfig.MemorySwap).toBe(env.sandboxMemoryMb * 1024 * 1024);
    expect(info.HostConfig.PidsLimit).toBe(env.sandboxPidsLimit);
    expect(info.HostConfig.AutoRemove).toBe(true);

    await runtime.kill(realContainerId);
    await instance.exited;
  }, 60_000);

  it("runs as non-root with no capabilities, no network, and a read-only rootfs", async () => {
    const instance = await runtime.create("iso-exec");
    realContainerId = instance.containerId;

    const cmd =
      "echo UID=$(id -u); " +
      "echo CAP=$(awk '/CapEff/{print $2}' /proc/self/status); " +
      "echo ROUTES=$(awk 'NR>1 && NF>0' /proc/net/route | wc -l); " +
      "(echo hi > /etc/ctf-write-test 2>/dev/null && echo FS=WRITABLE) || echo FS=READONLY; " +
      "(echo hi > /tmp/ctf-tmp-test && echo TMP=TMPOK) || echo TMP=FAILED; " +
      "echo NOFILE=$(ulimit -n)";

    const stdout = execFileSync(
      "docker",
      ["exec", realContainerId, "sh", "-c", cmd],
      {
        encoding: "utf8",
        timeout: 30_000,
      },
    );
    expect(stdout).toContain("UID=10001"); // non-root
    expect(stdout).toContain("CAP=0000000000000000"); // no effective capabilities
    expect(stdout).toContain("ROUTES=0"); // disabled network
    expect(stdout).toContain("FS=READONLY"); // rootfs not writable
    expect(stdout).toContain("TMP=TMPOK"); // tmpfs writable
    expect(stdout).toContain("NOFILE=64"); // nofile rlimit

    await runtime.kill(realContainerId);
    await instance.exited;
  }, 60_000);

  it("relays input to the container and streams output back (attach path)", async () => {
    const instance = await runtime.create("iso-attach");
    realContainerId = instance.containerId;

    const received: string[] = [];
    instance.stream.on("data", (chunk: Buffer | string) => {
      received.push(Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk);
    });

    await runtime.write(realContainerId, "echo attach-roundtrip-ok\n");
    await new Promise<void>((resolveSignal) => {
      const deadline = setTimeout(resolveSignal, 8000);
      const check = setInterval(() => {
        if (received.some((chunk) => chunk.includes("attach-roundtrip-ok"))) {
          clearTimeout(deadline);
          clearInterval(check);
          resolveSignal();
        }
      }, 50);
      check.unref?.();
      deadline.unref?.();
    });

    expect(received.join("")).toContain("attach-roundtrip-ok");

    await runtime.kill(realContainerId);
    await instance.exited;
  }, 60_000);

  it("runs a full session lifecycle through the service over the real runtime", async () => {
    const user = await prisma.user.create({
      data: {
        email: `iso-${Date.now()}@example.com`,
        username: `iso${Date.now().toString().slice(-8)}`,
        passwordHash: "iso-test-hash",
      },
    });

    const session = await createTerminalSession(user.id);
    realSessionId = session.id;
    const row = await prisma.terminalSession.findUnique({
      where: { id: session.id },
    });
    realContainerId = row?.containerId ?? "";
    expect(session.status).toBe("RUNNING");
    expect(realContainerId).toBeTruthy();

    const info = await docker.getContainer(realContainerId).inspect();
    expect(info.Config.User).toBe("ctf:ctf");

    const closed = await closeTerminalSession(user.id, session.id);
    expect(closed.status).toBe("CLOSED");
    expect(getSandboxRuntime().type).toBe("docker");

    const container = docker.getContainer(realContainerId);
    const deadline = Date.now() + 8000;
    let gone = false;
    while (Date.now() < deadline && !gone) {
      await container.inspect().then(
        () => undefined,
        () => {
          gone = true;
        },
      );
      if (!gone) await new Promise((resolve) => setTimeout(resolve, 200));
    }
    expect(gone).toBe(true);
    await prisma.user.delete({ where: { id: user.id } });
  }, 60_000);
});
