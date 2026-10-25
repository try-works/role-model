import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

/* Ported from shadcn/ui badge.tsx (radix-vega) — cva config verbatim. Pure CSS
   component, no foldkit UI primitive underneath. Pass `href` to render the
   badge as an anchor (upstream `render={<a ...>}`). */
export const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary/80',
        secondary:
          'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
        outline:
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
        ghost:
          'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

export type BadgeVariants = VariantProps<typeof badgeVariants>

export type BadgeProps = Readonly<{
  children: ReadonlyArray<Html | string>
  variant?: BadgeVariants['variant']
  class?: string
  /** Renders the badge as an anchor pointing at this URL. */
  href?: string
}>

export const badge = <Msg>(props: BadgeProps, h: HtmlBuilder<Msg>): Html => {
  const variant = props.variant ?? 'default'
  const attributes = [
    h.DataAttribute('slot', 'badge'),
    h.DataAttribute('variant', variant),
    h.Class(cn(badgeVariants({ variant }), props.class)),
    ...(props.href === undefined ? [] : [h.Href(props.href)]),
  ]
  return props.href === undefined
    ? h.span(attributes, [...props.children])
    : h.a(attributes, [...props.children])
}
