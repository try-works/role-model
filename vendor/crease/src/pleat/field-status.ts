import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens'

/* Ported from Meta Astryx FieldStatus.tsx — StyleX renderer.
   See src/ui/field-status.ts for the port contract + PORT-NOTEs. */

export type FieldStatusType = 'warning' | 'error' | 'success'

export type FieldStatusVariant = 'attached' | 'detached'

export type FieldStatusProps = Readonly<{
  type: FieldStatusType
  message: string
  variant?: FieldStatusVariant
  id?: string
  layoutStyle?: ComponentLayoutStyle | undefined
}>

const STATUS_ICON: Readonly<Record<FieldStatusType, string>> = {
  warning: 'triangle-alert',
  error: 'circle-alert',
  success: 'circle-check',
}

const styles = {
  base: Style.make({ fontSize: '0.75rem', lineHeight: '1rem' }),
  attached: Style.make({
    paddingInline: '0.5rem',
    borderEndEndRadius: tokens.controlRadius,
    borderEndStartRadius: tokens.controlRadius,
    paddingBlockEnd: '0.5rem',
    paddingBlockStart: '0.875rem',
    pointerEvents: 'none',
    marginTop: '-0.375rem',
  }),
  detached: Style.make({
    borderRadius: tokens.controlRadius,
    paddingBlock: '0.5rem',
    paddingInline: '0.5rem',
    marginTop: '0.25rem',
  }),
  detachedContent: Style.make({
    gap: '0.25rem',
    alignItems: 'flex-start',
    display: 'flex',
  }),
  detachedIcon: Style.make({
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    height: '1rem',
  }),
  iconSm: Style.make({ height: '1rem', width: '1rem' }),
}

const statusColor = {
  warning: Style.make({ color: tokens.alertWarning }),
  error: Style.make({ color: tokens.destructive }),
  success: Style.make({ color: tokens.alertSuccess }),
}

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
