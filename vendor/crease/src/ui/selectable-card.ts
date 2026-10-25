import type { Html, HtmlBuilder } from 'foldkit/html'
import { Option } from 'effect'

import {
  cardSurfaceClass,
  SR_ONLY_CLASS,
  type CardElevation,
  type CardPadding,
  type CardVariant,
} from '@/lib/card-surface'
import { pressableAttributes } from '@/lib/card-pressable'
import { cn } from '@/lib/utils'

/* Ported from Meta Astryx SelectableCard.tsx — a card that toggles between
   selected and unselected states. Selection is parent-owned (isSelected +
   onChange); the selection indicator is an inset ring drawn through the
   card's --_card-ring shadow slot so it composes with resting elevation
   instead of clobbering it. A hidden checkbox owns the accessible role,
   label, and checked state. */

export type {
  CardElevation,
  CardPadding,
  CardVariant,
} from '@/lib/card-surface'
export { Message } from '@/lib/card-pressable'

const HOVER_GUARD = '[@media(hover:hover)]:'

/* astryx --color-border-{color} mapped to the nearest Crease UI token. */
const SELECTED_RING: Readonly<Record<CardVariant, string>> = {
  default: '[--_card-ring:inset_0_0_0_2px_var(--ring)] border-ring',
  transparent: '[--_card-ring:inset_0_0_0_2px_var(--ring)] border-ring',
  muted: '[--_card-ring:inset_0_0_0_2px_var(--ring)] border-ring',
  blue: '[--_card-ring:inset_0_0_0_2px_var(--chart-3)] border-chart-3',
  cyan: '[--_card-ring:inset_0_0_0_2px_var(--chart-2)] border-chart-2',
  gray: '[--_card-ring:inset_0_0_0_2px_var(--muted-foreground)] border-muted-foreground',
  green: '[--_card-ring:inset_0_0_0_2px_var(--chart-2)] border-chart-2',
  orange: '[--_card-ring:inset_0_0_0_2px_var(--chart-5)] border-chart-5',
  pink: '[--_card-ring:inset_0_0_0_2px_var(--chart-1)] border-chart-1',
  purple: '[--_card-ring:inset_0_0_0_2px_var(--chart-3)] border-chart-3',
  red: '[--_card-ring:inset_0_0_0_2px_var(--destructive)] border-destructive',
  teal: '[--_card-ring:inset_0_0_0_2px_var(--chart-2)] border-chart-2',
  yellow: '[--_card-ring:inset_0_0_0_2px_var(--chart-4)] border-chart-4',
}

export type SelectableCardProps<Msg> = Readonly<{
  /** Accessibility label for the card, applied to the hidden checkbox. */
  label: string
  /** Controlled selection state — the parent owns it. */
  isSelected: boolean
  /** Message emitted when the card requests a toggle. */
  onChange?: Msg
  isDisabled?: boolean
  children?: ReadonlyArray<Html | string>
  /** Internal padding on the astryx spacing scale.
      @default 4 (16px) */
  padding?: CardPadding
  /** @default 'default' */
  variant?: CardVariant
  /** @default 'none' */
  elevation?: CardElevation
  width?: string
  height?: string
  maxWidth?: string
  minHeight?: string
  class?: string
}>

export const selectableCard = <Msg>(
  props: SelectableCardProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = props.variant ?? 'default'
  const elevation = props.elevation ?? 'none'
  const padding = props.padding ?? 4
  const isDisabled = props.isDisabled === true
  const onChange = props.onChange

  return h.div(
    [
      h.DataAttribute('slot', 'selectable-card'),
      h.DataAttribute('variant', variant),
      h.DataAttribute('selected', props.isSelected ? 'true' : 'false'),
      h.DataAttribute('pressable-container', 'true'),
      h.Class(
        cn(
          cardSurfaceClass({
            variant,
            elevation,
            padding,
            withBorder: variant === 'default',
          }),
          'text-inherit',
          'transition-[box-shadow,border-color] duration-150 ease-out',
          isDisabled ? 'cursor-default opacity-50' : 'cursor-pointer',
          !isDisabled &&
            'after:absolute after:inset-0 after:rounded-[inherit] after:pointer-events-none after:bg-transparent after:transition-[background-color] after:duration-150 after:ease-out',
          !isDisabled &&
            `${HOVER_GUARD}hover:after:bg-foreground/5 active:after:bg-foreground/10`,
          props.isSelected && SELECTED_RING[variant],
          'has-[:focus-visible]:outline-solid has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring has-[:focus-visible]:outline-offset-3',
          props.class,
        ),
      ),
      ...(isDisabled ? [] : pressableAttributes(h, onChange)),
      ...(props.width === undefined ? [] : [h.Style({ width: props.width })]),
      ...(props.height === undefined
        ? []
        : [h.Style({ height: props.height })]),
      ...(props.maxWidth === undefined
        ? []
        : [h.Style({ maxWidth: props.maxWidth })]),
      ...(props.minHeight === undefined
        ? []
        : [h.Style({ minHeight: props.minHeight })]),
    ],
    [
      h.input([
        h.Class(SR_ONLY_CLASS),
        h.DataAttribute('pressable-control', 'true'),
        h.Type('checkbox'),
        h.Checked(props.isSelected),
        h.AriaLabel(props.label),
        ...(isDisabled ? [h.Disabled(true)] : []),
        ...(onChange === undefined || isDisabled
          ? []
          : [
              h.OnChange(() => onChange),
              // Space toggles the checkbox natively; astryx adds Enter as an
              // extra toggle key — the mount stream's listeners do not cover
              // keydown, so it is wired here.
              h.OnKeyDownPreventDefault(key =>
                key === 'Enter' ? Option.some(onChange) : Option.none(),
              ),
            ]),
      ]),
      ...(props.children ?? []),
    ],
  )
}
