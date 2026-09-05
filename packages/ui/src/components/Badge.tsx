import type { CSSProperties, ReactNode } from 'react';

import { colors, radius, spacing, typography } from '../tokens';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  style?: CSSProperties;
}

const toneStyles: Record<Tone, CSSProperties> = {
  neutral: { backgroundColor: colors.border, color: colors.textSecondary },
  success: { backgroundColor: '#dcfce7', color: colors.success },
  warning: { backgroundColor: '#fef3c7', color: colors.warning },
  danger: { backgroundColor: '#fee2e2', color: colors.danger },
  info: { backgroundColor: '#dbeafe', color: colors.primaryDark },
};

export function Badge({ children, tone = 'neutral', style }: BadgeProps) {
  return (
    <span
      style={{
        ...toneStyles[tone],
        display: 'inline-block',
        borderRadius: radius.pill,
        padding: `${spacing.xs}px ${spacing.sm}px`,
        fontSize: typography.fontSize.xs,
        fontWeight: typography.fontWeight.medium,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </span>
  );
}