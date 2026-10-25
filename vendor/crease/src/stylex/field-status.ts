import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx FieldStatus.tsx — StyleX renderer.
   See src/ui/field-status.ts for the port contract + PORT-NOTEs. */

export type FieldStatusType = 'warning' | 'error' | 'success'

export type FieldStatusVariant = 'attached' | 'detached'

export type FieldStatusProps = Readonly<{
  type: FieldStatusType
  message: string
  variant?: FieldStatusVariant
  id?: string
  layoutStyle?: ComponentLayoutStyle
}>

const STATUS_ICON: Readonly<Record<FieldStatusType, string>> = {
  warning: 'triangle-alert',
  error: 'circle-alert',
  success: 'circle-check',
}

const styles = stylex.create({
  base: {
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  attached: {
    paddingInline: '0.5rem',
    borderEndEndRadius: tokens.controlRadius,
    borderEndStartRadius: tokens.controlRadius,
    paddingBlockEnd: '0.5rem',
    paddingBlockStart: '0.875rem',
    /* The overlap is visual only — pointer input reaches the control
       beneath instead of the later-painted status box stealing it. */
    pointerEvents: 'none',
    marginTop: '-0.375rem',
  },
  detached: {
    borderRadius: tokens.controlRadius,
    paddingBlock: '0.5rem',
    paddingInline: '0.5rem',
    marginTop: '0.25rem',
  },
  detachedContent: {
    gap: '0.25rem',
    alignItems: 'flex-start',
    display: 'flex',
  },
  detachedIcon: {
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    /* centers the glyph within the first text-line box */
    height: '1rem',
  },
  iconSm: {
    height: '1rem',
    width: '1rem',
  },
})

const statusColor = stylex.create({
  warning: {
    color: tokens.alertWarning,
  },
  error: {
    color: tokens.destructive,
  },
  success: {
    color: tokens.alertSuccess,
  },
})

/* astryx warning/error/success-muted backgrounds are 20% hue tints — outside
   the create prop limits, so they apply as inline color-mix values.
   PORT-NOTE: 'warningMuted'/'errorMuted'/'successMuted' status fill tokens. */
const STATUS_BG: Readonly<Record<FieldStatusType, string>> = {
  warning: 'color-mix(in oklab, var(--warning) 20%, transparent)',
  error: 'color-mix(in oklab, var(--destructive) 20%, transparent)',
  success: 'color-mix(in oklab, var(--success) 20%, transparent)',
}

export const fieldStatus = <Msg>(
  props: FieldStatusProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = props.variant ?? 'attached'
  return h.div(
    [
      h.DataAttribute('slot', 'field-status'),
      h.DataAttribute('type', props.type),
      h.DataAttribute('variant', variant),
      ...(props.id === undefined ? [] : [h.Id(props.id)]),
      h.Class(
        className(
          styles.base,
          variant === 'attached' ? styles.attached : styles.detached,
          statusColor[props.type],
          props.layoutStyle,
        ),
      ),
      h.Style({ backgroundColor: STATUS_BG[props.type] }),
    ],
    variant === 'detached'
      ? [
          h.span(
            [h.Class(className(styles.detachedContent))],
            [
              h.span(
                [
                  h.DataAttribute('slot', 'field-status-icon'),
                  h.AriaHidden(true),
                  h.Class(className(styles.detachedIcon)),
                ],
                [
                  Icon.icon(
                    STATUS_ICON[props.type],
                    { class: className(styles.iconSm) },
                    h,
                  ),
                ],
              ),
              h.span([], [props.message]),
            ],
          ),
        ]
      : [props.message],
  )
}
