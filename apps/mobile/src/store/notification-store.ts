import { create } from "zustand";

import { getUnreadNotificationCount } from "@/services/notifications";

interface NotificationState {
  unreadCount: number;
  refreshBadge: () => Promise<void>;
  setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,

  refreshBadge: async () => {
    try {
      const count = await getUnreadNotificationCount();
      set({ unreadCount: count });
    } catch {
      // Keep the last known count; badge is best-effort.
    }
  },

  setUnreadCount: (count) => set({ unreadCount: count }),
}));