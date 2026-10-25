import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { type InputBehaviorProps, renderInput } from '@/lib/input'
import type { ComponentLayoutStyle } from './contracts'
import { joinStyles } from './button-group-join.stylex'
import { className } from './style'
import { reset } from './reset'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'

const styles = stylex.create({
  field: {
    gap: '0.5rem',
    display: 'grid',
  },
  label: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
  },
  input: {
    borderColor: {
      default: tokens.input,
      ':focus-visible': tokens.ring,
    },
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    paddingBlock: '0.25rem',
    paddingInline: '0.625rem',
    backgroundColor: tokens.inputSurface,
    boxShadow: {
      default: tokens.shadowSm,
      ':focus-visible': tokens.focusRingShadow,
    },
    display: 'flex',
    fontFamily: 'inherit',
    fontSize: {
      default: '1rem',
      '@media (min-width: 768px)': '0.875rem',
    },
    lineHeight: {
      default: '1.5rem',
      '@media (min-width: 768px)': '1.25rem',
    },
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, border-color, box-shadow',
    height: '2rem',
    minWidth: 0,
    width: {
      default: '100%',
      '@container field-group (min-width: 28rem)': {
        default: null,
        ':where([data-slot="field"][data-orientation="responsive"] > *)':
          'auto',
      },
    },
    '::placeholder': { color: tokens.mutedForeground },
  },
  disabled: {
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
    pointerEvents: 'none',
  },
  invalid: {
    borderColor: tokens.destructive,
  },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
})

export type InputProps<Msg> = InputBehaviorProps<Msg> &
  Readonly<{
    /** Parent-layout positioning only. Add visual choices as named variants. */
    layoutStyle?: ComponentLayoutStyle
    /** Control-level overrides for composite inputs (e.g. icon inset padding). */
    inputStyle?: StaticStyles
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
