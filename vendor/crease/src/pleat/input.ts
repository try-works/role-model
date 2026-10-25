import { Style, When } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { type InputBehaviorProps, renderInput } from '@/lib/input'
import type { ComponentLayoutStyle } from './contracts'
import { joinStyles } from './button-group-join'
import { className } from './style'
import { reset } from './reset'
import { tokens } from './tokens'
import { interactionTokens } from './interaction-tokens'

const styles = {
  field: Style.make({ gap: '0.5rem', display: 'grid' }),
  label: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
  }),
  input: Style.make({
    borderColor: tokens.input,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    paddingBlock: '0.25rem',
    paddingInline: '0.625rem',
    backgroundColor: tokens.inputSurface,
    boxShadow: tokens.shadowSm,
    display: 'flex',
    fontFamily: 'inherit',
    fontSize: '1rem',
    lineHeight: '1.5rem',
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, border-color, box-shadow',
    height: '2rem',
    minWidth: 0,
    width: '100%',
  }).pipe(
    Style.when(When.focusVisible, {
      borderColor: tokens.ring,
      boxShadow: tokens.focusRingShadow,
    }),
    Style.when(When.minWidth('768px'), {
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
    }),
    Style.when(
      When.all(
        When.container('(min-width: 28rem)', 'field-group'),
        When.pseudo(
          ':where([data-slot="field"][data-orientation="responsive"] > *)',
        ),
      ),
      { width: 'auto' },
    ),
    Style.when(When.placeholder, { color: tokens.mutedForeground }),
  ),
  disabled: Style.make({
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
    pointerEvents: 'none',
  }),
  invalid: Style.make({ borderColor: tokens.destructive }),
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}

export type InputProps<Msg> = InputBehaviorProps<Msg> &
  Readonly<{
    /** Parent-layout positioning only. Add visual choices as named variants. */
    layoutStyle?: ComponentLayoutStyle | undefined
    /** Control-level overrides for composite inputs (e.g. icon inset padding). */
    inputStyle?: Style.Style | undefined
  }>

export const input = <Msg>(props: InputProps<Msg>, h: HtmlBuilder<Msg>): Html =>
  renderInput(
    props,
    {
      field: [h.Class(className(styles.field))],
      label: [h.Class(className(styles.label))],
      input: [
        h.Class(
          className(
            reset.input,
            styles.input,
            joinStyles.join,
            joinStyles.inputGrow,
            props.isDisabled && styles.disabled,
            props.isInvalid && styles.invalid,
            props.inputStyle,
            props.layoutStyle,
          ),
        ),
      ],
      description: [h.Class(className(reset.text, styles.description))],
    },
    h,
  )
