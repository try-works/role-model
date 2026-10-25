import { Style } from '@pleat/core'

import type { LintRendererKit } from '@/docs/lint/previews'
import { button } from '@/pleat/button'
import type { ComponentLayoutStyle } from '@/pleat/contracts'
import { layoutStyle } from '@/pleat/contracts'
import { reset } from '@/pleat/reset'
import { className } from '@/pleat/style'
import { tokens } from '@/pleat/tokens'

const styles = {
  caseBlock: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    scrollMarginTop: '6rem',
  }),
  caseHeader: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '.25rem',
  }),
  compare: Style.make({ display: 'grid', gap: '1rem' }),
  panel: Style.make({
    backgroundColor: tokens.card,
    borderColor: tokens.border,
    borderRadius: '.5rem',
    borderStyle: 'solid',
    borderWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflow: 'hidden',
  }),
  panelHeader: Style.make({
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
  }),
  label: Style.make({
    borderRadius: '9999px',
    fontSize: '.75rem',
    fontWeight: 500,
    paddingBlock: '.125rem',
    paddingInline: '.5rem',
  }),
  badLabel: Style.make({
    backgroundColor: 'color-mix(in oklab, var(--destructive) 10%, transparent)',
    color: tokens.destructive,
  }),
  goodLabel: Style.make({
    backgroundColor: 'color-mix(in oklab, var(--success) 10%, transparent)',
    color: 'var(--success)',
  }),
  preview: Style.make({
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
  }),
  previewWide: Style.make({ alignItems: 'stretch' }),
  diagnostics: Style.make({
    borderBlockStartColor: tokens.border,
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '.75rem',
    paddingBlock: '.75rem',
    paddingInline: '1rem',
  }),
  diagnostic: Style.make({
    color: tokens.foreground,
    display: 'flex',
    flexDirection: 'column',
    fontSize: '.875rem',
    gap: '.25rem',
  }),
  mono: Style.make({
    fontFamily: 'var(--font-mono, ui-monospace, monospace)',
    fontSize: '.75rem',
  }),
  diagnosticMeta: Style.make({ color: tokens.mutedForeground }),
  diagnosticRule: Style.make({ color: tokens.destructive }),
  diagnosticSource: Style.make({
    backgroundColor: tokens.muted,
    borderRadius: '.375rem',
    lineHeight: '1.25rem',
    overflowX: 'auto',
    paddingBlock: '.5rem',
    paddingInline: '.75rem',
    whiteSpace: 'pre',
  }),
  note: Style.make({
    borderColor: tokens.border,
    borderRadius: '.5rem',
    borderStyle: 'dashed',
    borderWidth: 1,
    color: tokens.mutedForeground,
    fontSize: '.875rem',
    paddingBlock: '.75rem',
    paddingInline: '1rem',
  }),
  terminal: Style.make({ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }),
}

const layout = {
  restyle: Style.make({
    alignSelf: 'flex-start',
    backgroundColor: 'red',
    borderRadius: 0,
    color: 'white',
  }) as ComponentLayoutStyle,
  fullWidth: layoutStyle({ width: '100%' }),
  start: layoutStyle({ alignSelf: 'flex-start' }),
  padded: Style.make({
    alignSelf: 'flex-start',
    padding: '24px',
  }) as ComponentLayoutStyle,
}

export const pleatLintKit: LintRendererKit = {
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
  primaryVars: ['--primary', tokens.primary.name],
  button: (props, h) =>
    button(
      {
        variant: props.variant ?? 'default',
        layoutStyle:
          props.broken === 'restyle'
            ? layout.restyle
            : props.broken === 'padding'
              ? layout.padded
              : props.fullWidth === true
                ? layout.fullWidth
                : layout.start,
        children: [...props.children],
      },
      h,
    ),
}
