/**
 * Design tokens — single source of truth for the mobile app.
 *
 * Solid, real-app identity (Telegram/WhatsApp-like): opaque flat surfaces,
 * a distinct header bar per screen, hairline separators between rows, and
 * the HackTheBox apple-green accent kept as the primary action color.
 * No translucency, no glows, no specular rims — every token is an opaque
 * color that signals meaning, not material. Screens never hardcode hex.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Palette = {
  green: {
    100: "#eaffd1",
    300: "#c6f76a",
    400: "#b3f515",
    500: "#9FEF00",
    600: "#7cbd00",
    700: "#5f9000",
    800: "#3f6100",
  },
  violet: {
    400: "#b7a1fa",
    500: "#a78bfa",
    600: "#8b74e2",
    700: "#6d5bd1",
    900: "#2a2440",
  },
  cyan: {
    400: "#38bdf8",
    500: "#0ea5e9",
    700: "#0369a1",
  },
  red: {
    400: "#fb7185",
    500: "#f43f5e",
    700: "#be123c",
    900: "#3f0d18",
  },
  amber: {
    300: "#fcd34d",
    400: "#fbbf24",
    600: "#d97706",
    800: "#92400e",
  },
  success: {
    100: "#dcfce7",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#10331f",
  },
  warning: {
    100: "#fef3c7",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
  },
  danger: {
    100: "#fee2e2",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
  },
  neutral: {
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#39404d",
    800: "#232a35",
    850: "#1b2130",
    900: "#141721",
    950: "#0b0e15",
  },
} as const;

export const Colors = {
  light: {
    text: "#16181d",
    textSecondary: "#5a6474",
    textInverse: "#ffffff",
    background: "#f2f3f6",
    backgroundElement: "#e9ebf0",
    backgroundSelected: "#dfe3ea",
    surface: "#ffffff",
    header: "#ffffff",
    tabBar: "#ffffff",
    separator: "rgba(20, 25, 36, 0.08)",
    border: "rgba(20, 25, 36, 0.12)",
    borderStrong: "rgba(20, 25, 36, 0.22)",
    scrim: "rgba(11, 14, 21, 0.4)",
    accent: "#7cbd00",
    accentPressed: "#5f9000",
    accentSubtle: "#f2fae0",
    onAccent: "#ffffff",
    success: "#16a34a",
    successStrong: "#15803d",
    successSubtle: "#dcfce7",
    warning: "#d97706",
    warningStrong: "#b45309",
    warningSubtle: "#fef3c7",
    danger: "#dc2626",
    dangerStrong: "#b91c1c",
    dangerSubtle: "#fee2e2",
    difficultyEasy: "#16a34a",
    difficultyMedium: "#0ea5e9",
    difficultyHard: "#8b5cf6",
    difficultyExpert: "#f43f5e",
    placeholder: "#9ca3af",
  },
  dark: {
    text: "#e8eaf0",
    textSecondary: "#8b94a5",
    textInverse: "#ffffff",
    background: "#10141c",
    backgroundElement: "#1a2130",
    backgroundSelected: "#232c3e",
    surface: "#151c29",
    header: "#141924",
    tabBar: "#141924",
    separator: "rgba(220, 228, 240, 0.09)",
    border: "rgba(220, 228, 240, 0.12)",
    borderStrong: "rgba(220, 228, 240, 0.22)",
    scrim: "rgba(5, 8, 14, 0.6)",
    accent: "#9FEF00",
    accentPressed: "#c6f76a",
    accentSubtle: "#1d280a",
    onAccent: "#0b0e15",
    success: "#4ade80",
    successStrong: "#86efac",
    successSubtle: "#10331f",
    warning: "#fbbf24",
    warningStrong: "#fcd34d",
    warningSubtle: "#3b2c08",
    danger: "#f87171",
    dangerStrong: "#fca5a5",
    dangerSubtle: "#3f1418",
    difficultyEasy: "#a3e635",
    difficultyMedium: "#38bdf8",
    difficultyHard: "#a78bfa",
    difficultyExpert: "#fb7185",
    placeholder: "#6b7280",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "EXPERT";

export function difficultyColor(difficulty: string, theme: (typeof Colors)["light"] | (typeof Colors)["dark"]): string {
  switch ((difficulty ?? "").toUpperCase()) {
    case "EASY":
      return theme.difficultyEasy;
    case "MEDIUM":
      return theme.difficultyMedium;
    case "HARD":
      return theme.difficultyHard;
    default:
      return theme.difficultyExpert;
  }
}

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Typography = {
  caption: { fontSize: 12, lineHeight: 16 },
  small: { fontSize: 14, lineHeight: 20 },
  body: { fontSize: 16, lineHeight: 24 },
  title: { fontSize: 22, lineHeight: 28 },
  display: { fontSize: 28, lineHeight: 34 },
  /** Monospaced tabular numerals — for points, ranks, timers and scores. */
  metric: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.mono,
    fontVariant: ["tabular-nums"] as const,
    fontWeight: "700",
  },
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Unpressable hit target floors by platform. */
export const TouchTarget = {
  iOS: 44,
  Android: 48,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;