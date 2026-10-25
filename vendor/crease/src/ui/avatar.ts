import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { cn } from '@/lib/utils'

export const Model = S.Struct({
  status: S.Literals(['loading', 'loaded', 'error']),
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  Loaded: {},
  Failed: {},
})
export type Message = typeof Message.Type
export const init = (): Model => ({ status: 'loading' })
export const update = (_model: Model, message: Message): Model => ({
  status: message._tag === 'Loaded' ? 'loaded' : 'error',
})

export type AvatarProps = Readonly<{
  size?: 'default' | 'sm' | 'lg'
  class?: string
  children: ReadonlyArray<Html | string>
}>

export const avatar = <Msg>(props: AvatarProps, h: HtmlBuilder<Msg>): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'avatar'),
      h.DataAttribute('size', props.size ?? 'default'),
      h.Class(
        cn(
          'group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export type AvatarImageProps = Readonly<{
  src: string
  alt: string
  class?: string
  model?: Model
}>

export const avatarImage = <Msg>(
  props: AvatarImageProps &
    Readonly<{ toParentMessage?: (message: Message) => Msg }>,
  h: HtmlBuilder<Msg>,
): Html => {
  if (props.model?.status === 'error') return h.empty

  return h.img([
    h.DataAttribute('slot', 'avatar-image'),
    h.Src(props.src),
    h.Alt(props.alt),
    ...(props.toParentMessage === undefined
      ? []
      : [
          h.OnLoad(props.toParentMessage(Message.Loaded())),
          h.OnError(props.toParentMessage(Message.Failed())),
        ]),
    ...(props.model?.status === 'loaded'
      ? []
      : [h.DataAttribute('loading', '')]),
    h.Class(
      cn(
        'relative z-10 aspect-square size-full data-[loading]:opacity-0',
        props.class,
      ),
    ),
  ])
}

export type AvatarFallbackProps = Readonly<{
  class?: string
  children: ReadonlyArray<Html | string>
  model?: Model
}>

export const avatarFallback = <Msg>(
  props: AvatarFallbackProps,
  h: HtmlBuilder<Msg>,
): Html => {
  if (props.model?.status === 'loaded') return h.empty

  return h.div(
    [
      h.DataAttribute('slot', 'avatar-fallback'),
      h.Class(
        cn(
          'absolute inset-0 flex size-full items-center justify-center rounded-full bg-muted text-sm text-foreground group-data-[size=sm]/avatar:text-xs',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export type AvatarBadgeProps = Readonly<{
  class?: string
  children?: ReadonlyArray<Html | string>
}>

export const avatarBadge = <Msg>(
  props: AvatarBadgeProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.span(
    [
      h.DataAttribute('slot', 'avatar-badge'),
      h.Class(
        cn(
          'absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground bg-blend-color ring-2 ring-background select-none',
          'group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden',
          'group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2',
          'group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
          props.class,
        ),
      ),
    ],
    [...(props.children ?? [])],
  )
}

export type AvatarGroupProps = Readonly<{
  class?: string
  children: ReadonlyArray<Html | string>
}>

export const avatarGroup = <Msg>(
  props: AvatarGroupProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'avatar-group'),
      h.Class(
        cn(
          'group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export type AvatarGroupCountProps = Readonly<{
  class?: string
  children: ReadonlyArray<Html | string>
}>

export const avatarGroupCount = <Msg>(
  props: AvatarGroupCountProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'avatar-group-count'),
      h.Class(
        cn(
          'relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}
