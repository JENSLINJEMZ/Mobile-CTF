import type { CSSProperties, ReactNode } from "react";

import { radius, spacing, typography } from "../tokens";

type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  style?: CSSProperties;
}

const toneStyles: Record<Tone, CSSProperties> = {
  neutral: {
    backgroundColor: "var(--ui-surface-2, #e2e8f0)",
    color: "var(--ui-text-secondary, #475569)",
  },
  success: {
    backgroundColor: "var(--ui-success-soft, #dcfce7)",
    color: "var(--ui-success, #16a34a)",
  },
  warning: {
    backgroundColor: "var(--ui-warning-soft, #fef3c7)",
    color: "var(--ui-warning, #d97706)",
  },
  danger: {
    backgroundColor: "var(--ui-danger-soft, #fee2e2)",
    color: "var(--ui-danger, #dc2626)",
  },
  info: {
    backgroundColor: "var(--ui-info-soft, #dbeafe)",
    color: "var(--ui-accent-2, #1d4ed8)",
  },
};

export function Badge({ children, tone = "neutral", style }: BadgeProps) {
  return (
    <span
      style={{
        ...toneStyles[tone],
        display: "inline-block",
        borderRadius: radius.pill,
        padding: `${spacing.xs}px ${spacing.sm}px`,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.semibold,
        fontFamily: "var(--ui-font-sans, inherit)",
        border: "1px solid var(--ui-badge-border, transparent)",
        verticalAlign: "middle",
        margin: 0,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
