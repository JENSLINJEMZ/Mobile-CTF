/**
 * Design tokens — single source of truth for the mobile app.
 *
 * Light and dark palettes expose the same semantic keys so screens never
 * hardcode hex values. Keep the blue/neutral direction: blue is the single
 * accent, neutrals carry hierarchy, semantic colors only signal state.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Palette = {
  blue: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
  },
  success: {
    100: "#dcfce7",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
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
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
  },
} as const;

export const Colors = {
  light: {
    text: "#111827",
    textSecondary: "#4b5563",
    textInverse: "#ffffff",
    background: "#f5f7fc",
    backgroundElement: "#F0F0F3",
    backgroundSelected: "#E0E1E6",
    surface: "#f3f4f6",
    border: "rgba(17, 24, 39, 0.12)",
    borderStrong: "rgba(17, 24, 39, 0.24)",
    backdropTop: "#dfe9fa",
    backdropBottom: "#f7f9fd",
    glow: "rgba(59, 130, 246, 0.18)",
    glass: "rgba(255, 255, 255, 0.55)",
    glassSubtle: "rgba(255, 255, 255, 0.35)",
    glassStrong: "rgba(255, 255, 255, 0.78)",
    glassBorder: "rgba(51, 65, 92, 0.20)",
    specular: "rgba(255, 255, 255, 0.95)",
    scrim: "rgba(23, 32, 52, 0.35)",
    accent: "#2563eb",
    accentPressed: "#1d4ed8",
    accentSubtle: "#eff6ff",
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
    difficultyMedium: "#d97706",
    difficultyHard: "#dc2626",
    difficultyExpert: "#7c3aed",
    placeholder: "#9ca3af",
  },
  dark: {
    text: "#e5e7eb",
    textSecondary: "#9ca3af",
    textInverse: "#ffffff",
    background: "#0b0d12",
    backgroundElement: "#16181d",
    backgroundSelected: "#23262c",
    surface: "#1f2937",
    border: "rgba(229, 231, 235, 0.12)",
    borderStrong: "rgba(229, 231, 235, 0.24)",
    backdropTop: "#0c1526",
    backdropBottom: "#070a11",
    glow: "rgba(64, 128, 255, 0.16)",
    glass: "rgba(255, 255, 255, 0.06)",
    glassSubtle: "rgba(255, 255, 255, 0.035)",
    glassStrong: "rgba(255, 255, 255, 0.11)",
    glassBorder: "rgba(255, 255, 255, 0.16)",
    specular: "rgba(255, 255, 255, 0.30)",
    scrim: "rgba(2, 8, 18, 0.55)",
    accent: "#3b82f6",
    accentPressed: "#60a5fa",
    accentSubtle: "#1e40af",
    onAccent: "#ffffff",
    success: "#22c55e",
    successStrong: "#4ade80",
    successSubtle: "#14532d",
    warning: "#f59e0b",
    warningStrong: "#fbbf24",
    warningSubtle: "#92400e",
    danger: "#f87171",
    dangerStrong: "#fca5a5",
    dangerSubtle: "#7f1d1d",
    difficultyEasy: "#22c55e",
    difficultyMedium: "#fbbf24",
    difficultyHard: "#f87171",
    difficultyExpert: "#a78bfa",
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
