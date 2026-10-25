import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { type SwitchBehaviorProps, renderSwitch } from '@/lib/switch'
export { switchIds } from '@/lib/switch'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
export type SwitchSize = 'sm' | 'default'
const styles = stylex.create({
  row: { gap: '0.5rem', alignItems: 'start', display: 'flex' },
  control: {
    borderColor: {
      default: foundationTokens.transparent,
      ':focus-visible': tokens.ring,
    },
    borderRadius: foundationTokens.radiusFull,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: tokens.input,
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':focus-visible': tokens.focusRingShadow,
    },
    display: 'inline-flex',
    flexShrink: 0,
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color, border-color, box-shadow',
    transitionTimingFunction: interactionTokens.easingDefault,
    height: '1.15rem',
    width: '2rem',
  },
  sm: { height: '0.875rem', width: '1.5rem' },
  checked: { backgroundColor: tokens.primary },
  disabled: { cursor: interactionTokens.cursorDisabled, opacity: 0.5 },
  thumb: {
    borderRadius: '50%',
    backgroundColor: tokens.background,
    display: 'block',
    pointerEvents: 'none',
    transform: 'translateX(0)',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'transform',
    height: '1rem',
    width: '1rem',
  },
  thumbSm: { height: '0.75rem', width: '0.75rem' },
  thumbChecked: { transform: 'translateX(calc(100% - 2px))' },
  thumbCheckedRtl: { transform: 'translateX(calc(-100% + 2px))' },
  text: { gap: '0.375rem', display: 'grid' },
  label: {
    cursor: {
      default: null,
      ':is([data-disabled])': interactionTokens.cursorDisabled,
    },
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
    opacity: { default: null, ':is([data-disabled])': 0.5 },
    userSelect: 'none',
  },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
})
export type SwitchProps<Msg> = SwitchBehaviorProps<Msg> &
  Readonly<{ size?: SwitchSize; layoutStyle?: ComponentLayoutStyle }>
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
