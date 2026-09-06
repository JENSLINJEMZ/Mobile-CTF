import type {
  ChallengeSummaryDto,
  ChallengeVersionDto,
} from "@ctf/shared";
import { Difficulty } from "@ctf/shared";
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

const emptyDraft = {
  title: "",
  slug: "",
  description: "",
  categoryId: 0,
  difficulty: Difficulty.EASY,
  basePoints: "100",
  flag: "",
  published: true,
};

const DIFFICULTIES: Difficulty[] = [
  Difficulty.EASY,
  Difficulty.MEDIUM,
  Difficulty.HARD,
  Difficulty.EXPERT,
];

function difficultyTone(
  d: Difficulty,
): "success" | "warning" | "danger" | "neutral" | "info" {
  switch (d) {
    case "EASY":
      return "success";
    case "MEDIUM":
      return "info";
    case "HARD":
      return "warning";
    case "EXPERT":
      return "danger";
    default:
      return "neutral";
  }
}

export function ChallengesView({ session }: { session: Session }) {
  const [challenges, setChallenges] = useState<ChallengeSummaryDto[]>([]);
  const [categories, setCategories] = useState<ChallengeSummaryDto["category"][]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [versions, setVersions] = useState<ChallengeVersionDto[] | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentTitle, setAttachmentTitle] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, cats] = await Promise.all([
        adminApi.listAdminChallenges(session),
        adminApi.listCategories(session),
      ]);
      setChallenges(list.items);
      setCategories(cats);
      if (cats.length > 0) {
        setDraft((d) => (d.categoryId === 0 ? { ...d, categoryId: cats[0]!.id } : d));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load challenges");
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const startCreate = useCallback(() => {
    setEditingId(null);
    setVersions(null);
    setSelectedFile(null);
    setAttachmentTitle("");
    setDraft({
      ...emptyDraft,
      categoryId: categories[0]?.id ?? 0,
    });
  }, [categories]);

  const startEdit = useCallback(
    (item: ChallengeSummaryDto) => {
      setEditingId(item.id);
      setVersions(null);
      setSelectedFile(null);
      setAttachmentTitle("");
      setDraft({
        title: item.title,
        slug: item.slug,
        description: "",
        categoryId: item.category.id,
        difficulty: item.difficulty,
        basePoints: String(item.basePoints),
        flag: "",
        published: item.published,
      });
      void adminApi
        .listChallengeVersions(session, item.id)
        .then(setVersions)
        .catch(() => undefined);
    },
    [session],
  );

  const onSave = useCallback(async () => {
    if (busy || !draft.title.trim() || !draft.slug.trim()) return;
    setBusy(true);
    setError(null);
    const payload = {
      title: draft.title.trim(),
      slug: draft.slug.trim(),
      description: draft.description.trim(),
      categoryId: draft.categoryId,
      difficulty: draft.difficulty,
      basePoints: Number(draft.basePoints) || 0,
      published: draft.published,
      ...(draft.flag.trim() ? { flag: draft.flag.trim() } : {}),
    };
    try {
      if (editingId === null) {
        await adminApi.createChallenge(session, payload);
      } else {
        await adminApi.updateChallenge(session, editingId, payload);
      }
      setDraft(emptyDraft);
      setEditingId(null);
      setVersions(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save challenge");
    } finally {
      setBusy(false);
    }
  }, [busy, draft, editingId, session, load]);

  const togglePublish = useCallback(
    async (item: ChallengeSummaryDto) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        await adminApi.updateChallenge(session, item.id, {
          title: item.title,
          slug: item.slug,
          description: "",
          categoryId: item.category.id,
          difficulty: item.difficulty,
          basePoints: item.basePoints,
          published: !item.published,
        });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to toggle publish");
      } finally {
        setBusy(false);
      }
    },
    [busy, session, load],
  );

  const onUpload = useCallback(
    async (challengeId: number) => {
      if (!selectedFile) return;
      setBusy(true);
      setError(null);
      try {
        const file = await adminApi.uploadFile(session, selectedFile);
        await adminApi.createAttachment(session, challengeId, {
          fileId: file.id,
          title: attachmentTitle.trim() || selectedFile.name,
        });
        setSelectedFile(null);
        setAttachmentTitle("");
        await load();
        const v = await adminApi.listChallengeVersions(session, challengeId);
        setVersions(v);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setBusy(false);
      }
    },
    [busy, selectedFile, attachmentTitle, session, load],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error ? <Text tone="danger">{error}</Text> : null}

      <Card
        title={editingId === null ? "New challenge" : `Edit challenge #${editingId}`}
        bodyStyle={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            placeholder="Title"
            style={inputStyle}
          />
          <input
            value={draft.slug}
            onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
            placeholder="Slug (url-slug)"
            style={inputStyle}
          />
        </div>
        <textarea
          value={draft.description}
          onChange={(e) =>
            setDraft((d) => ({ ...d, description: e.target.value }))
          }
          rows={4}
          placeholder="Description (Markdown)"
          style={inputStyle}
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <select
            value={draft.categoryId}
            onChange={(e) =>
              setDraft((d) => ({ ...d, categoryId: Number(e.target.value) }))
            }
            style={inputStyle}
          >
            <option value={0} disabled>
              Select category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={draft.difficulty}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                difficulty:
                  DIFFICULTIES.find((x) => x === e.target.value) ??
                  Difficulty.EASY,
              }))
            }
            style={inputStyle}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input
            value={draft.basePoints}
            onChange={(e) =>
              setDraft((d) => ({ ...d, basePoints: e.target.value }))
            }
            placeholder="Base points"
            type="number"
            style={inputStyle}
          />
          <input
            value={draft.flag}
            onChange={(e) => setDraft((d) => ({ ...d, flag: e.target.value }))}
            placeholder={editingId === null ? "Flag (required)" : "Flag (leave blank to keep)"}
            style={inputStyle}
          />
        </div>
        <label
          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}
        >
          <input
            type="checkbox"
            checked={draft.published}
            onChange={(e) =>
              setDraft((d) => ({ ...d, published: e.target.checked }))
            }
          />
          Published (visible to players)
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            disabled={
              busy ||
              !draft.title.trim() ||
              !draft.slug.trim() ||
              !draft.description.trim() ||
              draft.categoryId === 0
            }
            onClick={() => void onSave()}
          >
            {editingId === null ? "Create" : "Save"}
          </Button>
          <Button variant="secondary" onClick={startCreate}>
            Reset
          </Button>
        </div>
      </Card>

      {editingId !== null ? (
        <Card
          title="Attachment"
          bodyStyle={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            style={inputStyle}
          />
          <input
            value={attachmentTitle}
            onChange={(e) => setAttachmentTitle(e.target.value)}
            placeholder="Attachment title"
            style={inputStyle}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              disabled={busy || !selectedFile}
              onClick={() => void onUpload(editingId)}
            >
              Upload &amp; attach
            </Button>
          </div>
        </Card>
      ) : null}

      {versions ? (
        <Card
          title="Version history"
          bodyStyle={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          {versions.length === 0 ? (
            <Text tone="secondary">No prior versions.</Text>
          ) : null}
          {versions.map((v) => (
            <div
              key={v.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 14,
              }}
            >
              <span>
                <Badge tone="info">v{v.version}</Badge>{" "}
                <span style={{ fontWeight: 600 }}>{v.title}</span>
              </span>
              <Text tone="secondary" size="xs">
                {new Date(v.createdAt).toLocaleString()} · {v.authorUsername}
              </Text>
            </div>
          ))}
        </Card>
      ) : null}

      <Card
        title="Challenges"
        bodyStyle={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        {challenges.length === 0 ? (
          <Text tone="secondary">No challenges yet.</Text>
        ) : null}
        {challenges.map((item) => (
          <div
            key={item.id}
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
              <span style={{ fontWeight: 600 }}>{item.title}</span>
              <Badge tone={difficultyTone(item.difficulty)}>
                {item.difficulty}
              </Badge>
              <Badge tone={item.published ? "success" : "neutral"}>
                {item.published ? "published" : "draft"}
              </Badge>
              <Text tone="secondary" size="xs">
                {item.solvedCount} solves · {item.basePoints} pts
              </Text>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button size="sm" variant="secondary" onClick={() => startEdit(item)}>
                Edit
              </Button>
              <Button size="sm" onClick={() => void togglePublish(item)}>
                {item.published ? "Unpublish" : "Publish"}
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}