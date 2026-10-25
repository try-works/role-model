import * as stylex from '@stylexjs/stylex'

import type { LintRendererKit } from '@/docs/lint/previews'
import { button } from '@/stylex/button'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import { reset } from '@/stylex/reset'
import { className } from '@/stylex/style'
import { tokens } from '@/stylex/tokens.stylex'

const styles = stylex.create({
  caseBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    scrollMarginTop: '6rem',
  },
  caseHeader: { display: 'flex', flexDirection: 'column', gap: '.25rem' },
  compare: { display: 'grid', gap: '1rem' },
  panel: {
    backgroundColor: tokens.card,
    borderColor: tokens.border,
    borderRadius: '.5rem',
    borderStyle: 'solid',
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  },
  panelHeader: {
    alignItems: 'center',
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: 1,
    color: tokens.foreground,
    display: 'flex',
    fontSize: '.875rem',
    fontWeight: 500,
    gap: '.5rem',
    paddingBlock: '.5rem',
    paddingInline: '1rem',
  },
  label: {
    borderRadius: '9999px',
    fontSize: '.75rem',
    fontWeight: 500,
    paddingBlock: '.125rem',
    paddingInline: '.5rem',
  },
  badLabel: {
    backgroundColor: 'color-mix(in oklab, var(--destructive) 10%, transparent)',
    color: tokens.destructive,
  },
  goodLabel: {
    backgroundColor: 'color-mix(in oklab, var(--success) 10%, transparent)',
    color: 'var(--success)',
  },
  preview: {
    alignItems: 'flex-start',
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: 1,
    color: tokens.foreground,
    display: 'flex',
    flexDirection: 'column',
    gap: '.5rem',
    justifyContent: 'center',
    minHeight: '8rem',
    paddingBlock: '2rem',
    paddingInline: '1.5rem',
  },
  previewWide: { alignItems: 'stretch' },
  diagnostics: {
    borderBlockStartColor: tokens.border,
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '.75rem',
    paddingBlock: '.75rem',
    paddingInline: '1rem',
  },
  diagnostic: {
    color: tokens.foreground,
    display: 'flex',
    flexDirection: 'column',
    fontSize: '.875rem',
    gap: '.25rem',
  },
  mono: {
    fontFamily: 'var(--font-mono, ui-monospace, monospace)',
    fontSize: '.75rem',
  },
  diagnosticMeta: { color: tokens.mutedForeground },
  diagnosticRule: { color: tokens.destructive },
  diagnosticSource: {
    backgroundColor: tokens.muted,
    borderRadius: '.375rem',
    lineHeight: '1.25rem',
    overflowX: 'auto',
    paddingBlock: '.5rem',
    paddingInline: '.75rem',
    whiteSpace: 'pre',
  },
  note: {
    borderColor: tokens.border,
    borderRadius: '.5rem',
    borderStyle: 'dashed',
    borderWidth: 1,
    color: tokens.mutedForeground,
    fontSize: '.875rem',
    paddingBlock: '.75rem',
    paddingInline: '1rem',
  },
  terminal: { overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' },
})

const layout = stylex.create({
  restyle: {
    alignSelf: 'flex-start',
    backgroundColor: 'red',
    borderRadius: 0,
    color: 'white',
  },
  fullWidth: { width: '100%' },
  start: { alignSelf: 'flex-start' },
  padded: { alignSelf: 'flex-start', padding: '24px' },
})

export const stylexLintKit: LintRendererKit = {
  styles: {
    caseBlock: className(styles.caseBlock),
    caseHeader: className(styles.caseHeader),
    compare: className(styles.compare),
    panel: className(styles.panel),
    panelHeader: className(reset.text, styles.panelHeader),
    badLabel: className(reset.text, styles.label, styles.badLabel),
    goodLabel: className(reset.text, styles.label, styles.goodLabel),
    preview: className(styles.preview),
    previewWide: className(styles.preview, styles.previewWide),
    diagnostics: className(styles.diagnostics),
    diagnostic: className(reset.text, styles.diagnostic),
    diagnosticMeta: className(reset.text, styles.mono, styles.diagnosticMeta),
    diagnosticRule: className(reset.text, styles.mono, styles.diagnosticRule),
    diagnosticSource: className(
      reset.text,
      styles.mono,
      styles.diagnosticSource,
    ),
    note: className(reset.text, styles.note),
    terminal: className(
      reset.text,
      styles.mono,
      styles.diagnosticSource,
      styles.terminal,
    ),
  },
  primaryVars: ['--primary', tokens.primary.slice(4, -1)],
  button: (props, h) =>
    button(
      {
        variant: props.variant ?? 'default',
        layoutStyle: (props.broken === 'restyle'
          ? layout.restyle
          : props.broken === 'padding'
            ? layout.padded
            : props.fullWidth === true
              ? layout.fullWidth
              : layout.start) as ComponentLayoutStyle,
        children: [...props.children],
      },
      h,
    ),
}
