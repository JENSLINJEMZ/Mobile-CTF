import type { AuditLogDto } from "@ctf/shared";
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

function actionTone(
  action: string,
): "neutral" | "info" | "danger" | "success" | "warning" {
  if (action.includes("delete")) return "danger";
  if (action.includes("create")) return "success";
  if (action.includes("update")) return "warning";
  return "info";
}

export function AuditLogView({ session }: { session: Session }) {
  const [items, setItems] = useState<AuditLogDto[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (action = filter) => {
      setBusy(true);
      setError(null);
      try {
        setItems((await adminApi.listAuditLog(session, { action })).items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit log");
      } finally {
        setBusy(false);
      }
    },
    [session, filter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card
        title="Audit log"
        bodyStyle={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void load();
            }}
            placeholder="Filter by action (e.g. challenge.create)"
            style={{ ...inputStyle, flex: 1 }}
          />
          <Button disabled={busy} onClick={() => void load()}>
            Apply
          </Button>
          <Button
            variant="secondary"
            disabled={busy || !filter}
            onClick={() => {
              setFilter("");
              void load("");
            }}
          >
            Clear
          </Button>
        </div>
        {error ? <Text tone="danger">{error}</Text> : null}

        {items.length === 0 ? (
          <Text tone="secondary">No audit entries found.</Text>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Badge tone={actionTone(entry.action)}>{entry.action}</Badge>
                <Badge tone="neutral">{entry.entityType}</Badge>
                {entry.entityId ? (
                  <Text tone="secondary" size="xs">
                    #{entry.entityId}
                  </Text>
                ) : null}
                <Text tone="secondary" size="xs">
                  {new Date(entry.createdAt).toLocaleString()}
                </Text>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Text tone="secondary" size="xs">
                  actor: {entry.actorUsername ?? `#${entry.actorId ?? "?"}`}
                </Text>
                {entry.ipAddress ? (
                  <Text tone="secondary" size="xs">
                    ip: {entry.ipAddress}
                  </Text>
                ) : null}
                {entry.details ? (
                  <Text tone="secondary" size="xs">
                    details: {JSON.stringify(entry.details)}
                  </Text>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}