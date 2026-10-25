import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { Select as SelectPrimitive } from '@foldkit/ui'
import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
const styles = stylex.create({
  wrapper: {
    opacity: { default: 1, ':has(select:disabled)': 0.5 },
    position: 'relative',
    width: 'fit-content',
  },
  control: {
    borderColor: { default: tokens.input, ':focus-visible': tokens.ring },
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    paddingBlock: {
      default: '0.375rem',
      ':is([data-size="sm"])': '0.25rem',
    },
    appearance: 'none',
    backgroundColor: foundationTokens.transparent,
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':focus-visible': tokens.focusRingShadow,
    },
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    height: '2rem',
    minWidth: 0,
    paddingLeft: '0.625rem',
    paddingRight: '2rem',
    width: '100%',
  },
  invalid: {
    borderColor: tokens.destructive,
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':focus-visible': tokens.destructiveRingShadow,
    },
  },
  disabled: { cursor: interactionTokens.cursorDisabled, pointerEvents: 'none' },
  icon: {
    color: tokens.mutedForeground,
    opacity: 0.5,
    pointerEvents: 'none',
    position: 'absolute',
    transform: 'translateY(-50%)',
    height: '1rem',
    right: '0.875rem',
    top: '50%',
    width: '1rem',
  },
  option: {
    backgroundColor: foundationTokens.nativeOptionSurface,
    color: foundationTokens.nativeOptionInk,
  },
  field: { gap: '0.5rem', display: 'grid' },
  label: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
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
export type NativeSelectOption = Readonly<{
  value: string
  label: string
  isDisabled?: boolean
}>
export type NativeSelectGroup = Readonly<{
  label: string
  options: ReadonlyArray<NativeSelectOption>
  isDisabled?: boolean
}>
export type NativeSelectOptionProps = NativeSelectOption &
  Readonly<{ layoutStyle?: ComponentLayoutStyle }>
export const nativeSelectOption = <Msg>(
  p: NativeSelectOptionProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.option(
    [
      h.DataAttribute('slot', 'native-select-option'),
      h.Value(p.value),
      ...(p.isDisabled === undefined ? [] : [h.Disabled(p.isDisabled)]),
      h.Class(className(styles.option, p.layoutStyle)),
    ],
    [p.label],
  )
export type NativeSelectOptGroupProps = NativeSelectGroup &
  Readonly<{ layoutStyle?: ComponentLayoutStyle }>
export const nativeSelectOptGroup = <Msg>(
  p: NativeSelectOptGroupProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.optgroup(
    [
      h.DataAttribute('slot', 'native-select-optgroup'),
      h.LabelAttr(p.label),
      ...(p.isDisabled === undefined ? [] : [h.Disabled(p.isDisabled)]),
      h.Class(className(styles.option, p.layoutStyle)),
    ],
    p.options.map(o => nativeSelectOption(o, h)),
  )
export type NativeSelectProps<Msg> = Readonly<{
  id: string
  value: string
  onChange: (value: string) => Msg
  options: ReadonlyArray<NativeSelectOption>
  groups?: ReadonlyArray<NativeSelectGroup>
  label?: string
  description?: string
  name?: string
  size?: 'sm' | 'default'
  isDisabled?: boolean
  isInvalid?: boolean
  direction?: 'ltr' | 'rtl'
  layoutStyle?: ComponentLayoutStyle
}>
export const nativeSelect = <Msg>(
  p: NativeSelectProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  SelectPrimitive.view(
    {
      id: p.id,
      value: p.value,
      onChange: p.onChange,
      isDisabled: p.isDisabled ?? false,
      isInvalid: p.isInvalid ?? false,
      ...(p.name === undefined ? {} : { name: p.name }),
      hasDescription: p.description !== undefined,
      toView: ({ select, label, description }) => {
        const element = h.span(
          [
            h.DataAttribute('slot', 'native-select-wrapper'),
            h.Class(className(styles.wrapper, p.layoutStyle)),
          ],
          [
            h.select(
              [
                ...select,
                ...(p.direction === undefined ? [] : [h.Dir(p.direction)]),
                h.DataAttribute('slot', 'native-select'),
                h.DataAttribute('size', p.size ?? 'default'),
                h.Class(
                  className(
                    reset.input,
                    styles.control,
                    p.isInvalid && styles.invalid,
                    p.isDisabled && styles.disabled,
                  ),
                ),
              ],
              [
                ...p.options.map(o => nativeSelectOption(o, h)),
                ...(p.groups ?? []).map(g => nativeSelectOptGroup(g, h)),
              ],
            ),
            h.span(
              [
                h.DataAttribute('slot', 'native-select-icon'),
                h.Class(className(styles.icon)),
              ],
              [Icon.chevronDown({}, h)],
            ),
          ],
        )
        return p.label === undefined && p.description === undefined
          ? element
          : h.div(
              [h.Class(className(styles.field))],
              [
                ...(p.label === undefined
                  ? []
                  : [
                      h.label(
                        [...label, h.Class(className(styles.label))],
                        [p.label],
                      ),
                    ]),
                element,
                ...(p.description === undefined
                  ? []
                  : [
                      h.p(
                        [
                          ...description,
                          h.Class(className(reset.text, styles.description)),
                        ],
                        [p.description],
                      ),
                    ]),
              ],
            )
      },
    },
    h,
  )
