import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'

/* Ported from Meta Astryx Indicator (packages/core/src/Indicator/{CheckIndicator,CheckboxIndicator,RadioIndicator}.tsx) — examples and visual spec adapted to Crease UI tokens.
   The indicators are decorative selection visuals (aria-hidden): the owning
   control keeps the role, accessible name, and focus behavior. Astryx scopes
   hover tints to a marked ancestor row; here the Tailwind port uses
   `group-hover/indicator:` so the host opt-in is the `group/indicator` class. */

export type IndicatorState = 'unchecked' | 'checked' | 'indeterminate'
/** `sm` renders a 20px control, `md` a 24px control. */
export type IndicatorSize = 'sm' | 'md'

const SLOT_CLASS = 'inline-flex size-4 shrink-0 items-center justify-center'
const CHECK_GLYPH_CLASS = 'size-4'

const BOX_CLASS =
  'box-border flex shrink-0 items-center justify-center rounded-[4px] border border-solid transition-colors duration-150 ease-in-out motion-reduce:transition-none'
const CHECKBOX_UNCHECKED_CLASS =
  'border-input bg-background text-primary group-hover/indicator:border-ring group-hover/indicator:bg-muted'
const CHECKBOX_CHECKED_CLASS =
  'border-primary bg-primary text-primary-foreground group-hover/indicator:border-primary/90 group-hover/indicator:bg-primary/90'
const DISABLED_CLASS = 'opacity-50'
const DISABLED_UNCHECKED_CLASS = 'border-border bg-muted'

const BOX_SIZE_CLASS: Readonly<Record<IndicatorSize, string>> = {
  sm: 'size-5',
  md: 'size-6',
}
const CHECKMARK_SIZE_CLASS: Readonly<Record<IndicatorSize, string>> = {
  sm: 'size-3',
  md: 'size-3.5',
}
const INDETERMINATE_SIZE_CLASS: Readonly<Record<IndicatorSize, string>> = {
  sm: 'h-0.5 w-2.5',
  md: 'h-0.5 w-3',
}
const DOT_SIZE_CLASS: Readonly<Record<IndicatorSize, string>> = {
  sm: 'size-2',
  md: 'size-2.5',
}

const isCheckedState = (state: IndicatorState): boolean => state === 'checked'
const isCheckedOrIndeterminate = (state: IndicatorState): boolean =>
  state !== 'unchecked'

const checkmark = <Msg>(
  state: IndicatorState,
  size: IndicatorSize,
  h: HtmlBuilder<Msg>,
): Html =>
  h.svg(
    [
      h.ViewBox('0 0 10 10'),
      h.Class(
        cn(
          'hidden text-primary-foreground',
          CHECKMARK_SIZE_CLASS[size],
          isCheckedState(state) && 'block',
        ),
      ),
      h.DataAttribute('slot', 'checkbox-indicator-check'),
    ],
    [
      h.path(
        [
          h.D('M8.5 2.5L4 7.5L1.5 5'),
          h.Stroke('currentColor'),
          h.StrokeWidth('1.5'),
          h.Fill('none'),
          h.StrokeLinecap('round'),
          h.StrokeLinejoin('round'),
        ],
        [],
      ),
    ],
  )

const indeterminateMark = <Msg>(
  state: IndicatorState,
  size: IndicatorSize,
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'checkbox-indicator-dash'),
      h.Class(
        cn(
          'hidden rounded-full bg-primary-foreground',
          INDETERMINATE_SIZE_CLASS[size],
          state === 'indeterminate' && 'block',
        ),
      ),
    ],
    [],
  )

export type CheckIndicatorProps = Readonly<{
  state: 'unchecked' | 'checked'
  size?: IndicatorSize
  isDisabled?: boolean
  /** Replacement content rendered in the mark's slot (e.g. a busy spinner). */
  children?: ReadonlyArray<Html>
  class?: string
}>

/** The default single-selection mark: a checkmark when chosen, nothing when not. */
export const checkIndicator = <Msg>(
  props: CheckIndicatorProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const isChecked = props.state === 'checked'
  if (props.children !== undefined && props.children.length > 0) {
    return h.span(
      [
        h.AriaHidden(true),
        h.Class(
          cn(
            SLOT_CLASS,
            props.isDisabled === true
              ? 'text-muted-foreground'
              : 'text-primary',
            props.class,
          ),
        ),
      ],
      [...props.children],
    )
  }
  if (!isChecked) {
    return h.empty
  }
  return Icon.check(
    {
      class: cn(
        CHECK_GLYPH_CLASS,
        props.isDisabled === true ? 'text-muted-foreground' : 'text-primary',
        props.class,
      ),
    },
    h,
  )
}

export type CheckboxIndicatorProps = Readonly<{
  state: IndicatorState
  size?: IndicatorSize
  isDisabled?: boolean
  /** Replacement content rendered inside the box (e.g. a busy spinner). */
  children?: ReadonlyArray<Html>
  class?: string
}>

/** The default checkbox visual: a square box with a checkmark or an indeterminate bar. */
export const checkboxIndicator = <Msg>(
  props: CheckboxIndicatorProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = props.size ?? 'md'
  const isDisabled = props.isDisabled === true
  return h.span(
    [
      h.AriaHidden(true),
      h.DataAttribute('slot', 'checkbox-indicator'),
      h.DataAttribute('size', size),
      h.DataAttribute('checked', props.state),
      ...(isDisabled ? [h.DataAttribute('disabled', 'true')] : []),
      h.Class(
        cn(
          BOX_CLASS,
          BOX_SIZE_CLASS[size],
          isCheckedOrIndeterminate(props.state)
            ? CHECKBOX_CHECKED_CLASS
            : CHECKBOX_UNCHECKED_CLASS,
          isDisabled && DISABLED_CLASS,
          isDisabled &&
            !isCheckedOrIndeterminate(props.state) &&
            DISABLED_UNCHECKED_CLASS,
          props.class,
        ),
      ),
    ],
    props.children !== undefined && props.children.length > 0
      ? [...props.children]
      : [
          checkmark(props.state, size, h),
          indeterminateMark(props.state, size, h),
        ],
  )
}

export type RadioIndicatorProps = Readonly<{
  /** A radio has no partial state; anything other than unchecked reads as selected. */
  state: IndicatorState
  size?: IndicatorSize
  isDisabled?: boolean
  /** Replacement content rendered inside the circle (e.g. a busy spinner). */
  children?: ReadonlyArray<Html>
  class?: string
}>

/** The default radio visual: a circle with a filled inner dot when selected. */
export const radioIndicator = <Msg>(
  props: RadioIndicatorProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = props.size ?? 'md'
  const isChecked = props.state !== 'unchecked'
  const isDisabled = props.isDisabled === true
  return h.span(
    [
      h.AriaHidden(true),
      h.DataAttribute('slot', 'radio-indicator'),
      h.DataAttribute('size', size),
      ...(isChecked ? [h.DataAttribute('checked', 'checked')] : []),
      ...(isDisabled ? [h.DataAttribute('disabled', 'true')] : []),
      h.Class(
        cn(
          BOX_CLASS,
          'rounded-full',
          BOX_SIZE_CLASS[size],
          isChecked ? CHECKBOX_CHECKED_CLASS : CHECKBOX_UNCHECKED_CLASS,
          isDisabled && DISABLED_CLASS,
          isDisabled && !isChecked && DISABLED_UNCHECKED_CLASS,
          props.class,
        ),
      ),
    ],
    props.children !== undefined && props.children.length > 0
      ? [...props.children]
      : isChecked
        ? [
            h.span(
              [
                h.DataAttribute('slot', 'radio-indicator-dot'),
                h.Class(
                  cn(
                    'rounded-full bg-primary-foreground',
                    DOT_SIZE_CLASS[size],
                  ),
                ),
              ],
              [],
            ),
          ]
        : [],
  )
}
