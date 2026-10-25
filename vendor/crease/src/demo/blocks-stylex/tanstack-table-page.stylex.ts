import * as stylex from '@stylexjs/stylex'

import { complexTokens } from '../../stylex/complex-tokens.stylex'
import { tokens } from '../../stylex/tokens.stylex'

export const styles = stylex.create({
  badgeDone: {
    borderColor: tokens.border,
    backgroundColor: complexTokens.mutedSurface,
    color: tokens.foreground,
  },
  badgeProgress: {
    borderColor: tokens.primary,
    backgroundColor: tokens.transparent,
    color: tokens.primary,
  },
  badgeTodo: {
    borderColor: tokens.border,
    backgroundColor: tokens.transparent,
    color: tokens.mutedForeground,
  },
  code: {
    padding: '1rem',
    borderColor: tokens.border,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: complexTokens.mutedSurface,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '0.75rem',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    overflowX: 'auto',
  },
  featureGrid: {
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 900px)': 'repeat(3, minmax(0, 1fr))',
    },
  },
  priorityHigh: { color: tokens.destructive, fontWeight: 600 },
  persistenceMount: { display: 'none' },
  titleCell: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
})
