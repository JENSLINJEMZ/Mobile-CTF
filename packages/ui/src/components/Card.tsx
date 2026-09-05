import type { CSSProperties, ReactNode } from 'react';

import { colors, radius, shadows, spacing } from '../tokens';

export interface CardProps {
  children: ReactNode;
  title?: string;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
}

export function Card({ children, title, style, bodyStyle }: CardProps) {
  return (
    <section
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        border: `1px solid ${colors.border}`,
        boxShadow: shadows.sm,
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
            color: colors.text,
          }}
        >
          {title}
        </h3>
      ) : null}
      <div style={bodyStyle}>{children}</div>
    </section>
  );
}