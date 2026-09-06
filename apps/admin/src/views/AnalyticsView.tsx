import type { AnalyticsOverviewDto } from "@ctf/shared";
import { Badge, Button, Card, Text } from "@ctf/ui";
import { useCallback, useEffect, useState } from "react";

import type { Session } from "../adminApi";
import * as adminApi from "../adminApi";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <Text tone="secondary" size="xs">
        {label}
      </Text>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div
      style={{
        width: 10,
        height: 48,
        borderRadius: 4,
        backgroundColor: "#e2e8f0",
        display: "flex",
        alignItems: "flex-end",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: `${pct}%`,
          backgroundColor: "#2563eb",
          borderRadius: 4,
        }}
      />
    </div>
  );
}

export function AnalyticsView({ session }: { session: Session }) {
  const [overview, setOverview] = useState<AnalyticsOverviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setOverview(await adminApi.getAnalyticsOverview(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setBusy(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!overview) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {error ? <Text tone="danger">{error}</Text> : null}
        <Button onClick={() => void load()} disabled={busy}>
          Load analytics
        </Button>
      </div>
    );
  }

  const maxDay = Math.max(1, ...overview.submissionsByDay.map((d) => d.solves));
  const maxSolves = Math.max(1, ...overview.topChallenges.map((c) => c.solvedCount));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card
        title="Overview"
        bodyStyle={{ display: "flex", gap: 12, flexWrap: "wrap" }}
      >
        <Stat label="Users" value={overview.totalUsers} />
        <Stat label="Active" value={overview.activeUsers} />
        <Stat label="Challenges" value={overview.totalChallenges} />
        <Stat label="Published" value={overview.publishedChallenges} />
        <Stat label="Solves" value={overview.totalSubmissions} />
        <Stat label="Attempts" value={overview.totalAttempts} />
        <Stat label="Points" value={overview.totalPointsAwarded} />
        <Stat label="Solves today" value={overview.solvesToday} />
        <Stat label="Solves (7d)" value={overview.solvesThisWeek} />
        <Stat label="First bloods" value={overview.firstBloodCount} />
      </Card>

      <Card
        title="Solves per day (last 14 days)"
        bodyStyle={{ display: "flex", gap: 6, alignItems: "flex-end" }}
      >
        {overview.submissionsByDay.map((d) => (
          <div
            key={d.date}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              flex: 1,
            }}
          >
            <MiniBar value={d.solves} max={maxDay} />
            <Text tone="secondary" size="xs">
              {d.date.slice(5)}
            </Text>
            <Text tone="secondary" size="xs">
              {d.solves}
            </Text>
          </div>
        ))}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card
          title="Top challenges"
          bodyStyle={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {overview.topChallenges.length === 0 ? (
            <Text tone="secondary">No challenges yet.</Text>
          ) : null}
          {overview.topChallenges.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                <MiniBar value={c.solvedCount} max={maxSolves} />
                <div>
                  <div style={{ fontWeight: 600 }}>{c.title}</div>
                  <Text tone="secondary" size="xs">
                    {c.solvedCount} solves · {c.attemptCount} attempts ·{" "}
                    {c.pointsAwarded} pts
                  </Text>
                </div>
              </div>
              {c.firstBloodCount > 0 ? <Badge tone="warning">first blood</Badge> : null}
            </div>
          ))}
        </Card>

        <Card
          title="Top solvers"
          bodyStyle={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {overview.topSolvers.length === 0 ? (
            <Text tone="secondary">No solvers yet.</Text>
          ) : null}
          {overview.topSolvers.map((s, i) => (
            <div
              key={s.userId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 700, color: "#64748b", width: 20 }}>
                  {i + 1}
                </span>
                <span style={{ fontWeight: 600 }}>{s.username}</span>
              </div>
              <Text tone="secondary" size="sm">
                {s.solves} solves · {s.points} pts
              </Text>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}