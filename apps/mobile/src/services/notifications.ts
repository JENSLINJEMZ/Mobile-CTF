import type { NotificationDto, NotificationsResponse } from "@ctf/shared";

import { api } from "./http";

export interface NotificationsQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export async function getNotifications(
  query: NotificationsQuery = {},
): Promise<NotificationsResponse> {
  const params = new URLSearchParams();
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.limit !== undefined) params.set("limit", String(query.limit));
  if (query.unreadOnly) params.set("unreadOnly", "true");
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return api.get<NotificationsResponse>(`/notifications${suffix}`, {
    auth: true,
  });
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await api.get<{ count: number }>("/notifications/unread-count", {
    auth: true,
  });
  return res.count;
}

export async function markNotificationRead(id: number): Promise<NotificationDto> {
  return api.post<NotificationDto>(`/notifications/${id}/read`, undefined, {
    auth: true,
  });
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await api.post<{ count: number }>(
    "/notifications/read-all",
    undefined,
    { auth: true },
  );
  return res.count;
}