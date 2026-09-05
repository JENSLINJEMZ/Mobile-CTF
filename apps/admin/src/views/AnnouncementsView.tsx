import type { AnnouncementDto } from '@ctf/shared';
import { Badge, Button, Card, Text } from '@ctf/ui';
import { useCallback, useEffect, useState } from 'react';

import type { Session } from '../adminApi';
import * as adminApi from '../adminApi';

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: 14,
  boxSizing: 'border-box',
  width: '100%',
};

export function AnnouncementsView({ session }: { session: Session }) {
  const [announcements, setAnnouncements] = useState<AnnouncementDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState({ title: '', body: '', pinned: false });
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState({ title: '', body: '', pinned: false });

  const load = useCallback(async () => {
    setError(null);
    try {
      setAnnouncements(await adminApi.listAnnouncements(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load announcements');
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreate = useCallback(async () => {
    if (busy || !draft.title.trim() || !draft.body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.createAnnouncement(session, {
        title: draft.title.trim(),
        body: draft.body.trim(),
        pinned: draft.pinned,
      });
      setDraft({ title: '', body: '', pinned: false });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create announcement');
    } finally {
      setBusy(false);
    }
  }, [busy, draft, session, load]);

  const startEdit = useCallback((item: AnnouncementDto) => {
    setEditing(item.id);
    setEditDraft({ title: item.title, body: item.body, pinned: item.pinned });
  }, []);

  const onSaveEdit = useCallback(
    async (id: number) => {
      if (busy || !editDraft.title.trim() || !editDraft.body.trim()) return;
      setBusy(true);
      setError(null);
      try {
        await adminApi.updateAnnouncement(session, id, {
          title: editDraft.title.trim(),
          body: editDraft.body.trim(),
          pinned: editDraft.pinned,
        });
        setEditing(null);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update announcement');
      } finally {
        setBusy(false);
      }
    },
    [busy, editDraft, session, load],
  );

  const onDelete = useCallback(
    async (id: number) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        await adminApi.deleteAnnouncement(session, id);
        if (editing === id) setEditing(null);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete announcement');
      } finally {
        setBusy(false);
      }
    },
    [busy, editing, session, load],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {error ? <Text tone="danger">{error}</Text> : null}

      <Card title="New announcement" bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <input
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder="Title"
          style={inputStyle}
        />
        <textarea
          value={draft.body}
          onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
          rows={4}
          placeholder="Body (Markdown)"
          style={inputStyle}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
          <input
            type="checkbox"
            checked={draft.pinned}
            onChange={(e) => setDraft((d) => ({ ...d, pinned: e.target.checked }))}
          />
          Pinned (shown first on the mobile Events tab)
        </label>
        <div>
          <Button
            disabled={busy || !draft.title.trim() || !draft.body.trim()}
            onClick={() => void onCreate()}
          >
            Create
          </Button>
        </div>
      </Card>

      <Card title="Announcements" bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {announcements.length === 0 ? (
          <Text tone="secondary">No announcements yet.</Text>
        ) : null}
        {announcements.map((item) => (
          <div key={item.id} style={{ padding: 10, borderRadius: 10, border: '1px solid #e2e8f0' }}>
            {editing === item.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={editDraft.title}
                  onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="Title"
                  style={inputStyle}
                />
                <textarea
                  value={editDraft.body}
                  onChange={(e) => setEditDraft((d) => ({ ...d, body: e.target.value }))}
                  rows={3}
                  placeholder="Body"
                  style={inputStyle}
                />
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={editDraft.pinned}
                    onChange={(e) => setEditDraft((d) => ({ ...d, pinned: e.target.checked }))}
                  />
                  Pinned
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" disabled={busy} onClick={() => void onSaveEdit(item.id)}>
                    Save
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setEditing(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontWeight: 600 }}>{item.title}</span>
                  {item.pinned ? <Badge tone="info">pinned</Badge> : null}
                  <Text tone="secondary" size="xs">
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </div>
                <Text tone="secondary" size="sm">
                  {item.body.length > 160 ? `${item.body.slice(0, 160)}…` : item.body}
                </Text>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" variant="secondary" onClick={() => startEdit(item)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => void onDelete(item.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}