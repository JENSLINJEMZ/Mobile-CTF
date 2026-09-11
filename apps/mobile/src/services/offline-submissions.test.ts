import { beforeEach, describe, expect, it, vi } from "vitest";

const submitFlag = vi.hoisted(() => vi.fn());
const isApiReachable = vi.hoisted(() => vi.fn());
const savedQueues = vi.hoisted(() => [] as unknown[]);

vi.mock("@react-native-community/netinfo", () => ({
  default: { addEventListener: () => () => undefined },
}));
vi.mock("./challenges", () => ({ submitFlag }));
vi.mock("./http", () => ({ isApiReachable }));
vi.mock("./queue-storage", () => ({
  loadSubmissionQueue: vi.fn(async () => savedQueues.at(-1) ?? { pending: [] }),
  saveSubmissionQueue: vi.fn(async (queue: unknown) => {
    savedQueues.push(queue);
  }),
}));

import type { SubmitFlagResponse } from "@ctf/shared";

import { submitFlagViaGateway } from "./offline-submissions";

function accepted(): SubmitFlagResponse {
  return {
    correct: true,
    message: "Correct!",
    pointsAwarded: 100,
    firstBlood: false,
    totalScore: 100,
    rank: 1,
    challenge: { id: 1, slug: "caesar", title: "Caesar's Secret" },
  };
}

describe("submitFlagViaGateway", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savedQueues.length = 0;
  });

  it("submits live when the device is online", async () => {
    submitFlag.mockResolvedValue(accepted());
    const result = await submitFlagViaGateway(1, "ctf{x}", undefined, true);

    expect(result.status).toBe("accepted");
    expect(submitFlag).toHaveBeenCalledWith(
      1,
      "ctf{x}",
      undefined,
      expect.stringMatching(/^sub-1-[a-zA-Z0-9_-]+$/),
    );
    expect(savedQueues).toHaveLength(0);
  });

  it("submits live when NetInfo says offline but the backend probe succeeds", async () => {
    isApiReachable.mockResolvedValue(true);
    submitFlag.mockResolvedValue(accepted());

    const result = await submitFlagViaGateway(2, "ctf{y}", 7, false);

    expect(result.status).toBe("accepted");
    expect(isApiReachable).toHaveBeenCalled();
    expect(submitFlag).toHaveBeenCalledWith(2, "ctf{y}", 7, expect.any(String));
  });

  it("queues when the backend is genuinely unreachable", async () => {
    isApiReachable.mockResolvedValue(false);

    const result = await submitFlagViaGateway(2, "ctf{z}", undefined, false);

    expect(result.status).toBe("queued");
    expect(savedQueues).toHaveLength(1);
  });

  it("degrades a live network failure to the queue instead of failing", async () => {
    submitFlag.mockRejectedValue(new TypeError("Network request failed"));

    const result = await submitFlagViaGateway(1, "ctf{x}", undefined, true);

    expect(result.status).toBe("queued");
    expect(savedQueues.at(-1)).toMatchObject({ pending: [{ challengeId: 1, flag: "ctf{x}" }] });
  });

  it("never queues server-side HTTP errors like wrong flags", async () => {
    submitFlag.mockRejectedValue(new Error("Wrong flag"));

    await expect(
      submitFlagViaGateway(1, "nope", undefined, true),
    ).rejects.toThrow("Wrong flag");
    expect(savedQueues).toHaveLength(0);
  });
});