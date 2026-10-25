import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

export const buttonGroupVariants = cva(
  "flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
  {
    variants: {
      orientation: {
        horizontal:
          '[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none',
        vertical:
          'flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none',
      },
    },
    defaultVariants: {
      orientation: 'horizontal',
    },
  },
)

export type ButtonGroupVariants = VariantProps<typeof buttonGroupVariants>

export type ButtonGroupProps = Readonly<{
  children: ReadonlyArray<Html | string>
  orientation?: ButtonGroupVariants['orientation']
  class?: string
  ariaLabel?: string
}>

export const buttonGroup = <Msg>(
  props: ButtonGroupProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const orientation = props.orientation ?? 'horizontal'

  return h.div(
    [
      h.Role('group'),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      h.DataAttribute('slot', 'button-group'),
      h.DataAttribute('orientation', orientation),
      h.Class(cn(buttonGroupVariants({ orientation }), props.class)),
    ],
    [...props.children],
  )
}

export type ButtonGroupSeparatorProps = Readonly<{
  orientation?: 'horizontal' | 'vertical'
  class?: string
}>

export const buttonGroupSeparator = <Msg>(
  props: ButtonGroupSeparatorProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  const orientation = props.orientation ?? 'vertical'

  return h.div(
    [
      h.Role('none'),
      h.DataAttribute('slot', 'button-group-separator'),
      h.DataAttribute('orientation', orientation),
      h.Class(
        cn(
          'shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px',
          'relative m-0! self-stretch bg-input data-[orientation=vertical]:h-auto',
          props.class,
        ),
      ),
    ],
    [],
  )
}

export type ButtonGroupTextProps = Readonly<{
  children: ReadonlyArray<Html | string>
  class?: string
}>

export const buttonGroupText = <Msg>(
  props: ButtonGroupTextProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.Class(
        cn(
          "flex items-center gap-2 rounded-md border bg-muted px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4",
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}
