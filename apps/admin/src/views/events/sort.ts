import type { EventCardMeta } from "./format";

export type SortKey = "newest" | "oldest" | "participants" | "challenges";

export function sortEvents(rows: EventCardMeta[], sort: SortKey): EventCardMeta[] {
  const copy = [...rows];
  switch (sort) {
    case "newest":
      copy.sort(
        (a, b) =>
          (b.createdAt ?? b.startsAt).localeCompare(
            a.createdAt ?? a.startsAt,
          ),
      );
      break;
    case "oldest":
      copy.sort(
        (a, b) =>
          (a.createdAt ?? a.startsAt).localeCompare(
            b.createdAt ?? b.startsAt,
          ),
      );
      break;
    case "participants":
      copy.sort((a, b) => b.participantCount - a.participantCount);
      break;
    case "challenges":
      copy.sort((a, b) => b.challengeCount - a.challengeCount);
      break;
  }
  return copy;
}

export { matchesEvent } from "./format";
