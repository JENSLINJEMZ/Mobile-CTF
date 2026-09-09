import { describe, expect, it } from "vitest";

import { scanDestructiveInput, scanRm } from "../src/services/sandbox/destructiveGuard";

describe("scanRm", () => {
  it("flags rm -rf /", () => {
    expect(scanRm("rm -rf /")?.id).toBe("RM_DELETE_ROOT");
  });

  it("flags rm -fr /tmp/*", () => {
    // /tmp is user-writable tmpfs — not a system path; guard intentionally ignores it.
    expect(scanRm("rm -fr /tmp/*")).toBeNull();
  });

  it("flags rm -rf /etc", () => {
    expect(scanRm("rm -rf /etc")?.id).toBe("RM_DELETE_ROOT");
  });

  it("flags rm --no-preserve-root -rf /", () => {
    expect(scanRm("rm --no-preserve-root -rf /")?.id).toBe("RM_DELETE_ROOT");
  });

  it("does not flag plain rm /tmp/test", () => {
    expect(scanRm("rm /tmp/test")).toBeNull();
  });

  it("does not flag git clean", () => {
    expect(scanRm("git clean -fd")).toBeNull();
  });
});

describe("scanDestructiveInput", () => {
  it("flags mkfs", () => {
    expect(scanDestructiveInput("mkfs.ext4 /dev/sda1")?.id).toBe("MKFS_DEVICE");
  });

  it("flags dd to block device", () => {
    expect(
      scanDestructiveInput("dd if=/dev/zero of=/dev/sda")?.id,
    ).toBe("DD_BLOCK_DEVICE");
  });

  it("flags fork bomb", () => {
    expect(scanDestructiveInput(":(){:|:&};:")?.id).toBe("FORK_BOMB");
  });

  it("allows whoami", () => {
    expect(scanDestructiveInput("whoami")).toBeNull();
  });

  it("allows python scripts", () => {
    expect(scanDestructiveInput("python3 -V")).toBeNull();
  });

  it("flags rm -rf / inside a chain", () => {
    expect(
      scanDestructiveInput("echo hi ; rm -rf / && echo done")?.id,
    ).toBe("RM_DELETE_ROOT");
  });
});