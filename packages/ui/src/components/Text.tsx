import type { CSSProperties, ReactNode } from "react";

import { typography } from "../tokens";

type Tone = "default" | "secondary" | "muted" | "danger" | "success";

export interface TextProps {
  children: ReactNode;
  tone?: Tone;
  size?: "xs" | "sm" | "md" | "lg";
  weight?: "regular" | "medium" | "semibold" | "bold";
  style?: CSSProperties;
}

const toneStyles: Record<Tone, CSSProperties> = {
  default: { color: "var(--ui-text, #0f172a)" },
  secondary: { color: "var(--ui-text-secondary, #475569)" },
  muted: { color: "var(--ui-text-muted, #94a3b8)" },
  danger: { color: "var(--ui-danger, #dc2626)" },
  success: { color: "var(--ui-success, #16a34a)" },
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
        fontFamily: "var(--ui-font-sans, inherit)",
        margin: 0,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
