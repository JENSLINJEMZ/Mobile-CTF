import type { CSSProperties, ReactNode } from "react";

import { spacing, typography } from "../tokens";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

export interface ButtonProps {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
  style?: CSSProperties;
}

const variantStyles: Record<Variant, CSSProperties> = {
  primary: {
    backgroundColor: "var(--ui-accent, #2563eb)",
    backgroundImage: "var(--ui-gradient-accent, none)",
    color: "var(--ui-on-accent, #ffffff)",
    border: "1px solid transparent",
    boxShadow: "var(--ui-btn-glow, none)",
  },
  secondary: {
    backgroundColor: "var(--ui-surface-2, #ffffff)",
    color: "var(--ui-text, #0f172a)",
    border: "1px solid var(--ui-border, #e2e8f0)",
  },
  danger: {
    backgroundColor: "var(--ui-danger, #dc2626)",
    color: "var(--ui-on-danger, #ffffff)",
    border: "1px solid transparent",
  },
  ghost: {
    backgroundColor: "transparent",
    color: "var(--ui-accent, #2563eb)",
    border: "1px solid transparent",
  },
};

const sizeStyles: Record<Size, CSSProperties> = {
  sm: {
    padding: `${spacing.xs}px ${spacing.md}px`,
    fontSize: typography.fontSize.sm,
  },
  md: {
    padding: `${spacing.sm}px ${spacing.lg}px`,
    fontSize: typography.fontSize.md,
  },
  lg: {
    padding: `${spacing.md}px ${spacing.xl}px`,
    fontSize: typography.fontSize.lg,
  },
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  type = "button",
  onClick,
  style,
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{
        ...variantStyles[variant],
        ...sizeStyles[size],
        borderRadius: "var(--ui-radius-sm, 12px)",
        fontWeight: typography.fontWeight.semibold,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        outline: "none",
        margin: 0,
        ...style,
      }}
    >
      {children}
    </button>
  );
}
