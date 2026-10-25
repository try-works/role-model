import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

type TextProps = Readonly<{
  children: ReadonlyArray<Html | string>
  class?: string
}>

export const typographyH1 = <Msg>(
  props: TextProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.h1(
    [
      h.DataAttribute('slot', 'typography-h1'),
      h.Class(
        cn(
          'scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const typographyH2 = <Msg>(
  props: TextProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.h2(
    [
      h.DataAttribute('slot', 'typography-h2'),
      h.Class(
        cn(
          'scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const typographyH3 = <Msg>(
  props: TextProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.h3(
    [
      h.DataAttribute('slot', 'typography-h3'),
      h.Class(
        cn('scroll-m-20 text-2xl font-semibold tracking-tight', props.class),
      ),
    ],
    [...props.children],
  )
}

export const typographyH4 = <Msg>(
  props: TextProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.h4(
    [
      h.DataAttribute('slot', 'typography-h4'),
      h.Class(
        cn('scroll-m-20 text-xl font-semibold tracking-tight', props.class),
      ),
    ],
    [...props.children],
  )
}

export const typographyP = <Msg>(
  props: TextProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.p(
    [
      h.DataAttribute('slot', 'typography-p'),
      h.Class(cn('leading-7 [&:not(:first-child)]:mt-6', props.class)),
    ],
    [...props.children],
  )
}

export const typographyBlockquote = <Msg>(
  props: TextProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.blockquote(
    [
      h.DataAttribute('slot', 'typography-blockquote'),
      h.Class(cn('mt-6 border-l-2 pl-6 italic', props.class)),
    ],
    [...props.children],
  )
}

export const typographyInlineCode = <Msg>(
  props: TextProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.code(
    [
      h.DataAttribute('slot', 'typography-inline-code'),
      h.Class(
        cn(
          'relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const typographyLead = <Msg>(
  props: TextProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.p(
    [
      h.DataAttribute('slot', 'typography-lead'),
      h.Class(cn('text-xl text-muted-foreground', props.class)),
    ],
    [...props.children],
  )
}

export const typographyLarge = <Msg>(
  props: TextProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.DataAttribute('slot', 'typography-large'),
      h.Class(cn('text-lg font-semibold', props.class)),
    ],
    [...props.children],
  )
}

export const typographySmall = <Msg>(
  props: TextProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.small(
    [
      h.DataAttribute('slot', 'typography-small'),
      h.Class(cn('text-sm leading-none font-medium', props.class)),
    ],
    [...props.children],
  )
}

export const typographyMuted = <Msg>(
  props: TextProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.p(
    [
      h.DataAttribute('slot', 'typography-muted'),
      h.Class(cn('text-sm text-muted-foreground', props.class)),
    ],
    [...props.children],
  )
}
