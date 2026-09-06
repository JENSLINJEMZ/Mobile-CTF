import type { CSSProperties, ReactNode } from "react";

import { colors, typography } from "../tokens";

type Tone = "default" | "secondary" | "muted" | "danger" | "success";

export interface TextProps {
  children: ReactNode;
  tone?: Tone;
  size?: "xs" | "sm" | "md" | "lg";
  weight?: "regular" | "medium" | "semibold" | "bold";
  style?: CSSProperties;
}

const toneStyles: Record<Tone, CSSProperties> = {
  default: { color: colors.text },
  secondary: { color: colors.textSecondary },
  muted: { color: colors.textMuted },
  danger: { color: colors.danger },
  success: { color: colors.success },
};

export function Text({
  children,
  tone = "default",
  size = "md",
  weight = "regular",
  style,
}: TextProps) {
  return (
    <span
      style={{
        ...toneStyles[tone],
        fontSize: typography.fontSize[size],
        fontWeight: typography.fontWeight[weight],
        lineHeight: typography.lineHeight.md,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
