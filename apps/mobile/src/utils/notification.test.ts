import { describe, expect, it } from "vitest";

import { formatRelativeTime, notificationIcon } from "./notification";

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-09-06T12:00:00Z");

  it("renders 'just now' for fresh timestamps", () => {
    expect(formatRelativeTime("2026-09-06T11:59:59Z", now)).toBe("just now");
  });

  it("renders minutes for under an hour", () => {
    expect(formatRelativeTime("2026-09-06T11:55:00Z", now)).toBe("5m ago");
  });

  it("renders hours for under a day", () => {
    expect(formatRelativeTime("2026-09-06T10:00:00Z", now)).toBe("2h ago");
  });

  it("renders 'yesterday' for a single day", () => {
    expect(formatRelativeTime("2026-09-05T10:00:00Z", now)).toBe("yesterday");
  });

  it("renders days otherwise", () => {
    expect(formatRelativeTime("2026-09-03T12:00:00Z", now)).toBe("3d ago");
  });

  it("handles future timestamps and invalid input", () => {
    expect(formatRelativeTime("2026-09-07T00:00:00Z", now)).toBe("just now");
    expect(formatRelativeTime("not-a-date", now)).toBe("");
  });
});

describe("notificationIcon", () => {
  it("maps known types", () => {
    expect(notificationIcon("ANNOUNCEMENT")).toBe("megaphone");
    expect(notificationIcon("ACHIEVEMENT")).toBe("trophy");
    expect(notificationIcon("TEAM_INVITE")).toBe("people");
    expect(notificationIcon("EVENT")).toBe("calendar");
    expect(notificationIcon("SYSTEM")).toBe("information-circle");
  });

  it("falls back for unknown types", () => {
    expect(notificationIcon("SOMETHING_ELSE")).toBe("information-circle");
  });
});