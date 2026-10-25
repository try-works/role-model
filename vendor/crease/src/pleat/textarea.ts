import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { type TextareaBehaviorProps, renderTextarea } from '@/lib/textarea'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { className } from './style'
import { tokens } from './tokens'
import { interactionTokens } from './interaction-tokens'
const styles = {
  control: Style.make({
    fieldSizing: 'content',
    borderColor: tokens.input,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    paddingBlock: '0.5rem',
    paddingInline: '0.75rem',
    backgroundColor: foundationTokens.transparent,
    boxShadow: foundationTokens.shadowXs,
    display: 'flex',
    fontFamily: 'inherit',
    fontSize: '1rem',
    lineHeight: '1.5rem',
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, box-shadow',
    minHeight: '4rem',
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
    Style.when(When.placeholder, { color: tokens.mutedForeground }),
  ),
  invalid: Style.make({ borderColor: tokens.destructive }),
  disabled: Style.make({
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
  }),
  wrapper: Style.make({ gap: '0.5rem', display: 'grid' }),
  label: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
    userSelect: 'none',
  }),
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}
const resizeStyles = {
  none: Style.make({ resize: 'none' }),
  vertical: Style.make({ resize: 'vertical' }),
  horizontal: Style.make({ resize: 'horizontal' }),
  both: Style.make({ resize: 'both' }),
}
export type TextareaProps<Msg> = TextareaBehaviorProps<Msg> &
  Readonly<{ layoutStyle?: ComponentLayoutStyle | undefined }>
export const textarea = <Msg>(
  p: TextareaProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  renderTextarea(
    p,
    {
      field: [h.Class(className(styles.wrapper))],
      label: [h.Class(className(styles.label))],
      textarea: [
        h.Class(
          className(
            reset.input,
            styles.control,
            resizeStyles[p.resize ?? 'vertical'],
            p.isInvalid && styles.invalid,
            p.isDisabled && styles.disabled,
            p.layoutStyle,
          ),
        ),
      ],
      description: [h.Class(className(reset.text, styles.description))],
    },
    h,
  )
