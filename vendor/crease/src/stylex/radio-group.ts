import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import {
  type RadioGroupBehaviorProps,
  Message,
  Model,
  type OutMessage,
  init,
  renderRadioGroup,
  update,
} from '@/lib/radio-group'
import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { radioItemScope } from './radio-group.markers.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
const styles = stylex.create({
  group: { gap: '0.75rem', display: 'grid' },
  groupColumns2: {
    gridTemplateColumns: {
      default: 'minmax(0, 1fr)',
      '@media (min-width: 768px)': 'repeat(2, minmax(0, 1fr))',
    },
  },
  row: { gap: '0.5rem', alignItems: 'start', display: 'flex' },
  item: {
    borderColor: { default: tokens.input, ':focus-visible': tokens.ring },
    borderRadius: '50%',
    borderStyle: 'solid',
    borderWidth: 1,
    aspectRatio: '1',
    backgroundColor: foundationTokens.transparent,
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':focus-visible': tokens.focusRingShadow,
    },
    color: tokens.primary,
    display: 'block',
    flexShrink: 0,
    outlineStyle: 'none',
    height: '1rem',
    width: '1rem',
  },
  disabled: { cursor: interactionTokens.cursorDisabled, opacity: 0.5 },
  indicator: {
    alignItems: 'center',
    display: {
      default: 'none',
      [stylex.when.ancestor(':is([data-checked])', radioItemScope)]: 'flex',
    },
    justifyContent: 'center',
    position: 'relative',
    minHeight: 0,
    minWidth: 0,
  },
  dot: {
    fill: tokens.primary,
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    height: '0.5rem',
    left: '50%',
    minHeight: 0,
    minWidth: 0,
    top: '50%',
    width: '0.5rem',
  },
  text: { gap: '0.375rem', display: 'grid' },
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
    userSelect: 'none',
  },
  invalid: { borderColor: tokens.destructive },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
})
export type { RadioGroupOption } from '@/lib/radio-group'
export type RadioGroupProps<Msg> = RadioGroupBehaviorProps<Msg> &
  Readonly<{ columns?: 1 | 2; layoutStyle?: ComponentLayoutStyle }>
export { Message, Model, init, update }
export type { OutMessage }
export const radioGroup = <Msg>(
  p: RadioGroupProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  renderRadioGroup(
    p,
    {
      group: [
        h.Class(
          className(
            styles.group,
            p.columns === 2 && styles.groupColumns2,
            p.layoutStyle,
          ),
        ),
      ],
      row: [h.Class(className(styles.row))],
      item: state => [
        h.Class(
          className(
            reset.button,
            styles.item,
            radioItemScope,
            state.isDisabled && styles.disabled,
            p.options[state.index]?.isInvalid === true && styles.invalid,
          ),
        ),
      ],
      indicator: [h.Class(className(styles.indicator))],
      text: [h.Class(className(styles.text))],
      label: [h.Class(className(styles.label))],
      description: [h.Class(className(reset.text, styles.description))],
    },
    (isSelected, indicatorH) =>
      isSelected
        ? Icon.circleIcon({ class: className(styles.dot) }, indicatorH)
        : indicatorH.empty,
    h,
  )
