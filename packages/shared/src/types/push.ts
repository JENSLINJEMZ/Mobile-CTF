export const PUSH_PLATFORMS = ["android", "ios", "web"] as const;

export type PushPlatform = (typeof PUSH_PLATFORMS)[number];

export interface PushTokenDto {
  token: string;
  platform: PushPlatform;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PushTokensResponse {
  items: PushTokenDto[];
}

export interface PushTokenUnregisterResponse {
  unregistered: boolean;
}