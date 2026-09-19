import { Router } from "express";

import {
  Role,
  createAnnouncementSchema,
  createAttachmentSchema,
  createChallengeSchema,
  createEventChallengeSchema,
  createEventSchema,
  createHintSchema,
  createUserSchema,
  adminListQuerySchema,
  auditLogQuerySchema,
  broadcastNotificationSchema,
  createTeamSchema,
  updateAdminTeamSchema,
  updateAnnouncementSchema,
  updateChallengeSchema,
  updateEventChallengeSchema,
  updateEventSchema,
  updateHintSchema,
  updateUserSchema,
  adminSubmissionQuerySchema,
  adminAnnouncementQuerySchema,
  updatePlatformSettingsSchema,
} from "@ctf/shared";

import { asyncHandler } from "../middleware/errors";
import {
  authenticate,
  requirePermission,
  requireRole,
  type AuthUser,
} from "../middleware/auth";
import { createRateLimiter } from "../middleware/rateLimit";
import { uploadSingle } from "../middleware/upload";
import { validateBody } from "../middleware/validate";
import { env } from "../config/env";
import {
  createAnnouncement,
  deleteAnnouncement,
  updateAnnouncement,
} from "../services/announcements";
import {
  getAnnouncementOverview,
  listAdminAnnouncements,
} from "../services/adminAnnouncements";
import {
  createAttachment,
  createChallenge,
  createHint,
  deleteAttachment,
  deleteChallenge,
  deleteHint,
  listChallengeVersions,
  listChallenges,
  updateChallenge,
  updateHint,
} from "../services/challenges";
import {
  addEventChallenge,
  createEvent,
  deleteEvent,
  removeEventChallenge,
  updateEvent,
  updateEventChallenge,
} from "../services/events";
import { listEvents } from "../services/eventQueries";
import { getAnalyticsOverview } from "../services/analytics";
import { getSystemStatus } from "../services/systemStatus";
import {
  getSettingsOverview,
  updatePlatformSettings,
} from "../services/platformSettings";
import { listAuditLog, recordAudit } from "../services/auditLog";
import { listUsers, createAdminUser, updateUser } from "../services/adminUsers";
import {
  createAdminTeam,
  deleteAdminTeam,
  getAdminTeamDetail,
  listAdminTeams,
  updateAdminTeam,
} from "../services/adminTeams";
import {
  deleteFileAsset,
  listFiles,
  storeUpload,
} from "../services/fileAssets";
import {
  getSubmissionOverview,
  listAdminSubmissions,
} from "../services/adminSubmissions";
import { createBroadcastNotification } from "../services/notifications";
import { getSandboxSnapshot, stopSandboxContainer } from "../services/sandboxAdmin";
import { getSandboxRuntime } from "../services/terminalSessions";

function me(req: { user?: AuthUser }): AuthUser {
  if (!req.user) {
    throw new Error("Unauthenticated admin action");
  }
  return req.user;
}

export const adminRouter = Router();

adminRouter.use(authenticate);
adminRouter.use(
  requireRole(Role.AUTHOR, Role.MODERATOR, Role.ADMIN, Role.SUPER_ADMIN),
);

const uploadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  limit: env.rateLimitUpload,
  keyPrefix: "upload",
  keyGenerator: (req) => `user:${req.user?.id ?? "anon"}`,
});

// --- Challenges / Hints (content) -----------------------------------------

adminRouter.get(
  "/challenges",
  requirePermission("content.manage"),
  asyncHandler(async (req, res) => {
    const { page, limit, search } = adminListQuerySchema.parse(req.query);
    const data = await listChallenges(
      { page, limit, search },
      { id: me(req).id, role: me(req).role },
    );
    res.json({ success: true, data });
  }),
);

adminRouter.get(
  "/challenges/:id(\\d+)/versions",
  requirePermission("content.manage"),
  asyncHandler(async (req, res) => {
    const data = await listChallengeVersions(Number(req.params.id));
    res.json({ success: true, data });
  }),
);

adminRouter.post(
  "/challenges",
  requirePermission("content.manage"),
  validateBody(createChallengeSchema),
  asyncHandler(async (req, res) => {
    const actor = me(req);
    const data = await createChallenge(req.body, actor.id, req.ip);
    res.status(201).json({ success: true, data });
  }),
);

adminRouter.put(
  "/challenges/:id(\\d+)",
  requirePermission("content.manage"),
  validateBody(updateChallengeSchema),
  asyncHandler(async (req, res) => {
    const actor = me(req);
    const data = await updateChallenge(
      Number(req.params.id),
      req.body,
      actor.id,
      req.ip,
    );
    res.json({ success: true, data });
  }),
);

adminRouter.delete(
  "/challenges/:id(\\d+)",
  requirePermission("content.manage"),
  asyncHandler(async (req, res) => {
    await deleteChallenge(Number(req.params.id), me(req).id, req.ip);
    res.json({ success: true, data: { deleted: true } });
  }),
);

adminRouter.post(
  "/challenges/:id(\\d+)/hints",
  requirePermission("content.manage"),
  validateBody(createHintSchema),
  asyncHandler(async (req, res) => {
    const data = await createHint(
      Number(req.params.id),
      req.body,
      me(req).id,
      req.ip,
    );
    res.status(201).json({ success: true, data });
  }),
);

adminRouter.put(
  "/hints/:id(\\d+)",
  requirePermission("content.manage"),
  validateBody(updateHintSchema),
  asyncHandler(async (req, res) => {
    const data = await updateHint(
      Number(req.params.id),
      req.body,
      me(req).id,
      req.ip,
    );
    res.json({ success: true, data });
  }),
);

adminRouter.delete(
  "/hints/:id(\\d+)",
  requirePermission("content.manage"),
  asyncHandler(async (req, res) => {
    await deleteHint(Number(req.params.id), me(req).id, req.ip);
    res.json({ success: true, data: { deleted: true } });
  }),
);

// --- Attachments ----------------------------------------------------------

adminRouter.post(
  "/challenges/:id(\\d+)/attachments",
  requirePermission("content.manage"),
  validateBody(createAttachmentSchema),
  asyncHandler(async (req, res) => {
    const data = await createAttachment(
      Number(req.params.id),
      req.body,
      me(req).id,
      req.ip,
    );
    res.status(201).json({ success: true, data });
  }),
);

adminRouter.delete(
  "/attachments/:id(\\d+)",
  requirePermission("content.manage"),
  asyncHandler(async (req, res) => {
    await deleteAttachment(Number(req.params.id), me(req).id, req.ip);
    res.json({ success: true, data: { deleted: true } });
  }),
);

// --- Files (upload / manage) ----------------------------------------------

adminRouter.post(
  "/files",
  requirePermission("files.upload"),
  uploadLimiter,
  uploadSingle("file"),
  asyncHandler(async (req, res) => {
    const actor = me(req);
    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({ success: false, error: { message: "Missing file field" } });
    }
    const data = await storeUpload({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      uploaderId: actor.id,
      uploaderUsername: actor.username,
    });
    await recordAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: "file.upload",
      entityType: "file",
      entityId: String(data.id),
      details: {
        originalName: data.originalName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
      },
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data });
  }),
);

adminRouter.get(
  "/files",
  requirePermission("files.upload"),
  asyncHandler(async (req, res) => {
    const { page, limit, search } = adminListQuerySchema.parse(req.query);
    const data = await listFiles({ page, limit, search });
    res.json({ success: true, data });
  }),
);

adminRouter.delete(
  "/files/:id(\\d+)",
  requirePermission("files.upload"),
  asyncHandler(async (req, res) => {
    const actor = me(req);
    await deleteFileAsset(Number(req.params.id));
    await recordAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: "file.delete",
      entityType: "file",
      entityId: String(req.params.id),
      ipAddress: req.ip,
    });
    res.json({ success: true, data: { deleted: true } });
  }),
);

// --- Events ---------------------------------------------------------------

adminRouter.get(
  "/events",
  requirePermission("events.manage"),
  asyncHandler(async (req, res) => {
    const data = await listEvents("all", me(req).id);
    res.json({ success: true, data });
  }),
);

adminRouter.post(
  "/events",
  requirePermission("events.manage"),
  validateBody(createEventSchema),
  asyncHandler(async (req, res) => {
    const data = await createEvent(req.body, me(req).id, req.ip);
    res.status(201).json({ success: true, data });
  }),
);

adminRouter.patch(
  "/events/:id(\\d+)",
  requirePermission("events.manage"),
  validateBody(updateEventSchema),
  asyncHandler(async (req, res) => {
    const data = await updateEvent(
      Number(req.params.id),
      req.body,
      me(req).id,
      req.ip,
    );
    res.json({ success: true, data });
  }),
);

adminRouter.delete(
  "/events/:id(\\d+)",
  requirePermission("events.manage"),
  asyncHandler(async (req, res) => {
    await deleteEvent(Number(req.params.id), me(req).id, req.ip);
    res.json({ success: true, data: { deleted: true } });
  }),
);

adminRouter.post(
  "/events/:id(\\d+)/challenges",
  requirePermission("events.manage"),
  validateBody(createEventChallengeSchema),
  asyncHandler(async (req, res) => {
    const data = await addEventChallenge(
      Number(req.params.id),
      req.body,
      me(req).id,
      req.ip,
    );
    res.status(201).json({ success: true, data });
  }),
);

adminRouter.patch(
  "/event-challenges/:id(\\d+)",
  requirePermission("events.manage"),
  validateBody(updateEventChallengeSchema),
  asyncHandler(async (req, res) => {
    const data = await updateEventChallenge(
      Number(req.params.id),
      req.body,
      me(req).id,
      req.ip,
    );
    res.json({ success: true, data });
  }),
);

adminRouter.delete(
  "/event-challenges/:id(\\d+)",
  requirePermission("events.manage"),
  asyncHandler(async (req, res) => {
    await removeEventChallenge(Number(req.params.id), me(req).id, req.ip);
    res.json({ success: true, data: { deleted: true } });
  }),
);

// --- Announcements --------------------------------------------------------

adminRouter.get(
  "/announcements/overview",
  requirePermission("announcements.manage"),
  asyncHandler(async (_req, res) => {
    const data = await getAnnouncementOverview();
    res.json({ success: true, data });
  }),
);

adminRouter.get(
  "/announcements",
  requirePermission("announcements.manage"),
  asyncHandler(async (req, res) => {
    const query = adminAnnouncementQuerySchema.parse(req.query);
    const data = await listAdminAnnouncements(query);
    res.json({ success: true, data });
  }),
);

adminRouter.post(
  "/announcements",
  requirePermission("announcements.manage"),
  validateBody(createAnnouncementSchema),
  asyncHandler(async (req, res) => {
    const data = await createAnnouncement(req.body, me(req).id, req.ip);
    res.status(201).json({ success: true, data });
  }),
);

adminRouter.patch(
  "/announcements/:id(\\d+)",
  requirePermission("announcements.manage"),
  validateBody(updateAnnouncementSchema),
  asyncHandler(async (req, res) => {
    const data = await updateAnnouncement(
      Number(req.params.id),
      req.body,
      me(req).id,
      req.ip,
    );
    res.json({ success: true, data });
  }),
);

adminRouter.delete(
  "/announcements/:id(\\d+)",
  requirePermission("announcements.manage"),
  asyncHandler(async (req, res) => {
    await deleteAnnouncement(Number(req.params.id), me(req).id, req.ip);
    res.json({ success: true, data: { deleted: true } });
  }),
);

// --- Users (RBAC-aware) ---------------------------------------------------

adminRouter.get(
  "/users",
  requirePermission("users.manage"),
  asyncHandler(async (req, res) => {
    const { page, limit, search } = adminListQuerySchema.parse(req.query);
    const data = await listUsers({ page, limit, search });
    res.json({ success: true, data });
  }),
);

adminRouter.post(
  "/users",
  requirePermission("users.manage"),
  validateBody(createUserSchema),
  asyncHandler(async (req, res) => {
    const actor = me(req);
    const data = await createAdminUser(actor, req.body);
    await recordAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: "user.create",
      entityType: "user",
      entityId: String(data.id),
      details: { username: data.username, role: data.role },
      ipAddress: req.ip,
    });
    res.json({ success: true, data });
  }),
);

adminRouter.patch(
  "/users/:id(\\d+)",
  requirePermission("users.manage"),
  validateBody(updateUserSchema),
  asyncHandler(async (req, res) => {
    const actor = me(req);
    const data = await updateUser(actor, Number(req.params.id), req.body);
    await recordAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: "user.update",
      entityType: "user",
      entityId: String(req.params.id),
      details: {
        changed: Object.keys(req.body),
      },
      ipAddress: req.ip,
    });
    res.json({ success: true, data });
  }),
);

// --- Teams (moderation) ---------------------------------------------------

adminRouter.get(
  "/teams",
  requirePermission("teams.moderate"),
  asyncHandler(async (req, res) => {
    const { page, limit, search } = adminListQuerySchema.parse(req.query);
    const data = await listAdminTeams({ page, limit, search });
    res.json({ success: true, data });
  }),
);

adminRouter.post(
  "/teams",
  requirePermission("teams.moderate"),
  validateBody(createTeamSchema),
  asyncHandler(async (req, res) => {
    const actor = me(req);
    const data = await createAdminTeam(actor, req.body);
    await recordAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: "team.create",
      entityType: "team",
      entityId: String(data.id),
      details: { name: data.name, slug: data.slug },
      ipAddress: req.ip,
    });
    res.json({ success: true, data });
  }),
);

adminRouter.get(
  "/teams/:id(\\d+)/detail",
  requirePermission("teams.moderate"),
  asyncHandler(async (req, res) => {
    const data = await getAdminTeamDetail(Number(req.params.id));
    res.json({ success: true, data });
  }),
);

adminRouter.patch(
  "/teams/:id(\\d+)",
  requirePermission("teams.moderate"),
  validateBody(updateAdminTeamSchema),
  asyncHandler(async (req, res) => {
    const actor = me(req);
    const data = await updateAdminTeam(Number(req.params.id), req.body);
    await recordAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: "team.update",
      entityType: "team",
      entityId: String(data.id),
      details: { changed: Object.keys(req.body) },
      ipAddress: req.ip,
    });
    res.json({ success: true, data });
  }),
);

adminRouter.delete(
  "/teams/:id(\\d+)",
  requirePermission("teams.moderate"),
  asyncHandler(async (req, res) => {
    const actor = me(req);
    await deleteAdminTeam(Number(req.params.id));
    await recordAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: "team.delete",
      entityType: "team",
      entityId: String(req.params.id),
      ipAddress: req.ip,
    });
    res.json({ success: true, data: { deleted: true } });
  }),
);

// --- Submissions ----------------------------------------------------------

adminRouter.get(
  "/submissions/overview",
  requirePermission("analytics.view"),
  asyncHandler(async (_req, res) => {
    const data = await getSubmissionOverview();
    res.json({ success: true, data });
  }),
);

adminRouter.get(
  "/submissions",
  requirePermission("analytics.view"),
  asyncHandler(async (req, res) => {
    const query = adminSubmissionQuerySchema.parse(req.query);
    const data = await listAdminSubmissions(query);
    res.json({ success: true, data });
  }),
);

// --- Analytics ------------------------------------------------------------

adminRouter.get(
  "/analytics/overview",
  requirePermission("analytics.view"),
  asyncHandler(async (req, res) => {
    const data = await getAnalyticsOverview();
    res.json({ success: true, data });
  }),
);

// --- System status ---------------------------------------------------------

adminRouter.get(
  "/system/status",
  requirePermission("analytics.view"),
  asyncHandler(async (req, res) => {
    const data = await getSystemStatus();
    res.json({ success: true, data });
  }),
);

// --- Platform settings ------------------------------------------------------

adminRouter.get(
  "/settings",
  requirePermission("settings.view"),
  asyncHandler(async (_req, res) => {
    const data = await getSettingsOverview();
    res.json({ success: true, data });
  }),
);

adminRouter.patch(
  "/settings",
  requirePermission("settings.manage"),
  validateBody(updatePlatformSettingsSchema),
  asyncHandler(async (req, res) => {
    const actor = me(req);
    const data = await updatePlatformSettings(actor, req.body);
    await recordAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: "settings.update",
      entityType: "setting",
      details: { changed: Object.keys(req.body) },
      ipAddress: req.ip,
    });
    res.json({ success: true, data });
  }),
);

// --- Sandbox --------------------------------------------------------------

adminRouter.get(
  "/sandbox/overview",
  requirePermission("analytics.view"),
  asyncHandler(async (_req, res) => {
    const data = await getSandboxSnapshot();
    res.json({ success: true, data });
  }),
);

adminRouter.post(
  "/sandbox/containers/:containerId/stop",
  requirePermission("analytics.view"),
  asyncHandler(async (req, res) => {
    await stopSandboxContainer(req.params.containerId!, getSandboxRuntime());
    res.json({ success: true, data: { stopped: true } });
  }),
);

// --- Audit log ------------------------------------------------------------

adminRouter.get(
  "/audit-log",
  requirePermission("audit.view"),
  asyncHandler(async (req, res) => {
    const query = auditLogQuerySchema.parse(req.query);
    const data = await listAuditLog(query);
    res.json({ success: true, data });
  }),
);

// --- Notifications (broadcast) -------------------------------------------

adminRouter.post(
  "/notifications/broadcast",
  requirePermission("notifications.broadcast"),
  validateBody(broadcastNotificationSchema),
  asyncHandler(async (req, res) => {
    const actor = me(req);
    const count = await createBroadcastNotification(req.body);
    await recordAudit({
      actorId: actor.id,
      actorUsername: actor.username,
      action: "notification.broadcast",
      entityType: "notification",
      details: {
        type: req.body.type,
        title: req.body.title,
        recipients: count,
      },
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, data: { recipients: count } });
  }),
);