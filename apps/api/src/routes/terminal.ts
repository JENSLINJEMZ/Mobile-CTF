import type {
  CreateTerminalSessionResponse,
  ListTerminalSessionsResponse,
  ReassembleTerminalSessionResponse,
} from "@ctf/shared";
import { terminalSessionIdSchema } from "@ctf/shared";
import { Router } from "express";

import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/errors";
import {
  closeTerminalSession,
  createTerminalSession,
  getTerminalSession,
  listTerminalSessions,
  reassembleTerminalSession,
} from "../services/terminalSessions";

export const terminalRouter = Router();

terminalRouter.use(authenticate);

terminalRouter.post(
  "/sessions",
  asyncHandler(async (req, res) => {
    const session = await createTerminalSession(req.user!.id);
    const body: CreateTerminalSessionResponse = { session };
    res.status(201).json({ success: true, data: body });
  }),
);

terminalRouter.get(
  "/sessions",
  asyncHandler(async (req, res) => {
    const sessions = await listTerminalSessions(req.user!.id);
    const body: ListTerminalSessionsResponse = { sessions };
    res.json({ success: true, data: body });
  }),
);

terminalRouter.get(
  "/sessions/:id",
  asyncHandler(async (req, res) => {
    const id = terminalSessionIdSchema.parse(req.params.id);
    const session = await getTerminalSession(req.user!.id, id);
    res.json({ success: true, data: { session } });
  }),
);

terminalRouter.post(
  "/sessions/:id/reassemble",
  asyncHandler(async (req, res) => {
    const id = terminalSessionIdSchema.parse(req.params.id);
    const session = await reassembleTerminalSession(req.user!.id, id);
    const body: ReassembleTerminalSessionResponse = { session };
    res.json({ success: true, data: body });
  }),
);

terminalRouter.delete(
  "/sessions/:id",
  asyncHandler(async (req, res) => {
    const id = terminalSessionIdSchema.parse(req.params.id);
    const session = await closeTerminalSession(req.user!.id, id);
    res.json({ success: true, data: { session } });
  }),
);
