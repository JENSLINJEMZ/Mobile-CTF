import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { useNotificationStore } from "@/store/notification-store";

import { api } from "./http";

const PREF_KEY = "push-pref";

export interface PushPref {
  enabled: boolean;
  token: string | null;
}

const EMPTY: PushPref = { enabled: false, token: null };

type NotificationApi = typeof import("expo-notifications");

let notificationsApi: Promise<NotificationApi | null> | null = null;

function isExpoGo(): boolean {
  return (
    Constants.expoGoConfig !== null || Constants.appOwnership === "expo"
  );
}

// Loaded lazily: expo-notifications throws during module evaluation in
// Expo Go on Android, where remote push functionality was removed in SDK 53.
function getNotifications(): Promise<NotificationApi | null> {
  if (Platform.OS === "web" || isExpoGo()) return Promise.resolve(null);
  if (!notificationsApi) {
    notificationsApi = import("expo-notifications").then(
      (mod) => mod,
      () => null,
    );
  }
  return notificationsApi;
}

function projectId(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (fromEnv) return fromEnv;
  const easProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  return typeof easProjectId === "string" ? easProjectId : null;
}

export function isPushSupported(): boolean {
  return (
    Platform.OS !== "web" && !isExpoGo() && projectId() !== null
  );
}

function installNotificationHandler(): void {
  if (Platform.OS === "web" || isExpoGo()) return;
  void getNotifications().then((notif) => {
    notif?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  });
}

installNotificationHandler();

export async function loadPushPref(): Promise<PushPref> {
  try {
    const raw = await AsyncStorage.getItem(PREF_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<PushPref>;
    return {
      enabled: parsed.enabled === true,
      token: typeof parsed.token === "string" ? parsed.token : null,
    };
  } catch {
    return EMPTY;
  }
}

async function savePushPref(pref: PushPref): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY, JSON.stringify(pref)).catch(
    () => undefined,
  );
}

async function obtainExpoPushToken(): Promise<string | null> {
  if (!isPushSupported()) return null;
  const notif = await getNotifications();
  if (!notif) return null;
  try {
    if (Platform.OS === "android") {
      await notif.setNotificationChannelAsync("default", {
        name: "Default",
        importance: notif.AndroidImportance.MAX,
      });
    }
    let { status, ios } = await notif.getPermissionsAsync();
    const granted =
      status === "granted" ||
      ios?.status === notif.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) {
      const requested = await notif.requestPermissionsAsync();
      status = requested.status;
      ios = requested.ios;
    }
    if (
      status !== "granted" &&
      ios?.status !== notif.IosAuthorizationStatus.PROVISIONAL
    ) {
      return null;
    }
    const token = await notif.getExpoPushTokenAsync({
      projectId: projectId() ?? undefined,
    });
    return token.data || null;
  } catch {
    return null;
  }
}

async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    await api.post(
      "/notifications/push-token",
      { token, platform: Platform.OS as "android" | "ios" },
      { auth: true },
    );
  } catch {
    // Push registration is best-effort; retried on next app start.
  }
}

async function unregisterTokenWithBackend(token: string): Promise<void> {
  try {
    await api.del("/notifications/push-token", {
      auth: true,
      body: { token },
    });
  } catch {
    // Best-effort; stale tokens expire on the Expo side.
  }
}

export async function enableDevicePush(): Promise<boolean> {
  const token = await obtainExpoPushToken();
  if (!token) return false;
  await registerTokenWithBackend(token);
  await savePushPref({ enabled: true, token });
  return true;
}

export async function disableDevicePush(): Promise<void> {
  const pref = await loadPushPref();
  if (pref.token) {
    await unregisterTokenWithBackend(pref.token);
  }
  await savePushPref({ enabled: false, token: null });
}

export async function autoRegisterPushedToken(): Promise<void> {
  const pref = await loadPushPref();
  if (!pref.enabled) return;
  const token = await obtainExpoPushToken();
  if (token) {
    await registerTokenWithBackend(token);
    await savePushPref({ enabled: true, token });
  }
}

export function subscribeToPushEvents(): () => void {
  if (Platform.OS === "web" || isExpoGo()) return () => undefined;
  const cleanup: Array<() => void> = [];
  void getNotifications().then((notif) => {
    if (!notif) return;
    cleanup.push(
      notif
        .addNotificationReceivedListener(() => {
          void useNotificationStore.getState().refreshBadge();
        })
        .remove,
    );
    cleanup.push(
      notif.addPushTokenListener(async (event) => {
        const data = event.data;
        if (typeof data === "string" && data.length > 0) {
          await registerTokenWithBackend(data);
          await savePushPref({ enabled: true, token: data });
        }
      }).remove,
    );
  });
  return () => {
    for (const remove of cleanup) remove();
  };
}