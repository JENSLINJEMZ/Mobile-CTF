import type { CSSProperties, ReactNode } from "react";

import { colors, radius, spacing, typography } from "../tokens";

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
    backgroundColor: colors.primary,
    color: colors.onPrimary,
    border: `1px solid ${colors.primary}`,
  },
  secondary: {
    backgroundColor: colors.surface,
    color: colors.text,
    border: `1px solid ${colors.border}`,
  },
  danger: {
    backgroundColor: colors.danger,
    color: colors.onPrimary,
    border: `1px solid ${colors.danger}`,
  },
  ghost: {
    backgroundColor: "transparent",
    color: colors.primary,
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
        borderRadius: radius.md,
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
