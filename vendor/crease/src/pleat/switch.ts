import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { type SwitchBehaviorProps, renderSwitch } from '@/lib/switch'
export { switchIds } from '@/lib/switch'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { className } from './style'
import { tokens } from './tokens'
import { interactionTokens } from './interaction-tokens'
export type SwitchSize = 'sm' | 'default'
const styles = {
  row: Style.make({ gap: '0.5rem', alignItems: 'start', display: 'flex' }),
  control: Style.make({
    borderColor: foundationTokens.transparent,
    borderRadius: foundationTokens.radiusFull,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: tokens.input,
    boxShadow: foundationTokens.shadowXs,
    display: 'inline-flex',
    flexShrink: 0,
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color, border-color, box-shadow',
    transitionTimingFunction: interactionTokens.easingDefault,
    height: '1.15rem',
    width: '2rem',
  }).pipe(
    Style.when(When.focusVisible, {
      borderColor: tokens.ring,
      boxShadow: tokens.focusRingShadow,
    }),
  ),
  sm: Style.make({ height: '0.875rem', width: '1.5rem' }),
  checked: Style.make({ backgroundColor: tokens.primary }),
  disabled: Style.make({
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
  }),
  thumb: Style.make({
    borderRadius: '50%',
    backgroundColor: tokens.background,
    display: 'block',
    pointerEvents: 'none',
    transform: 'translateX(0)',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'transform',
    height: '1rem',
    width: '1rem',
  }),
  thumbSm: Style.make({ height: '0.75rem', width: '0.75rem' }),
  thumbChecked: Style.make({ transform: 'translateX(calc(100% - 2px))' }),
  thumbCheckedRtl: Style.make({ transform: 'translateX(calc(-100% + 2px))' }),
  text: Style.make({ gap: '0.375rem', display: 'grid' }),
  label: Style.make({
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
    userSelect: 'none',
  }).pipe(
    Style.when(When.data('disabled'), {
      cursor: interactionTokens.cursorDisabled,
      opacity: 0.5,
    }),
  ),
  description: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}
export type SwitchProps<Msg> = SwitchBehaviorProps<Msg> &
  Readonly<{
    size?: SwitchSize
    layoutStyle?: ComponentLayoutStyle | undefined
  }>
export const switchControl = <Msg>(
  p: SwitchProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const size = p.size ?? 'default'
  return renderSwitch(
    p,
    {
      root: [h.Class(className(styles.row, p.layoutStyle))],
      control: [
        h.DataAttribute('size', size),
        h.Class(
          className(
            reset.button,
            styles.control,
            size === 'sm' && styles.sm,
            p.isChecked && styles.checked,
            (p.isDisabled || p.isReadOnly) && styles.disabled,
          ),
        ),
      ],
      thumb: [
        h.Class(
          className(
            styles.thumb,
            size === 'sm' && styles.thumbSm,
            p.isChecked &&
              (p.direction === 'rtl'
                ? styles.thumbCheckedRtl
                : styles.thumbChecked),
          ),
        ),
      ],
      text: [h.Class(className(styles.text))],
      label: [h.Class(className(styles.label))],
      description: [h.Class(className(reset.text, styles.description))],
    },
    h,
  )
}
export { switchControl as switch }
