import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'

/* Ported from Meta Astryx FieldStatus.tsx — the status message shown under
   form controls. The `attached` variant overlaps the control above (inside
   Field); `detached` floats below with a leading status icon so status isn't
   conveyed by color alone (WCAG 1.4.1).
   astryx announces the message through persistent live regions and animates
   it in (slideDown) only when mounted dynamically — crease has neither
   primitive, so this port renders the message statically.
   PORT-NOTE: announce + entry animation need live-region/motion primitives. */

export type FieldStatusType = 'warning' | 'error' | 'success'

export type FieldStatusVariant = 'attached' | 'detached'

export type FieldStatusProps = Readonly<{
  type: FieldStatusType
  message: string
  /** @default 'attached' */
  variant?: FieldStatusVariant
  /** Stable id — inputs reference it via aria-describedby. */
  id?: string
  class?: string
}>

const STATUS_ICON: Readonly<Record<FieldStatusType, string>> = {
  warning: 'triangle-alert',
  error: 'circle-alert',
  success: 'circle-check',
}

/* astryx warning/error/success-muted fills over the same status text colors;
   crease pairs the 20% hue tint with the chart/destructive status hues.
   PORT-NOTE: tokenize as 'warningMuted', 'errorMuted', 'successMuted' +
   'textYellow'/'textRed'/'textGreen'. */
const STATUS_COLOR: Readonly<Record<FieldStatusType, string>> = {
  warning: 'bg-warning/20 text-warning',
  error: 'bg-destructive/20 text-destructive',
  success: 'bg-success/20 text-success',
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
        cn(
          'text-xs',
          variant === 'attached'
            ? /* 6px overlap onto the control above, visual-only
                 (pointer-events passes through to the control). */
              'pointer-events-none -mt-1.5 rounded-b-md px-2 pt-[0.875rem] pb-2'
            : 'mt-1 rounded-md px-2 py-2',
          STATUS_COLOR[props.type],
          props.class,
        ),
      ),
    ],
    variant === 'detached'
      ? [
          h.span(
            [h.Class('flex items-start gap-1')],
            [
              h.span(
                [
                  h.DataAttribute('slot', 'field-status-icon'),
                  h.AriaHidden(true),
                  /* centers the glyph within the first text-line box */
                  h.Class('inline-flex h-4 shrink-0 items-center'),
                ],
                [Icon.icon(STATUS_ICON[props.type], { class: 'size-4' }, h)],
              ),
              h.span([], [props.message]),
            ],
          ),
        ]
      : [props.message],
  )
}
