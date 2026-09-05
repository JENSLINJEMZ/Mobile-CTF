import type { CSSProperties, ReactNode } from 'react';

import { colors, spacing, typography } from '../tokens';

type Level = 1 | 2 | 3 | 4;

export interface HeadingProps {
  children: ReactNode;
  level?: Level;
  style?: CSSProperties;
}

const levelMap: Record<Level, { tag: 'h1' | 'h2' | 'h3' | 'h4'; style: CSSProperties }> = {
  1: { tag: 'h1', style: { fontSize: typography.fontSize.xxl, fontWeight: typography.fontWeight.bold } },
  2: { tag: 'h2', style: { fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold } },
  3: { tag: 'h3', style: { fontSize: typography.fontSize.lg, fontWeight: typography.fontWeight.semibold } },
  4: { tag: 'h4', style: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold } },
};

export function Heading({ children, level = 1, style }: HeadingProps) {
  const { tag: Tag, style: levelStyle } = levelMap[level];
  const base: CSSProperties = {
    color: colors.text,
    marginTop: 0,
    marginBottom: spacing.md,
    lineHeight: typography.lineHeight.lg,
  };

  return (
    <Tag style={{ ...base, ...levelStyle, ...style }}>
      {children}
    </Tag>
  );
}