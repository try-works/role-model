import { Style, When } from '@pleat/core'
import { complexTokens } from '../../pleat/complex-tokens'
import { tokens } from '../../pleat/tokens'

export const styles = {
  badgeDone: Style.make({
    borderColor: tokens.border,
    backgroundColor: complexTokens.mutedSurface,
    color: tokens.foreground,
  }),
  badgeProgress: Style.make({
    borderColor: tokens.primary,
    backgroundColor: tokens.transparent,
    color: tokens.primary,
  }),
  badgeTodo: Style.make({
    borderColor: tokens.border,
    backgroundColor: tokens.transparent,
    color: tokens.mutedForeground,
  }),
  code: Style.make({
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
  }),
  featureGrid: Style.make({
    gap: '1rem',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr)',
  }).pipe(
    Style.when(When.minWidth('900px'), {
      gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    }),
  ),
  priorityHigh: Style.make({ color: tokens.destructive, fontWeight: 600 }),
  persistenceMount: Style.make({ display: 'none' }),
  titleCell: Style.make({
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
}
