import type { TeamAdminDto } from "@ctf/shared";
import { Badge, Button, Card, Text } from "@ctf/ui";
import { useCallback, useEffect, useState } from "react";

import type { Session } from "../adminApi";
import * as adminApi from "../adminApi";

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
  width: "100%",
};

export function TeamsView({ session }: { session: Session }) {
  const [teams, setTeams] = useState<TeamAdminDto[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (query = search) => {
      setError(null);
      try {
        setTeams((await adminApi.listAdminTeams(session, query)).items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load teams");
      }
    },
    [session, search],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = useCallback(
    async (id: number) => {
      if (!globalThis.confirm("Delete this team?")) return;
      setBusy(true);
      setError(null);
      try {
        await adminApi.deleteAdminTeam(session, id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setBusy(false);
      }
    },
    [session, load],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card
        title="Teams"
        bodyStyle={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team name or code"
            style={{ ...inputStyle, flex: 1 }}
          />
          <Button disabled={busy} onClick={() => void load()}>
            Search
          </Button>
        </div>
        {error ? <Text tone="danger">{error}</Text> : null}

        {teams.length === 0 ? (
          <Text tone="secondary">No teams found.</Text>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {teams.map((team) => (
            <div
              key={team.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 10,
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 600 }}>{team.name}</span>
                <Badge tone="neutral">{team.memberCount} members</Badge>
                <Text tone="secondary" size="xs">
                  @{team.slug} · code {team.joinCode}
                </Text>
                {team.leaderUsername ? (
                  <Text tone="secondary" size="xs">
                    leader: {team.leaderUsername}
                  </Text>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="danger"
                disabled={busy}
                onClick={() => void onDelete(team.id)}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}