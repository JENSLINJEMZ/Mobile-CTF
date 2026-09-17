// Framework-agnostic design tokens (plain objects — safe for web AND React Native).

export const colors = {
  primary: "#2563eb",
  primaryDark: "#1d4ed8",
  onPrimary: "#ffffff",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  background: "#f8fafc",
  surface: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  overlay: "rgba(15, 23, 42, 0.5)",
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
  },
  fontWeight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    sm: 18,
    md: 22,
    lg: 26,
    xl: 30,
  },
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const shadows = {
  sm: "0 1px 2px rgba(15, 23, 42, 0.06)",
  md: "0 4px 12px rgba(15, 23, 42, 0.08)",
} as const;

export const zIndex = {
  base: 0,
  sticky: 10,
  overlay: 100,
  modal: 200,
  toast: 300,
} as const;

export const darkColors = {
  bg: "#06090f",
  surface: "#0d131f",
  surface2: "#131b2c",
  border: "rgba(124,138,165,0.18)",
  borderStrong: "rgba(0,229,255,0.5)",
  text: "#e6edf7",
  textSecondary: "#c7d2e8",
  textMuted: "#7c8aa5",
  accent: "#00e5ff",
  accent2: "#b14dff",
  onAccent: "#041017",
  success: "#22e6a0",
  warning: "#ffb020",
  danger: "#ff3b5c",
} as const;

export const hud = {
  radius: { sm: 8, md: 12, lg: 16 },
  fonts: {
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  },
} as const;

export const tokens = {
  colors,
  spacing,
  typography,
  radius,
  shadows,
  zIndex,
  darkColors,
  hud,
} as const;

export default tokens;
