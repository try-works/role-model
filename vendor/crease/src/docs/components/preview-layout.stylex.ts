import * as stylex from '@stylexjs/stylex'
import { tokens } from '../../stylex/tokens.stylex'

/** Layout of authored examples, shared by the StyleX preview providers. */
export const previewLayout = stylex.create({
  wide: { width: '100%', maxWidth: '36rem' },
  wider: { width: '100%', maxWidth: '42rem' },
  contents: { display: 'contents' },
  form: {
    display: 'flex',
    width: '100%',
    maxWidth: '28rem',
    flexDirection: 'column',
    gap: '1rem',
  },
  compactForm: {
    display: 'flex',
    width: '100%',
    maxWidth: '28rem',
    flexDirection: 'column',
    gap: '.75rem',
  },
  search: {
    display: 'flex',
    width: '100%',
    maxWidth: '32rem',
    flexDirection: 'column',
    gap: '1rem',
  },
  stack: { display: 'flex', flexDirection: 'column', gap: '1.5rem' },
  compactStack: { display: 'flex', flexDirection: 'column', gap: '.75rem' },
  centered: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  row: { display: 'flex', alignItems: 'center', gap: '.5rem' },
  status: {
    flex: 1,
    fontSize: '.75rem',
    lineHeight: '1.25rem',
    color: tokens.mutedForeground,
  },
  caption: { fontSize: '.75rem', color: tokens.mutedForeground },
  rule: { borderColor: tokens.border },
  log: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '.875rem',
    lineHeight: 1.7,
  },
})
