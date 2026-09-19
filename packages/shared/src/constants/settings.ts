// Canonical platform settings. The stored rows in the DB are key/value pairs
// under the keys below; the admin Settings page reads and writes them through
// the PlatformSettingsDto façade (flat field names).
export const SETTING_KEYS = [
  "platform.name",
  "platform.tagline",
  "platform.description",
  "platform.websiteUrl",
  "platform.supportEmail",
  "system.timezone",
  "system.language",
  "system.dateFormat",
  "system.timeFormat",
  "system.registrationEnabled",
  "system.requireEmailVerification",
  "system.allowGuestAccess",
  "system.maintenanceMode",
] as const;

export type PlatformSettingKey = (typeof SETTING_KEYS)[number];

export type PlatformSettingValue = string | boolean;

export interface PlatformSettingsValues {
  "platform.name": string;
  "platform.tagline": string;
  "platform.description": string;
  "platform.websiteUrl": string;
  "platform.supportEmail": string;
  "system.timezone": string;
  "system.language": string;
  "system.dateFormat": string;
  "system.timeFormat": string;
  "system.registrationEnabled": boolean;
  "system.requireEmailVerification": boolean;
  "system.allowGuestAccess": boolean;
  "system.maintenanceMode": boolean;
}

// Defaults reflect the platform as it actually ships today: the brand string
// used across the app, the page format the console renders, registration open
// (public /register route), and everything email/guest/maintenance related
// OFF because no such flow is configured.
export const DEFAULT_SETTINGS: PlatformSettingsValues = {
  "platform.name": "Mobile CTF",
  "platform.tagline": "Hack • Learn • Compete • Grow",
  "platform.description":
    "A mobile-first CTF platform for the next generation of cybersecurity learners.",
  "platform.websiteUrl": "",
  "platform.supportEmail": "",
  "system.timezone": "Asia/Calcutta (IST)",
  "system.language": "English",
  "system.dateFormat": "September 17, 2026",
  "system.timeFormat": "12 Hour (AM/PM)",
  "system.registrationEnabled": true,
  "system.requireEmailVerification": false,
  "system.allowGuestAccess": false,
  "system.maintenanceMode": false,
};