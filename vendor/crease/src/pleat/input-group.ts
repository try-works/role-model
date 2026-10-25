import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { Button as ButtonPrimitive } from '@foldkit/ui'
import { buttonVisualStyles, type ButtonProps } from './button'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens'
import { className } from './style'
import { tokens } from './tokens'
import { interactionTokens } from './interaction-tokens'
type SlotProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
  radius?: 'xl' | 'full'
}>
type Align = 'inline-start' | 'inline-end' | 'block-start' | 'block-end'
type GroupButtonSize = 'xs' | 'sm' | 'icon-xs' | 'icon-sm'
const styles = {
  group: Style.make({
    borderColor: tokens.input,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    boxShadow: foundationTokens.shadowXs,
    display: 'flex',
    flexDirection: 'row',
    outlineStyle: 'none',
    position: 'relative',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, box-shadow',
    height: '2rem',
    minWidth: 0,
    width: '100%',
  }).pipe(
    Style.when(
      When.has(
        When.pseudo(':is([data-slot="input-group-control"]:focus-visible)'),
      ),
      { borderColor: tokens.ring, boxShadow: tokens.focusRingShadow },
    ),
    Style.when(When.has(When.pseudo(':is([data-slot][aria-invalid="true"])')), {
      borderColor: tokens.destructive,
    }),
    Style.when(When.pseudo(':has(> [data-align="block-end"])'), {
      flexDirection: 'column',
      height: 'auto',
    }),
    Style.when(When.pseudo(':has(> [data-align="block-start"])'), {
      flexDirection: 'column',
      height: 'auto',
    }),
    Style.when(When.pseudo(':has(> textarea)'), { height: 'auto' }),
  ),
  radiusXl: Style.make({ borderRadius: foundationTokens.radius2xl }),
  radiusFull: Style.make({ borderRadius: foundationTokens.radiusFull }),
  addon: Style.make({
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
  }),
  inlineStart: Style.make({ order: -9999, paddingLeft: '0.75rem' }).pipe(
    Style.when(When.pseudo(':has(> button)'), {
      marginLeft: '-0.45rem',
    }),
    Style.when(When.pseudo(':has(> kbd)'), { marginLeft: '-0.35rem' }),
  ),
  inlineEnd: Style.make({ order: 9999, paddingRight: '0.75rem' }).pipe(
    Style.when(When.pseudo(':has(> button)'), {
      marginRight: '-0.45rem',
    }),
    Style.when(When.pseudo(':has(> kbd)'), {
      marginRight: '-0.35rem',
    }),
  ),
  blockStart: Style.make({
    paddingInline: '0.75rem',
    justifyContent: 'flex-start',
    order: -9999,
    paddingBlockStart: '0.75rem',
    width: '100%',
  }).pipe(
    Style.when(
      When.pseudo(':where([data-slot="input-group"]:has(> input) > *)'),
      { paddingBlockStart: '0.625rem' },
    ),
  ),
  blockEnd: Style.make({
    paddingInline: '0.75rem',
    justifyContent: 'flex-start',
    order: 9999,
    paddingBlockEnd: '0.75rem',
    width: '100%',
  }).pipe(
    Style.when(
      When.pseudo(':where([data-slot="input-group"]:has(> input) > *)'),
      { paddingBlockEnd: '0.625rem' },
    ),
  ),
  button: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    boxShadow: foundationTokens.shadowNone,
    display: 'flex',
  }),
  buttonXs: Style.make({
    borderRadius: foundationTokens.radiusNested,
    gap: '0.25rem',
    paddingInline: '0.5rem',
    height: '1.5rem',
  }),
  buttonSm: Style.make({
    gap: '0.375rem',
    paddingInline: '0.625rem',
    height: '2rem',
  }),
  buttonIcon: Style.make({
    borderRadius: foundationTokens.radiusNested,
    paddingInline: 0,
    height: '1.5rem',
    width: '1.5rem',
  }),
  buttonIconSm: Style.make({ paddingInline: 0, height: '2rem', width: '2rem' }),
  text: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  input: Style.make({
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
    fontSize: '1rem',
    lineHeight: '1.5rem',
    outlineStyle: 'none',
    paddingBlockEnd: '0.25rem',
    paddingBlockStart: '0.25rem',
    height: '2rem',
    minWidth: 0,
    paddingLeft: '0.625rem',
    paddingRight: '0.625rem',
    width: '100%',
  }).pipe(
    Style.when(When.minWidth('768px'), {
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
    }),
    Style.when(
      When.pseudo(
        ':where([data-slot="input-group"]:has(> [data-align="block-start"]) > *)',
      ),
      { paddingBlockEnd: '0.75rem' },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="input-group"]:has(> [data-align="block-end"]) > *)',
      ),
      { paddingBlockStart: '0.75rem' },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="input-group"]:has(> [data-align="inline-start"]) > *)',
      ),
      { paddingLeft: '0.5rem' },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="input-group"]:has(> [data-align="inline-end"]) > *)',
      ),
      { paddingRight: '0.5rem' },
    ),
  ),
  textarea: Style.make({
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
    fontSize: '1rem',
    lineHeight: '1.5rem',
    outlineStyle: 'none',
    resize: 'none',
    minHeight: '4rem',
    width: '100%',
  }).pipe(
    Style.when(When.minWidth('768px'), {
      fontSize: '0.875rem',
      lineHeight: '1.25rem',
    }),
  ),
  disabled: Style.make({
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
    pointerEvents: 'none',
  }),
  mono: Style.make({
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
  }),
}
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
  Readonly<{
    size?: GroupButtonSize
    layoutStyle?: ComponentLayoutStyle | undefined
  }>
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
  layoutStyle?: ComponentLayoutStyle | undefined
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
  layoutStyle?: ComponentLayoutStyle | undefined
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
