import type { UserAdminDto } from "@ctf/shared";
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

const ROLES = ["AUTHOR", "MODERATOR", "ADMIN", "SUPER_ADMIN"] as const;

function roleTone(
  role: string,
): "neutral" | "info" | "warning" | "danger" | "success" {
  switch (role) {
    case "SUPER_ADMIN":
      return "danger";
    case "ADMIN":
      return "warning";
    case "MODERATOR":
      return "info";
    case "AUTHOR":
      return "success";
    default:
      return "neutral";
  }
}

export function UsersView({ session }: { session: Session }) {
  const [users, setUsers] = useState<UserAdminDto[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    async (query = search) => {
      setError(null);
      try {
        setUsers((await adminApi.listAdminUsers(session, query)).items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      }
    },
    [session, search],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const applyRole = useCallback(
    async (user: UserAdminDto, role: string) => {
      setBusy(true);
      setError(null);
      try {
        await adminApi.updateUser(session, user.id, { role });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Role change failed");
      } finally {
        setBusy(false);
      }
    },
    [session, load],
  );

  const toggleActive = useCallback(
    async (user: UserAdminDto) => {
      setBusy(true);
      setError(null);
      try {
        await adminApi.updateUser(session, user.id, { isActive: !user.isActive });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed");
      } finally {
        setBusy(false);
      }
    },
    [session, load],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Card
        title="Users"
        bodyStyle={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setBusy(true);
            }}
            placeholder="Search username or email"
            style={{ ...inputStyle, flex: 1 }}
          />
          <Button
            disabled={busy}
            onClick={() => {
              void load();
            }}
          >
            Search
          </Button>
        </div>
        {error ? <Text tone="danger">{error}</Text> : null}

        {users.length === 0 ? (
          <Text tone="secondary">No users found.</Text>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {users.map((user) => (
            <div
              key={user.id}
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
                <Badge tone={user.isActive ? "success" : "danger"}>
                  {user.isActive ? "active" : "disabled"}
                </Badge>
                <span style={{ fontWeight: 600 }}>{user.username}</span>
                <Text tone="secondary" size="xs">
                  {user.email}
                </Text>
                <Text tone="secondary" size="xs">
                  {user.solveCount} solves · {user.totalScore} pts
                </Text>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge tone={roleTone(user.role)}>{user.role}</Badge>
                <select
                  value={user.role}
                  onChange={(e) => void applyRole(user, e.target.value)}
                  disabled={busy}
                  style={{
                    ...inputStyle,
                    width: "auto",
                    padding: "4px 8px",
                  }}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant={user.isActive ? "danger" : "secondary"}
                  disabled={busy}
                  onClick={() => void toggleActive(user)}
                >
                  {user.isActive ? "Disable" : "Enable"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}