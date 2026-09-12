/**
 * Design tokens — single source of truth for the mobile app.
 *
 * Dark violet/navy identity: deep navy canvas (#0c111d), muted card
 * surfaces (#0e1420), near-black input fields (#030713), lavender
 * primary CTAs (#ecebfa), violet secondary accents (#806dc4),
 * and a clean text hierarchy from white to dim gray. No translucency,
 * no glows — every token is opaque and semantic.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Palette = {
  lavender: {
    100: "#f5f4ff",
    200: "#ecebfa",
    300: "#d7d5f7",
    400: "#c4c0f0",
    500: "#b0abe8",
  },
  violet: {
    300: "#b6a4f0",
    400: "#9783e0",
    500: "#806dc4",
    600: "#7d6dc9",
    700: "#5b4da6",
    800: "#331d6a",
    900: "#1e1a30",
  },
  navy: {
    50: "#0c111d",
    100: "#0d1320",
    200: "#0e1420",
    300: "#141a28",
    400: "#1a1f2e",
    500: "#212838",
    600: "#2a3244",
    700: "#353e52",
  },
  blue: {
    300: "#b6c7dc",
    400: "#a7b7d6",
    500: "#7c8da8",
    600: "#213668",
    700: "#0a2443",
  },
  red: {
    400: "#e05670",
    500: "#c9344f",
    600: "#a82840",
    700: "#871e33",
    900: "#3f0d18",
  },
  green: {
    300: "#7dde6a",
    400: "#54ae33",
    500: "#376c21",
    600: "#2a5518",
  },
  amber: {
    300: "#fcd34d",
    400: "#fbbf24",
    600: "#d97706",
    800: "#92400e",
  },
  neutral: {
    50: "#f3f4f5",
    100: "#e5e7eb",
    200: "#c8cfd0",
    300: "#929ba6",
    400: "#797c87",
    500: "#555257",
    600: "#3d3a40",
    700: "#2a2830",
    800: "#1a1820",
    900: "#0d0b12",
  },
} as const;

type ScopedTokens = {
  header: {
    bg: string;
    title: string;
    subtitle: string;
    border: string;
  };
  tabBar: {
    bg: string;
    iconActive: string;
    iconInactive: string;
    label: string;
    border: string;
  };
  list: {
    cellBg: string;
    separator: string;
    groupHeader: string;
    groupFooter: string;
  };
  badge: {
    bg: string;
    fg: string;
  };
  input: {
    bg: string;
    value: string;
    placeholder: string;
    focusBorder: string;
  };
  card: {
    bg: string;
    border: string;
    title: string;
    meta: string;
  };
  segmented: {
    track: string;
    thumb: string;
    activeText: string;
    idleText: string;
  };
  toast: {
    bg: string;
    title: string;
    body: string;
    success: string;
    error: string;
    border: string;
  };
  skeleton: {
    base: string;
    highlight: string;
  };
};

const LIGHT_SCOPED: ScopedTokens = {
  header: {
    bg: "#ffffff",
    title: "#0c111d",
    subtitle: "#797c87",
    border: "rgba(12, 17, 29, 0.08)",
  },
  tabBar: {
    bg: "#ffffff",
    iconActive: "#7d6dc9",
    iconInactive: "#797c87",
    label: "#797c87",
    border: "rgba(12, 17, 29, 0.08)",
  },
  list: {
    cellBg: "#ffffff",
    separator: "rgba(12, 17, 29, 0.08)",
    groupHeader: "#797c87",
    groupFooter: "#929ba6",
  },
  badge: {
    bg: "#c9344f",
    fg: "#ffffff",
  },
  input: {
    bg: "#f0f1f5",
    value: "#0c111d",
    placeholder: "#929ba6",
    focusBorder: "#7d6dc9",
  },
  card: {
    bg: "#ffffff",
    border: "rgba(12, 17, 29, 0.10)",
    title: "#0c111d",
    meta: "#797c87",
  },
  segmented: {
    track: "#f0f1f5",
    thumb: "#ffffff",
    activeText: "#0c111d",
    idleText: "#797c87",
  },
  toast: {
    bg: "#ffffff",
    title: "#0c111d",
    body: "#797c87",
    success: "#376c21",
    error: "#c9344f",
    border: "rgba(12, 17, 29, 0.10)",
  },
  skeleton: {
    base: "#f0f1f5",
    highlight: "#e5e7eb",
  },
};

const DARK_SCOPED: ScopedTokens = {
  header: {
    bg: "#07070f",
    title: "#f2f0fb",
    subtitle: "#7a7699",
    border: "rgba(255, 255, 255, 0.07)",
  },
  tabBar: {
    bg: "#0b0a16",
    iconActive: "#a78bfa",
    iconInactive: "#7a7699",
    label: "#7a7699",
    border: "rgba(255, 255, 255, 0.07)",
  },
  list: {
    cellBg: "#12101f",
    separator: "rgba(255, 255, 255, 0.07)",
    groupHeader: "#7a7699",
    groupFooter: "#555257",
  },
  badge: {
    bg: "#f43f5e",
    fg: "#ffffff",
  },
  input: {
    bg: "#12101f",
    value: "#f2f0fb",
    placeholder: "#7a7699",
    focusBorder: "#a78bfa",
  },
  card: {
    bg: "#12101f",
    border: "rgba(255, 255, 255, 0.10)",
    title: "#f2f0fb",
    meta: "#7a7699",
  },
  segmented: {
    track: "#0b0a16",
    thumb: "#181530",
    activeText: "#f2f0fb",
    idleText: "#7a7699",
  },
  toast: {
    bg: "#12101f",
    title: "#f2f0fb",
    body: "#b0abc9",
    success: "#4ade80",
    error: "#f43f5e",
    border: "rgba(255, 255, 255, 0.10)",
  },
  skeleton: {
    base: "#0b0a16",
    highlight: "#12101f",
  },
};

export const Colors = {
  light: {
    text: "#0c111d",
    textSecondary: "#555566",
    textInverse: "#ffffff",
    background: "#f0f1f5",
    backgroundElement: "#e5e7eb",
    backgroundSelected: "#d5d7dc",
    surface: "#ffffff",
    separator: "rgba(12, 17, 29, 0.08)",
    border: "rgba(12, 17, 29, 0.10)",
    borderStrong: "rgba(12, 17, 29, 0.18)",
    scrim: "rgba(12, 17, 29, 0.5)",
    accent: "#7d6dc9",
    accentPressed: "#5b4da6",
    accentSubtle: "#f0eefc",
    onAccent: "#ffffff",
    onDanger: "#ffffff",
    success: "#376c21",
    successStrong: "#2a5518",
    successSubtle: "#e8f5e2",
    warning: "#d97706",
    warningStrong: "#b45309",
    warningSubtle: "#fef3c7",
    danger: "#c9344f",
    dangerStrong: "#a82840",
    dangerSubtle: "#fde8ec",
    difficultyEasy: "#376c21",
    difficultyMedium: "#213668",
    difficultyHard: "#7d6dc9",
    difficultyExpert: "#c9344f",
    placeholder: "#929ba6",
    medalGold: "#d4af37",
    medalSilver: "#b5b5bd",
    medalBronze: "#cd7f32",
    ...LIGHT_SCOPED,
  },
  dark: {
    text: "#f2f0fb",
    textSecondary: "#b0abc9",
    textInverse: "#07070f",
    background: "#07070f",
    backgroundElement: "#0b0a16",
    backgroundSelected: "#12101f",
    surface: "#12101f",
    separator: "rgba(255, 255, 255, 0.07)",
    border: "rgba(255, 255, 255, 0.07)",
    borderStrong: "rgba(255, 255, 255, 0.13)",
    scrim: "rgba(4, 3, 9, 0.72)",
    accent: "#a78bfa",
    accentPressed: "#8b5cf6",
    accentSubtle: "#181530",
    onAccent: "#ffffff",
    onDanger: "#ffffff",
    success: "#34d399",
    successStrong: "#4ade80",
    successSubtle: "#0a2a14",
    warning: "#fbbf24",
    warningStrong: "#fcd34d",
    warningSubtle: "#3b2c08",
    danger: "#f43f5e",
    dangerStrong: "#fb7185",
    dangerSubtle: "#3f0d18",
    difficultyEasy: "#4ade80",
    difficultyMedium: "#fbbf24",
    difficultyHard: "#f472b6",
    difficultyExpert: "#ec4899",
    placeholder: "#7a7699",
    medalGold: "#f6d365",
    medalSilver: "#b9c0cc",
    medalBronze: "#e0a36a",
    ...DARK_SCOPED,
  },
} as const;

type FlatColorKey<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

export type ThemeColor =
  | FlatColorKey<(typeof Colors)["light"]>
  | FlatColorKey<(typeof Colors)["dark"]>;

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
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
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

export const TouchTarget = {
  iOS: 44,
  Android: 48,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
