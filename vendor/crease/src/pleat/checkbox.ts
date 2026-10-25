import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Icon from '@/lib/icon'
import { type CheckboxBehaviorProps, renderCheckbox } from '@/lib/checkbox'
import { checkboxControlScope } from './checkbox.markers'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { className } from './style'
import { tokens } from './tokens'
import { interactionTokens } from './interaction-tokens'
const styles = {
  row: Style.make({ gap: '0.5rem', alignItems: 'start', display: 'flex' }),
  control: Style.make({
    borderColor: tokens.input,
    borderRadius: foundationTokens.checkboxRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: foundationTokens.transparent,
    boxShadow: foundationTokens.shadowXs,
    display: 'block',
    flexShrink: 0,
    outlineStyle: 'none',
    height: '1rem',
    width: '1rem',
  }).pipe(
    Style.when(When.focusVisible, {
      borderColor: tokens.ring,
      boxShadow: tokens.focusRingShadow,
    }),
  ),
  checked: Style.make({
    borderColor: tokens.primary,
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  }),
  invalid: Style.make({ borderColor: tokens.destructive }),
  disabled: Style.make({
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
  }),
  indicator: Style.make({
    placeContent: 'center',
    display: 'none',
    minHeight: 0,
    minWidth: 0,
  }).pipe(
    Style.when(When.within(checkboxControlScope, When.data('checked')), {
      display: 'grid',
    }),
    Style.when(When.within(checkboxControlScope, When.data('indeterminate')), {
      display: 'grid',
    }),
  ),
  icon: Style.make({
    height: '0.875rem',
    minHeight: 0,
    minWidth: 0,
    width: '0.875rem',
  }),
  text: Style.make({ gap: '0.375rem', display: 'grid' }),
  label: Style.make({
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
export type CheckboxProps<Msg> = CheckboxBehaviorProps<Msg> &
  Readonly<{
    layoutStyle?: ComponentLayoutStyle | undefined
    tabindex?: number
  }>
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
