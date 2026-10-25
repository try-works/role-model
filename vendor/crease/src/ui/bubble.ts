import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

export const bubbleVariants = cva(
  'group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full',
  {
    variants: {
      variant: {
        default:
          '*:data-[slot=bubble-content]:bg-primary *:data-[slot=bubble-content]:text-primary-foreground',
        secondary:
          '*:data-[slot=bubble-content]:bg-secondary *:data-[slot=bubble-content]:text-secondary-foreground',
        muted: '*:data-[slot=bubble-content]:bg-muted',
        tinted:
          '*:data-[slot=bubble-content]:bg-primary/10 *:data-[slot=bubble-content]:text-foreground',
        outline:
          '*:data-[slot=bubble-content]:border-border *:data-[slot=bubble-content]:bg-background',
        ghost:
          'border-none *:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:p-0',
        destructive:
          '*:data-[slot=bubble-content]:bg-destructive/10 *:data-[slot=bubble-content]:text-destructive',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type BubbleVariant = VariantProps<typeof bubbleVariants>['variant']

type ChildrenProps = Readonly<{
  children: ReadonlyArray<Html | string>
  class?: string
}>

export const bubbleGroup = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'bubble-group'),
      h.Class(cn('flex min-w-0 flex-col gap-2', props.class)),
    ],
    [...props.children],
  )
}

export const bubble = <Msg>(
  props: ChildrenProps &
    Readonly<{ variant?: BubbleVariant; align?: 'start' | 'end' }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = props.variant ?? 'default'
  const align = props.align ?? 'start'
  return h.div(
    [
      h.DataAttribute('slot', 'bubble'),
      h.DataAttribute('variant', variant ?? 'default'),
      h.DataAttribute('align', align),
      h.Class(cn(bubbleVariants({ variant }), props.class)),
    ],
    [...props.children],
  )
}

export const bubbleContent = <Msg>(
  props: ChildrenProps & Readonly<{ onClick?: Msg }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const base =
    'w-fit max-w-full min-w-0 overflow-hidden rounded-xl border border-transparent px-3 py-2 text-sm leading-relaxed wrap-break-word group-data-[align=end]/bubble:self-end'
  return props.onClick === undefined
    ? h.div(
        [
          h.DataAttribute('slot', 'bubble-content'),
          h.Class(cn(base, props.class)),
        ],
        [...props.children],
      )
    : h.button(
        [
          h.DataAttribute('slot', 'bubble-content'),
          h.Class(cn(base, 'cursor-pointer text-left', props.class)),
          h.Type('button'),
          h.OnClick(props.onClick),
        ],
        [...props.children],
      )
}

export const bubbleReactions = <Msg>(
  props: ChildrenProps &
    Readonly<{
      side?: 'top' | 'bottom'
      align?: 'start' | 'end'
      ariaLabel?: string
    }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const side = props.side ?? 'bottom'
  const align = props.align ?? 'end'
  return h.div(
    [
      h.DataAttribute('slot', 'bubble-reactions'),
      h.DataAttribute('side', side),
      h.DataAttribute('align', align),
      ...(props.ariaLabel === undefined
        ? []
        : [h.Role('img'), h.AriaLabel(props.ariaLabel)]),
      h.Class(
        cn(
          'absolute z-10 flex w-fit shrink-0 items-center justify-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-sm ring-3 ring-card',
          side === 'top'
            ? 'top-0 -translate-y-3/4'
            : 'bottom-0 translate-y-3/4',
          align === 'start' ? 'left-3' : 'right-3',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}
