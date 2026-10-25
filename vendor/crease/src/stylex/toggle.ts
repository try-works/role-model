import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { Button as ButtonPrimitive } from '@foldkit/ui'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'
export type ToggleVariants = Readonly<{
  variant?: 'default' | 'outline' | null
  size?: 'default' | 'sm' | 'lg' | null
}>
const styles = stylex.create({
  root: {
    borderColor: {
      default: foundationTokens.transparent,
      ':focus-visible': tokens.ring,
    },
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: 0,
    gap: '0.5rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: {
      default: foundationTokens.transparent,
      ':hover': foundationTokens.muted,
    },
    color: { default: tokens.foreground, ':hover': tokens.mutedForeground },
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    whiteSpace: 'nowrap',
    height: '2.25rem',
    minWidth: '2.25rem',
  },
  outline: {
    borderColor: tokens.input,
    borderWidth: 1,
    boxShadow: foundationTokens.shadowXs,
  },
  pressed: { backgroundColor: tokens.accent, color: tokens.accentForeground },
  disabled: { opacity: 0.5, pointerEvents: 'none' },
  sm: { paddingInline: '0.375rem', height: '2rem', minWidth: '2rem' },
  lg: { paddingInline: '0.625rem', height: '2.5rem', minWidth: '2.5rem' },
})
export const toggleVariants = (o: ToggleVariants = {}): string =>
  className(
    styles.root,
    o.variant === 'outline' && styles.outline,
    o.size === 'sm' && styles.sm,
    o.size === 'lg' && styles.lg,
  )
export type ToggleProps<Msg> = Readonly<{
  isPressed: boolean
  onToggle: Msg
  variant?: ToggleVariants['variant']
  size?: ToggleVariants['size']
  children: ReadonlyArray<Html | string>
  isDisabled?: boolean
  id?: string
  ariaLabel?: string
  describedBy?: string
  direction?: 'ltr' | 'rtl'
  layoutStyle?: ComponentLayoutStyle
}>
export const toggle = <Msg>(p: ToggleProps<Msg>, h: HtmlBuilder<Msg>): Html =>
  ButtonPrimitive.view(
    {
      onClick: p.onToggle,
      isDisabled: p.isDisabled ?? false,
      type: 'button',
      toView: ({ button }) =>
        h.button(
          [
            ...button,
            h.DataAttribute('slot', 'toggle'),
            h.DataAttribute('size', p.size ?? 'default'),
            h.AriaPressed(p.isPressed ? 'true' : 'false'),
            ...(p.id === undefined ? [] : [h.Id(p.id)]),
            ...(p.ariaLabel === undefined ? [] : [h.AriaLabel(p.ariaLabel)]),
            ...(p.describedBy === undefined
              ? []
              : [h.AriaDescribedBy(p.describedBy)]),
            ...(p.direction === undefined ? [] : [h.Dir(p.direction)]),
            h.Class(
              className(
                reset.button,
                styles.root,
                p.variant === 'outline' && styles.outline,
                p.size === 'sm' && styles.sm,
                p.size === 'lg' && styles.lg,
                p.isPressed && styles.pressed,
                p.isDisabled && styles.disabled,
                p.layoutStyle,
              ),
            ),
          ],
          [...p.children],
        ),
    },
    h,
  )
