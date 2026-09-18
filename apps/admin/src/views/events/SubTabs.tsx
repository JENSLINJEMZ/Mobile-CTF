import type {
  EventChallengeDto,
  UnlockRuleDto,
} from "@ctf/shared";
import { Badge, Button, Text } from "@ctf/ui";
import { useCallback, useMemo, useState } from "react";

import type { EventLeaderboardRow } from "../../adminApi";

const RULE_LABELS: Record<string, string> = {
  ALWAYS: "Always (no gate)",
  TIME: "Unlock at time",
  PREREQUISITE: "Requires challenge",
  SCORE: "Requires score",
};

function toLocalInput(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

function RuleEditor({
  rule,
  candidates,
  onSave,
  busy,
}: {
  rule: UnlockRuleDto | null;
  candidates: EventChallengeDto[];
  onSave: (rule: UnlockRuleDto | null) => Promise<void>;
  busy: boolean;
}) {
  const [type, setType] = useState<UnlockRuleDto["type"]>(rule?.type ?? "ALWAYS");
  const [unlockAt, setUnlockAt] = useState(
    rule?.unlockAt ? toLocalInput(rule.unlockAt) : "",
  );
  const [requireChallengeIds, setRequireChallengeIds] = useState<number[]>(
    rule?.requireChallengeIds ?? [],
  );
  const [minScore, setMinScore] = useState<string>(
    rule?.minScore != null ? String(rule.minScore) : "",
  );
  const [saving, setSaving] = useState(false);

  const build = useCallback((): UnlockRuleDto | null => {
    if (type === "ALWAYS") return null;
    if (type === "TIME") {
      if (!unlockAt) return null;
      return { type, unlockAt: fromLocalInput(unlockAt) };
    }
    if (type === "PREREQUISITE") {
      if (requireChallengeIds.length === 0) return null;
      return { type, requireChallengeIds };
    }
    const score = Number(minScore);
    if (!Number.isInteger(score) || score < 0) return null;
    return { type, minScore: score };
  }, [type, unlockAt, requireChallengeIds, minScore]);

  const togglePrereq = useCallback((challengeId: number) => {
    setRequireChallengeIds((prev) =>
      prev.includes(challengeId)
        ? prev.filter((id) => id !== challengeId)
        : [...prev, challengeId],
    );
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(build());
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="evt-rule-editor">
      <select
        value={type}
        onChange={(e) => setType(e.target.value as UnlockRuleDto["type"])}
      >
        {(Object.keys(RULE_LABELS) as (keyof typeof RULE_LABELS)[]).map(
          (key) => (
            <option key={key} value={key}>
              {RULE_LABELS[key]}
            </option>
          ),
        )}
      </select>

      {type === "TIME" ? (
        <input
          type="datetime-local"
          value={unlockAt}
          onChange={(e) => setUnlockAt(e.target.value)}
        />
      ) : null}

      {type === "PREREQUISITE" ? (
        <div className="evt-prereq-list">
          {candidates.map((c) => (
            <label key={c.id} className="evt-prereq">
              <input
                type="checkbox"
                checked={requireChallengeIds.includes(c.challengeId)}
                onChange={() => togglePrereq(c.challengeId)}
              />
              <span>{c.title}</span>
            </label>
          ))}
          {candidates.length === 0 ? (
            <Text tone="secondary" size="xs">
              No other challenges in this event yet.
            </Text>
          ) : null}
        </div>
      ) : null}

      {type === "SCORE" ? (
        <input
          type="number"
          min={0}
          step={1}
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          placeholder="Minimum score"
        />
      ) : null}

      {type !== "ALWAYS" ? (
        <Button size="sm" disabled={saving || busy || !build()} onClick={() => void save()}>
          Save rule
        </Button>
      ) : null}
    </div>
  );
}

export function ChallengesTab({
  eventId,
  challenges,
  addable,
  busy,
  onAdd,
  onUpdate,
  onRemove,
}: {
  eventId: number;
  challenges: EventChallengeDto[];
  addable: { id: number; title: string }[];
  busy: boolean;
  onAdd: (eventId: number, challengeId: number) => Promise<void>;
  onUpdate: (ec: EventChallengeDto, rule: UnlockRuleDto | null) => Promise<void>;
  onRemove: (ec: EventChallengeDto) => Promise<void>;
}) {
  const [addId, setAddId] = useState<number | "">("");
  const [editing, setEditing] = useState<number | null>(null);

  const add = useCallback(async () => {
    if (busy || addId === "") return;
    await onAdd(eventId, addId as number);
    setAddId("");
  }, [busy, addId, onAdd, eventId]);

  return (
    <div className="evt-subtab">
      <div className="evt-add-challenge-row">
        <select value={addId} onChange={(e) => setAddId(e.target.value === "" ? "" : Number(e.target.value))}>
          <option value="">Add a challenge…</option>
          {addable.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        <Button size="sm" disabled={busy || addId === ""} onClick={() => void add()}>
          Add
        </Button>
      </div>

      {challenges.length === 0 ? (
        <Text tone="secondary" size="sm">
          No challenges in this event yet. Add one above, then configure its
          unlock rule.
        </Text>
      ) : (
        challenges.map((ec) => {
          const open = editing === ec.id;
          return (
            <div key={ec.id} className="evt-ch-row">
              <div className="evt-ch-info">
                <div className="evt-ch-top">
                  <span className="evt-ch-title">{ec.title}</span>
                  <Badge tone="neutral">{ec.basePoints} pts</Badge>
                  <Badge tone={ec.locked ? "neutral" : "success"}>
                    {ec.locked ? "Locked" : "Open"}
                  </Badge>
                </div>
                <Text tone="secondary" size="xs">
                  {ec.unlockRule
                    ? `Rule: ${RULE_LABELS[ec.unlockRule.type] ?? ec.unlockRule.type}`
                    : "Rule: always open"}
                </Text>
                {open ? (
                  <RuleEditor
                    rule={ec.unlockRule}
                    candidates={challenges.filter(
                      (c) => c.challengeId !== ec.challengeId,
                    )}
                    busy={busy}
                    onSave={(rule) => onUpdate(ec, rule)}
                  />
                ) : null}
              </div>
              <div className="evt-ch-actions">
                <Button size="sm" onClick={() => setEditing(open ? null : ec.id)}>
                  {open ? "Close" : "Edit rule"}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => void onRemove(ec)}
                >
                  Remove
                </Button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export function ParticipantsTab({
  entries,
  loading,
  onRefresh,
}: {
  entries: EventLeaderboardRow[];
  loading: boolean;
  onRefresh: () => void;
}) {
  const total = useMemo(
    () =>
      entries.reduce((acc, e) => {
        if (typeof e.score === "number") return acc + e.score;
        return acc;
      }, 0),
    [entries],
  );
  return (
    <div className="evt-subtab">
      <div className="evt-participants-head">
        <Text tone="secondary" size="xs">
          {entries.length} scored participants · {Math.round(total)} pts total
        </Text>
        <Button size="sm" onClick={onRefresh} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </div>
      <div className="evt-participants-list">
        {entries.length === 0 ? (
          <Text tone="secondary" size="sm">
            No leaderboard data yet. Solves are scored once the event is running.
          </Text>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="evt-participant">
              <span className="evt-rank">{e.rank}</span>
              <span className="evt-name">{e.name}</span>
              <span className="evt-score">{e.score.toLocaleString()} pts</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}