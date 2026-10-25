import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Icon from '@/lib/icon'
import { type CheckboxBehaviorProps, renderCheckbox } from '@/lib/checkbox'
import { checkboxControlScope } from './checkbox.markers.stylex'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
const styles = stylex.create({
  row: { gap: '0.5rem', alignItems: 'start', display: 'flex' },
  control: {
    borderColor: { default: tokens.input, ':focus-visible': tokens.ring },
    borderRadius: foundationTokens.checkboxRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: foundationTokens.transparent,
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':focus-visible': tokens.focusRingShadow,
    },
    display: 'block',
    flexShrink: 0,
    outlineStyle: 'none',
    height: '1rem',
    width: '1rem',
  },
  checked: {
    borderColor: tokens.primary,
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  invalid: { borderColor: tokens.destructive },
  disabled: { cursor: interactionTokens.cursorDisabled, opacity: 0.5 },
  indicator: {
    placeContent: 'center',
    display: {
      default: 'none',
      [stylex.when.ancestor(':is([data-checked])', checkboxControlScope)]:
        'grid',
      [stylex.when.ancestor(':is([data-indeterminate])', checkboxControlScope)]:
        'grid',
    },
    minHeight: 0,
    minWidth: 0,
  },
  icon: { height: '0.875rem', minHeight: 0, minWidth: 0, width: '0.875rem' },
  text: { gap: '0.375rem', display: 'grid' },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
    userSelect: 'none',
  },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
})
export type CheckboxProps<Msg> = CheckboxBehaviorProps<Msg> &
  Readonly<{ layoutStyle?: ComponentLayoutStyle; tabindex?: number }>
export const checkbox = <Msg>(
  p: CheckboxProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  renderCheckbox(
    p,
    {
      root: [h.Class(className(styles.row, p.layoutStyle))],
      control: [
        h.Class(
          className(
            reset.button,
            styles.control,
            checkboxControlScope,
            p.isChecked && styles.checked,
            p.isInvalid === true && styles.invalid,
            p.isDisabled === true && styles.disabled,
          ),
        ),
        ...(p.tabindex === undefined ? [] : [h.Tabindex(p.tabindex)]),
      ],
      indicator: [h.Class(className(styles.indicator))],
      text: [h.Class(className(styles.text))],
      label: [h.Class(className(styles.label))],
      description: [h.Class(className(reset.text, styles.description))],
    },
    p.isIndeterminate === true
      ? Icon.minus({ class: className(styles.icon) }, h)
      : Icon.check({ class: className(styles.icon) }, h),
    h,
  )
