import { type VariantProps, cva } from 'class-variance-authority'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'
import { buttonVariants } from '@/ui/button'

export const attachmentVariants = cva(
  'group/attachment relative flex w-fit max-w-full min-w-0 shrink-0 flex-wrap rounded-xl border bg-card text-card-foreground transition-colors focus-within:ring-1 focus-within:ring-ring/50 has-[>a,>button]:hover:bg-muted/50 data-[state=error]:border-destructive/30 data-[state=idle]:border-dashed',
  {
    variants: {
      size: {
        default:
          'gap-2 text-sm has-data-[slot=attachment-content]:px-2.5 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:p-2',
        sm: 'gap-2.5 text-xs has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-1.5 has-data-[slot=attachment-media]:p-1.5',
        xs: 'gap-1.5 rounded-lg text-xs has-data-[slot=attachment-content]:px-1.5 has-data-[slot=attachment-content]:py-1 has-data-[slot=attachment-media]:p-1',
      },
      orientation: {
        horizontal: 'min-w-40 items-center',
        vertical: 'w-24 flex-col has-data-[slot=attachment-content]:w-30',
      },
    },
    defaultVariants: { size: 'default', orientation: 'horizontal' },
  },
)

type ChildrenProps = Readonly<{
  children: ReadonlyArray<Html | string>
  class?: string
}>
export type AttachmentState =
  | 'idle'
  | 'uploading'
  | 'processing'
  | 'error'
  | 'done'

export const attachment = <Msg>(
  props: ChildrenProps &
    Readonly<{
      state?: AttachmentState
      size?: VariantProps<typeof attachmentVariants>['size']
      orientation?: VariantProps<typeof attachmentVariants>['orientation']
    }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const state = props.state ?? 'done'
  const size = props.size ?? 'default'
  const orientation = props.orientation ?? 'horizontal'
  return h.div(
    [
      h.DataAttribute('slot', 'attachment'),
      h.DataAttribute('state', state),
      h.DataAttribute('size', size ?? 'default'),
      h.DataAttribute('orientation', orientation ?? 'horizontal'),
      h.Class(cn(attachmentVariants({ size, orientation }), props.class)),
    ],
    [...props.children],
  )
}

export const attachmentMedia = <Msg>(
  props: ChildrenProps & Readonly<{ variant?: 'icon' | 'image' }>,
  h: HtmlBuilder<Msg>,
): Html => {
  const variant = props.variant ?? 'icon'
  return h.div(
    [
      h.DataAttribute('slot', 'attachment-media'),
      h.DataAttribute('variant', variant),
      h.Class(
        cn(
          "relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-foreground group-data-[orientation=vertical]/attachment:w-full group-data-[size=sm]/attachment:w-8 group-data-[size=xs]/attachment:w-7 group-data-[size=xs]/attachment:rounded-md group-data-[state=error]/attachment:bg-destructive/10 group-data-[state=error]/attachment:text-destructive [&_svg:not([class*='size-'])]:size-4",
          variant === 'image' &&
            'opacity-60 group-data-[state=done]/attachment:opacity-100 *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

const attachmentPart = <Msg>(
  slot: string,
  base: string,
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [h.DataAttribute('slot', slot), h.Class(cn(base, props.class))],
    [...props.children],
  )
}
export const attachmentContent = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html =>
  attachmentPart<Msg>(
    'attachment-content',
    'max-w-full min-w-0 flex-1 leading-tight group-data-[orientation=vertical]/attachment:px-1',
    props,
    h,
  )
export const attachmentActions = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html =>
  attachmentPart<Msg>(
    'attachment-actions',
    'relative z-20 flex shrink-0 items-center group-data-[orientation=vertical]/attachment:absolute group-data-[orientation=vertical]/attachment:top-3 group-data-[orientation=vertical]/attachment:right-3 group-data-[orientation=vertical]/attachment:gap-1',
    props,
    h,
  )
export const attachmentAction = <Msg>(
  props: Readonly<{
    onClick: Msg
    label: string
    children: ReadonlyArray<Html | string>
    class?: string
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.OnClick(props.onClick),
      h.DataAttribute('slot', 'attachment-action'),
      h.AriaLabel(props.label),
      h.Class(
        cn(buttonVariants({ variant: 'ghost', size: 'icon-xs' }), props.class),
      ),
    ],
    [...props.children],
  )
export const attachmentGroup = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html =>
  attachmentPart<Msg>(
    'attachment-group',
    'flex min-w-0 snap-x snap-mandatory scroll-px-1 gap-3 overflow-x-auto overscroll-x-contain py-1 *:data-[slot=attachment]:flex-none *:data-[slot=attachment]:snap-start',
    props,
    h,
  )

export const attachmentTitle = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.span(
    [
      h.DataAttribute('slot', 'attachment-title'),
      h.Class(cn('block max-w-full min-w-0 truncate font-medium', props.class)),
    ],
    [...props.children],
  )
}
export const attachmentDescription = <Msg>(
  props: ChildrenProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.span(
    [
      h.DataAttribute('slot', 'attachment-description'),
      h.Class(
        cn(
          'mt-0.5 block min-w-0 max-w-full truncate text-xs text-muted-foreground group-data-[state=error]/attachment:text-destructive/80',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}
export const attachmentTrigger = <Msg>(
  props: Readonly<{ onClick: Msg; label: string; class?: string }>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.button(
    [
      h.Type('button'),
      h.OnClick(props.onClick),
      h.DataAttribute('slot', 'attachment-trigger'),
      h.AriaLabel(props.label),
      h.Class(
        cn(
          'absolute inset-0 z-10 outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          props.class,
        ),
      ),
    ],
    [],
  )
}
