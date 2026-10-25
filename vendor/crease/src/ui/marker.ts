import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

export const markerVariants = cva(
  "group/marker relative flex min-h-4 w-full items-center gap-2 text-left text-sm text-muted-foreground [&_svg:not([class*='size-'])]:size-4 [a]:underline [a]:underline-offset-3 [a]:hover:text-foreground",
  {
    variants: {
      variant: {
        default: '',
        separator:
          'before:mr-1 before:h-px before:min-w-0 before:flex-1 before:bg-border after:ml-1 after:h-px after:min-w-0 after:flex-1 after:bg-border',
        border: 'border-b border-border pb-2',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

type ChildrenProps = Readonly<{
  children: ReadonlyArray<Html | string>
  class?: string
}>
export type MarkerPurpose = 'annotation' | 'status' | 'decorative'

export const marker = <Msg>(
  props: ChildrenProps &
    Readonly<{
      variant?: VariantProps<typeof markerVariants>['variant']
      purpose?: MarkerPurpose
      ariaLabel?: string
      element?: 'div' | 'a' | 'button'
      href?: string
      onClick?: () => Msg
    }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = props.variant ?? 'default'
  const purpose = props.purpose ?? 'annotation'
  const element = props.element ?? 'div'
  const attrs = [
    h.DataAttribute('slot', 'marker'),
    h.DataAttribute('variant', variant ?? 'default'),
    h.DataAttribute('purpose', purpose),
    ...(purpose === 'decorative'
      ? [h.Role('none'), h.AriaHidden(true)]
      : [h.Role(purpose === 'status' ? 'status' : 'note')]),
    ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
    h.Class(
      cn(
        markerVariants({ variant }),
        element === 'a' && 'w-fit',
        element === 'button' &&
          'w-fit cursor-pointer transition-colors hover:text-foreground',
        props.class,
      ),
    ),
  ]
  switch (element) {
    case 'a':
      return h.a([...attrs, h.Href(props.href ?? '#')], [...props.children])
    case 'button':
      return h.button(
        [
          ...attrs,
          h.Type('button'),
          ...(props.onClick === undefined ? [] : [h.OnClick(props.onClick())]),
        ],
        [...props.children],
      )
    default:
      return h.div(attrs, [...props.children])
  }
}

export const markerIcon = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.span(
    [
      h.DataAttribute('slot', 'marker-icon'),
      h.AriaHidden(true),
      h.Class(
        cn("size-4 shrink-0 [&_svg:not([class*='size-'])]:size-4", props.class),
      ),
    ],
    [...props.children],
  )
}

export const markerContent = <Msg>(
  props: ChildrenProps & Readonly<{ shimmer?: boolean }>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.span(
    [
      h.DataAttribute('slot', 'marker-content'),
      h.Class(
        cn(
          'min-w-0 wrap-break-word group-data-[variant=separator]/marker:flex-none group-data-[variant=separator]/marker:text-center',
          props.shimmer === true ? 'shimmer' : undefined,
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}
