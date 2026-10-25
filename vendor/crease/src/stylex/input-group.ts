import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { Button as ButtonPrimitive } from '@foldkit/ui'
import { buttonVisualStyles, type ButtonProps } from './button'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
type SlotProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
  radius?: 'xl' | 'full'
}>
type Align = 'inline-start' | 'inline-end' | 'block-start' | 'block-end'
type GroupButtonSize = 'xs' | 'sm' | 'icon-xs' | 'icon-sm'
const styles = stylex.create({
  group: {
    borderColor: {
      default: tokens.input,
      ':has([data-slot="input-group-control"]:focus-visible)': tokens.ring,
      ':has([data-slot][aria-invalid="true"])': tokens.destructive,
    },
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':has([data-slot="input-group-control"]:focus-visible)':
        tokens.focusRingShadow,
    },
    display: 'flex',
    flexDirection: {
      default: 'row',
      ':has(> [data-align="block-end"])': 'column',
      ':has(> [data-align="block-start"])': 'column',
    },
    outlineStyle: 'none',
    position: 'relative',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, box-shadow',
    height: {
      default: '2rem',
      ':has(> [data-align="block-end"])': 'auto',
      ':has(> [data-align="block-start"])': 'auto',
      ':has(> textarea)': 'auto',
    },
    minWidth: 0,
    width: '100%',
  },
  radiusXl: { borderRadius: foundationTokens.radius2xl },
  radiusFull: { borderRadius: foundationTokens.radiusFull },
  addon: {
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    alignItems: 'center',
    color: tokens.mutedForeground,
    cursor: interactionTokens.cursorText,
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    userSelect: 'none',
  },
  inlineStart: {
    order: -9999,
    marginLeft: {
      default: null,
      ':has(> button)': '-0.45rem',
      ':has(> kbd)': '-0.35rem',
    },
    paddingLeft: '0.75rem',
  },
  inlineEnd: {
    order: 9999,
    marginRight: {
      default: null,
      ':has(> button)': '-0.45rem',
      ':has(> kbd)': '-0.35rem',
    },
    paddingRight: '0.75rem',
  },
  blockStart: {
    paddingInline: '0.75rem',
    justifyContent: 'flex-start',
    order: -9999,
    paddingBlockStart: {
      default: '0.75rem',
      ':where([data-slot="input-group"]:has(> input) > *)': '0.625rem',
    },
    width: '100%',
  },
  blockEnd: {
    paddingInline: '0.75rem',
    justifyContent: 'flex-start',
    order: 9999,
    paddingBlockEnd: {
      default: '0.75rem',
      ':where([data-slot="input-group"]:has(> input) > *)': '0.625rem',
    },
    width: '100%',
  },
  button: {
    gap: '0.5rem',
    alignItems: 'center',
    boxShadow: foundationTokens.shadowNone,
    display: 'flex',
  },
  buttonXs: {
    borderRadius: foundationTokens.radiusNested,
    gap: '0.25rem',
    paddingInline: '0.5rem',
    height: '1.5rem',
  },
  buttonSm: {
    gap: '0.375rem',
    paddingInline: '0.625rem',
    height: '2rem',
  },
  buttonIcon: {
    borderRadius: foundationTokens.radiusNested,
    paddingInline: 0,
    height: '1.5rem',
    width: '1.5rem',
  },
  buttonIconSm: { paddingInline: 0, height: '2rem', width: '2rem' },
  text: {
    gap: '0.5rem',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  input: {
    borderColor: foundationTokens.transparent,
    borderRadius: '0px',
    borderStyle: 'solid',
    borderWidth: 0,
    backgroundColor: foundationTokens.transparent,
    boxShadow: foundationTokens.shadowNone,
    display: 'flex',
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
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
    paddingBlockEnd: {
      default: '0.25rem',
      ':where([data-slot="input-group"]:has(> [data-align="block-start"]) > *)':
        '0.75rem',
    },
    paddingBlockStart: {
      default: '0.25rem',
      ':where([data-slot="input-group"]:has(> [data-align="block-end"]) > *)':
        '0.75rem',
    },
    height: '2rem',
    minWidth: 0,
    paddingLeft: {
      default: '0.625rem',
      ':where([data-slot="input-group"]:has(> [data-align="inline-start"]) > *)':
        '0.5rem',
    },
    paddingRight: {
      default: '0.625rem',
      ':where([data-slot="input-group"]:has(> [data-align="inline-end"]) > *)':
        '0.5rem',
    },
    width: '100%',
  },
  textarea: {
    fieldSizing: 'content',
    borderColor: foundationTokens.transparent,
    borderRadius: '0px',
    borderStyle: 'solid',
    borderWidth: 0,
    paddingBlock: '0.5rem',
    paddingInline: '0.75rem',
    backgroundColor: foundationTokens.transparent,
    boxShadow: foundationTokens.shadowNone,
    flexBasis: '0%',
    flexGrow: '1',
    flexShrink: '1',
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
    resize: 'none',
    minHeight: '4rem',
    width: '100%',
  },
  disabled: {
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
    pointerEvents: 'none',
  },
  mono: {
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
  },
})
export const inputGroup = <Msg>(p: SlotProps, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [
      h.DataAttribute('slot', 'input-group'),
      h.Role('group'),
      h.Class(
        className(
          styles.group,
          p.radius === 'xl' && styles.radiusXl,
          p.radius === 'full' && styles.radiusFull,
          p.layoutStyle,
        ),
      ),
    ],
    [...p.children],
  )
export type InputGroupAddonVariants = Readonly<{ align?: Align | null }>
export const inputGroupAddonVariants = (
  o: InputGroupAddonVariants = {},
): string =>
  className(
    styles.addon,
    styles[
      (o.align ?? 'inline-start').replace(/-([a-z])/g, (_, c: string) =>
        c.toUpperCase(),
      ) as 'inlineStart'
    ],
  )
export type InputGroupAddonProps<Msg = never> = SlotProps &
  Readonly<{ align?: Align; focusControlId?: string; onFocus?: Msg }>
export const inputGroupAddon = <Msg>(
  p: InputGroupAddonProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const align = p.align ?? 'inline-start'
  const map = {
    'inline-start': styles.inlineStart,
    'inline-end': styles.inlineEnd,
    'block-start': styles.blockStart,
    'block-end': styles.blockEnd,
  }
  return h.div(
    [
      h.Role('group'),
      h.DataAttribute('slot', 'input-group-addon'),
      h.DataAttribute('align', align),
      ...(p.focusControlId === undefined || p.onFocus === undefined
        ? []
        : [h.OnClick(p.onFocus, { focusSelector: `#${p.focusControlId}` })]),
      h.Class(className(styles.addon, map[align], p.layoutStyle)),
    ],
    [...p.children],
  )
}
export type InputGroupButtonVariants = Readonly<{
  size?: GroupButtonSize | null
}>
export const inputGroupButtonVariants = (
  o: InputGroupButtonVariants = {},
): string =>
  className(
    styles.button,
    o.size === 'xs' && styles.buttonXs,
    o.size === 'sm' && styles.buttonSm,
    o.size === 'icon-xs' && styles.buttonIcon,
    o.size === 'icon-sm' && styles.buttonIconSm,
  )
export type InputGroupButtonProps<Msg> = Omit<
  ButtonProps<Msg>,
  'size' | 'layoutStyle'
> &
  Readonly<{ size?: GroupButtonSize; layoutStyle?: ComponentLayoutStyle }>
export const inputGroupButton = <Msg>(
  p: InputGroupButtonProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  ButtonPrimitive.view(
    {
      ...(p.onClick === undefined ? {} : { onClick: p.onClick }),
      isDisabled: p.isDisabled ?? false,
      type: p.type ?? 'button',
      toView: ({ button }) =>
        h.button(
          [
            ...button,
            h.DataAttribute('slot', 'input-group-button'),
            h.DataAttribute('size', p.size ?? 'xs'),
            ...(p.ariaLabel === undefined ? [] : [h.AriaLabel(p.ariaLabel)]),
            h.Class(
              className(
                reset.button,
                ...buttonVisualStyles({
                  variant: p.variant ?? 'ghost',
                  size: 'default',
                }),
                styles.button,
                (p.size ?? 'xs') === 'xs' && styles.buttonXs,
                p.size === 'sm' && styles.buttonSm,
                p.size === 'icon-xs' && styles.buttonIcon,
                p.size === 'icon-sm' && styles.buttonIconSm,
                p.layoutStyle,
              ),
            ),
          ],
          [
            h.span(
              [h.DataAttribute('slot', 'button-content')],
              [...p.children],
            ),
          ],
        ),
    },
    h,
  )
export const inputGroupText = <Msg>(p: SlotProps, h: HtmlBuilder<Msg>): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'input-group-text'),
      h.Class(className(styles.text, p.layoutStyle)),
    ],
    [...p.children],
  )
export type InputGroupInputProps<Msg> = Readonly<{
  id: string
  value: string
  onInput: (value: string) => Msg
  onKeyDown?: (key: string) => Msg
  placeholder?: string
  type?: string
  name?: string
  step?: string
  isDisabled?: boolean
  isInvalid?: boolean
  ariaLabel?: string
  layoutStyle?: ComponentLayoutStyle
}>
export const inputGroupInput = <Msg>(
  p: InputGroupInputProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.input([
    h.Id(p.id),
    h.Value(p.value),
    h.OnInput(p.onInput),
    ...(p.onKeyDown === undefined
      ? []
      : [h.OnKeyDown(key => p.onKeyDown!(key))]),
    h.Type(p.type ?? 'text'),
    ...(p.step === undefined ? [] : [h.Step(p.step)]),
    ...(p.name === undefined ? [] : [h.Name(p.name)]),
    ...(p.placeholder === undefined ? [] : [h.Placeholder(p.placeholder)]),
    ...(p.ariaLabel === undefined ? [] : [h.AriaLabel(p.ariaLabel)]),
    ...(p.isDisabled ? [h.Disabled(true)] : []),
    ...(p.isInvalid ? [h.AriaInvalid(true)] : []),
    h.DataAttribute('slot', 'input-group-control'),
    h.Class(
      className(
        reset.input,
        styles.input,
        p.isDisabled && styles.disabled,
        p.layoutStyle,
      ),
    ),
  ])
export type InputGroupTextareaProps<Msg> = Readonly<{
  id: string
  value: string
  onInput: (value: string) => Msg
  placeholder?: string
  name?: string
  isDisabled?: boolean
  isInvalid?: boolean
  ariaLabel?: string
  /** Monospace control text — upstream `font-mono` on the textarea example. */
  mono?: boolean
  layoutStyle?: ComponentLayoutStyle
}>
export const inputGroupTextarea = <Msg>(
  p: InputGroupTextareaProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.textarea([
    h.Id(p.id),
    h.Value(p.value),
    h.OnInput(p.onInput),
    ...(p.name === undefined ? [] : [h.Name(p.name)]),
    ...(p.placeholder === undefined ? [] : [h.Placeholder(p.placeholder)]),
    ...(p.ariaLabel === undefined ? [] : [h.AriaLabel(p.ariaLabel)]),
    ...(p.isDisabled ? [h.Disabled(true)] : []),
    ...(p.isInvalid ? [h.AriaInvalid(true)] : []),
    h.DataAttribute('slot', 'input-group-control'),
    h.Class(
      className(
        reset.input,
        styles.textarea,
        p.isDisabled && styles.disabled,
        p.mono === true && styles.mono,
        p.layoutStyle,
      ),
    ),
  ])
