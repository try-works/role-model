import { Style } from '@pleat/core'
import { tokens } from '../../pleat/tokens'

/** Layout of authored examples, shared by the StyleX preview providers. */
export const previewLayout = {
  wide: Style.make({ width: '100%', maxWidth: '36rem' }),
  wider: Style.make({ width: '100%', maxWidth: '42rem' }),
  contents: Style.make({ display: 'contents' }),
  form: Style.make({
    display: 'flex',
    width: '100%',
    maxWidth: '28rem',
    flexDirection: 'column',
    gap: '1rem',
  }),
  compactForm: Style.make({
    display: 'flex',
    width: '100%',
    maxWidth: '28rem',
    flexDirection: 'column',
    gap: '.75rem',
  }),
  search: Style.make({
    display: 'flex',
    width: '100%',
    maxWidth: '32rem',
    flexDirection: 'column',
    gap: '1rem',
  }),
  stack: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  }),
  compactStack: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '.75rem',
  }),
  centered: Style.make({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  }),
  row: Style.make({ display: 'flex', alignItems: 'center', gap: '.5rem' }),
  status: Style.make({
    flex: 1,
    fontSize: '.75rem',
    lineHeight: '1.25rem',
    color: tokens.mutedForeground,
  }),
  caption: Style.make({ fontSize: '.75rem', color: tokens.mutedForeground }),
  rule: Style.make({ borderColor: tokens.border }),
  log: Style.make({
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '.875rem',
    lineHeight: 1.7,
  }),
}
