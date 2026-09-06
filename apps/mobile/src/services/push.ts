import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { useNotificationStore } from "@/store/notification-store";

import { api } from "./http";

const PREF_KEY = "push-pref";

export interface PushPref {
  enabled: boolean;
  token: string | null;
}

const EMPTY: PushPref = { enabled: false, token: null };

function projectId(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (fromEnv) return fromEnv;
  const easProjectId = Constants.expoConfig?.extra?.eas?.projectId;
  return typeof easProjectId === "string" ? easProjectId : null;
}

export function isPushSupported(): boolean {
  return Platform.OS !== "web" && projectId() !== null;
}

if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

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
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }
    let { status, ios } = await Notifications.getPermissionsAsync();
    const granted =
      status === "granted" ||
      ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
      ios = requested.ios;
    }
    if (
      status !== "granted" &&
      ios?.status !== Notifications.IosAuthorizationStatus.PROVISIONAL
    ) {
      return null;
    }
    const token = await Notifications.getExpoPushTokenAsync({
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
  if (Platform.OS === "web") return () => undefined;
  const received = Notifications.addNotificationReceivedListener(() => {
    void useNotificationStore.getState().refreshBadge();
  });
  const tokenChanged = Notifications.addPushTokenListener(async (event) => {
    const data = event.data;
    if (typeof data === "string" && data.length > 0) {
      await registerTokenWithBackend(data);
      await savePushPref({ enabled: true, token: data });
    }
  });
  return () => {
    received.remove();
    tokenChanged.remove();
  };
}