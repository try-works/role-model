import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Button as ButtonPrimitive } from '@foldkit/ui'

import { cn } from '@/lib/utils'

export const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] motion-reduce:transition-none outline-none hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-[pressed=true]:bg-accent aria-[pressed=true]:text-accent-foreground dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline:
          'border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-9 min-w-9 px-2',
        sm: 'h-8 min-w-8 px-1.5',
        lg: 'h-10 min-w-10 px-2.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ToggleVariants = VariantProps<typeof toggleVariants>

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
  class?: string
}>

export const toggle = <Msg>(
  props: ToggleProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  return ButtonPrimitive.view(
    {
      onClick: props.onToggle,
      isDisabled: props.isDisabled ?? false,
      type: 'button',
      toView: ({ button }) =>
        h.button(
          [
            ...button,
            h.DataAttribute('slot', 'toggle'),
            h.DataAttribute('size', props.size ?? 'default'),
            h.AriaPressed(props.isPressed ? 'true' : 'false'),
            ...(props.id === undefined ? [] : [h.Id(props.id)]),
            ...(props.ariaLabel === undefined
              ? []
              : [h.AriaLabel(props.ariaLabel)]),
            ...(props.describedBy === undefined
              ? []
              : [h.AriaDescribedBy(props.describedBy)]),
            ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
            h.Class(
              cn(
                toggleVariants({
                  variant: props.variant ?? 'default',
                  size: props.size ?? 'default',
                }),
                props.class,
              ),
            ),
          ],
          [...props.children],
        ),
    },
    h,
  )
}
