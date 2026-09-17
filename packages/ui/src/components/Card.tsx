import type { CSSProperties, ReactNode } from "react";

import { spacing } from "../tokens";

export interface CardProps {
  children: ReactNode;
  title?: string;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
  className?: string;
}

export function Card({ children, title, style, bodyStyle, className }: CardProps) {
  return (
    <section
      className={className}
      style={{
        backgroundColor: "var(--ui-surface, #ffffff)",
        backgroundImage: "var(--ui-gradient-surface, none)",
        borderRadius: "var(--ui-radius-md, 12px)",
        border: "1px solid var(--ui-border, #e2e8f0)",
        boxShadow: "var(--ui-shadow, 0 1px 2px rgba(15, 23, 42, 0.06))",
        padding: spacing.lg,
        ...style,
      }}
    >
      {title ? (
        <h3
          style={{
            margin: 0,
            marginBottom: spacing.md,
            fontSize: 16,
            fontWeight: 600,
            color: "var(--ui-text, #0f172a)",
            fontFamily: "var(--ui-font-sans, inherit)",
            letterSpacing: "var(--ui-card-title-ls, 0)",
          }}
        >
          {title}
        </h3>
      ) : null}
      <div style={bodyStyle}>{children}</div>
    </section>
  );
}
