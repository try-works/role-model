import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { interactionTokens } from './interaction-tokens'
import { className } from './style'
import { tokens } from './tokens'

/* Ported from Meta Astryx Indicator (packages/core/src/Indicator/) — examples
   and visual spec adapted to Crease UI tokens. Astryx scopes hover tints to a
   marked ancestor row (`when.ancestor(':hover', indicatorScope)`); Crease
   StyleX has no marker files, so these apply only on the indicator's own
   hover — a self-hover fallback (see badge.ts for the same pattern). */

const base = {
  slot: Style.make({
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '1rem',
    width: '1rem',
  }),
  box: Style.make({
    borderRadius: foundationTokens.checkboxRadius,
    borderStyle: 'solid',
    borderWidth: '1px',
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color,border-color',
    transitionTimingFunction: interactionTokens.easingStandard,
  }),
  boxSm: Style.make({ height: '1.25rem', width: '1.25rem' }),
  boxMd: Style.make({ height: '1.5rem', width: '1.5rem' }),
  boxRound: Style.make({ borderRadius: foundationTokens.radiusFull }),
  unchecked: Style.make({
    borderColor: tokens.input,
    backgroundColor: tokens.background,
    color: tokens.primary,
  }).pipe(
    Style.when(When.hover, {
      borderColor: tokens.ring,
      backgroundColor: tokens.mutedHover,
    }),
  ),
  checked: Style.make({
    borderColor: tokens.primary,
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  }).pipe(
    Style.when(When.hover, {
      borderColor: tokens.primaryHover,
      backgroundColor: tokens.primaryHover,
    }),
  ),
  tint: Style.make({ color: tokens.primary }),
  tintDisabled: Style.make({ color: tokens.mutedForeground }),
  glyph: Style.make({ height: '1rem', width: '1rem' }),
  checkGlyph: Style.make({ color: tokens.primaryForeground }),
  markShown: Style.make({ display: 'block' }),
  markHidden: Style.make({ display: 'none' }),
  disabled: Style.make({ opacity: 0.5 }),
  disabledUnchecked: Style.make({
    borderColor: tokens.border,
    backgroundColor: foundationTokens.muted,
  }),
  dashSm: Style.make({ height: '0.125rem', width: '0.625rem' }),
  dashMd: Style.make({ height: '0.125rem', width: '0.75rem' }),
  dash: Style.make({
    borderRadius: foundationTokens.radiusFull,
    backgroundColor: tokens.primaryForeground,
  }),
  dotSm: Style.make({ height: '0.5rem', width: '0.5rem' }),
  dotMd: Style.make({ height: '0.625rem', width: '0.625rem' }),
  dot: Style.make({
    borderRadius: foundationTokens.radiusFull,
    backgroundColor: tokens.primaryForeground,
  }),
}

export type IndicatorState = 'unchecked' | 'checked' | 'indeterminate'
/** `sm` renders a 20px control, `md` a 24px control. */
export type IndicatorSize = 'sm' | 'md'

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
      h.Width(size === 'sm' ? '12' : '14'),
      h.Height(size === 'sm' ? '12' : '14'),
      h.Class(
        className(
          reset.svg,
          base.checkGlyph,
          isCheckedState(state) ? base.markShown : base.markHidden,
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

export type CheckIndicatorProps = Readonly<{
  state: 'unchecked' | 'checked'
  size?: IndicatorSize
  isDisabled?: boolean
  /** Replacement content rendered in the mark's slot (e.g. a busy spinner). */
  children?: ReadonlyArray<Html>
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle | undefined
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
          className(
            base.slot,
            props.isDisabled === true ? base.tintDisabled : base.tint,
            props.layoutStyle,
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
      class: className(
        base.glyph,
        props.isDisabled === true ? base.tintDisabled : base.tint,
        props.layoutStyle,
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
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle | undefined
}>

/** The default checkbox visual: a square box with a checkmark or an indeterminate bar. */
export const checkboxIndicator = <Msg>(
  props: CheckboxIndicatorProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = props.size ?? 'md'
  const isDisabled = props.isDisabled === true
  const checked = isCheckedOrIndeterminate(props.state)
  return h.span(
    [
      h.AriaHidden(true),
      h.DataAttribute('slot', 'checkbox-indicator'),
      h.DataAttribute('size', size),
      h.DataAttribute('checked', props.state),
      ...(isDisabled ? [h.DataAttribute('disabled', 'true')] : []),
      h.Class(
        className(
          base.box,
          size === 'sm' ? base.boxSm : base.boxMd,
          checked ? base.checked : base.unchecked,
          isDisabled && base.disabled,
          isDisabled && !checked && base.disabledUnchecked,
          props.layoutStyle,
        ),
      ),
    ],
    props.children !== undefined && props.children.length > 0
      ? [...props.children]
      : [
          checkmark(props.state, size, h),
          h.span(
            [
              h.DataAttribute('slot', 'checkbox-indicator-dash'),
              h.Class(
                className(
                  base.dash,
                  size === 'sm' ? base.dashSm : base.dashMd,
                  props.state === 'indeterminate'
                    ? base.markShown
                    : base.markHidden,
                ),
              ),
            ],
            [],
          ),
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
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle | undefined
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
        className(
          base.box,
          base.boxRound,
          size === 'sm' ? base.boxSm : base.boxMd,
          isChecked ? base.checked : base.unchecked,
          isDisabled && base.disabled,
          isDisabled && !isChecked && base.disabledUnchecked,
          props.layoutStyle,
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
                  className(base.dot, size === 'sm' ? base.dotSm : base.dotMd),
                ),
              ],
              [],
            ),
          ]
        : [],
  )
}
