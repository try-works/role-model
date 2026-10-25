import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

/* Ported from Meta Astryx Field/types.ts — InputStatus contract shared by the
   astryx input ports (file-input, number-input, time-input, list-input,
   checkbox). */

export type InputStatusType = 'warning' | 'error' | 'success'
export type InputStatus = Readonly<{
  type: InputStatusType
  message?: string
}>

/**
 * How a status message is placed relative to the input.
 * - 'attached': the message box visually merges with the input
 * - 'detached': a standalone message box appears below
 * - 'tooltip': no message box; a focusable status icon inside the input
 *   exposes the message on hover/focus
 */
export type FieldStatusVariant = 'attached' | 'detached' | 'tooltip'

export const statusIconName = (type: InputStatusType): string =>
  type === 'warning'
    ? 'triangle-alert'
    : type === 'error'
      ? 'octagon-x'
      : 'circle-check'

/** Accessible name for the 'tooltip' variant's status icon button. */
export const statusButtonLabel = (type: InputStatusType): string =>
  type === 'warning'
    ? 'Warning details'
    : type === 'error'
      ? 'Error details'
      : 'Success details'

export type FieldStatusVisualAttributes<Msg> = Readonly<{
  root: (type: InputStatusType) => ReadonlyArray<Attribute<Msg>>
  icon: ReadonlyArray<Attribute<Msg>>
  text: ReadonlyArray<Attribute<Msg>>
}>

/**
 * Astryx FieldStatus 'detached' chrome: status-colored surface with a leading
 * glyph and supporting-size text. Rendered below the input.
 */
export const renderDetachedStatus = <Msg>(
  status: InputStatus,
  visual: FieldStatusVisualAttributes<Msg>,
  icon: Html,
  h: HtmlBuilder<Msg>,
  id?: string,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'field-status'),
      ...(id === undefined ? [] : [h.Id(id)]),
      ...visual.root(status.type),
    ],
    [
      h.span(
        [
          h.DataAttribute('slot', 'field-status-icon'),
          h.Attribute('aria-hidden', 'true'),
          ...visual.icon,
        ],
        [icon],
      ),
      h.span(
        [h.DataAttribute('slot', 'field-status-text'), ...visual.text],
        [status.message ?? ''],
      ),
    ],
  )

/**
 * Astryx FieldStatus 'attached' chrome: a status-colored box that slides under
 * the input by `overlap` px — the parent stacks it with a negative margin and
 * compensating top padding, the input keeps z-index 1, and the box is
 * pointer-events-none so it never swallows input clicks.
 */
export const renderAttachedStatus = <Msg>(
  status: InputStatus,
  visual: FieldStatusVisualAttributes<Msg>,
  h: HtmlBuilder<Msg>,
  id?: string,
): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'field-status'),
      ...(id === undefined ? [] : [h.Id(id)]),
      ...visual.root(status.type),
    ],
    [
      h.span(
        [h.DataAttribute('slot', 'field-status-text'), ...visual.text],
        [status.message ?? ''],
      ),
    ],
  )
