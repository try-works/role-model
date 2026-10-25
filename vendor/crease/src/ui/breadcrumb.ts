import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'
import {
  collapseBreadcrumbItems,
  type BreadcrumbTrailItem,
} from '@/lib/breadcrumb'

export * from '@/lib/breadcrumb'

type Slot = Readonly<{
  class?: string
  children: ReadonlyArray<Html | string>
}>

export type BreadcrumbProps = Slot &
  Readonly<{
    ariaLabel?: string
    direction?: 'ltr' | 'rtl'
  }>

export const breadcrumb = <Msg>(
  props: BreadcrumbProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.nav(
    [
      h.AriaLabel(props.ariaLabel ?? 'Breadcrumb'),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
      h.DataAttribute('slot', 'breadcrumb'),
      h.Class(cn(props.class)),
    ],
    [...props.children],
  )
}

export const breadcrumbList = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html => {
  return h.ol(
    [
      h.DataAttribute('slot', 'breadcrumb-list'),
      h.Class(
        cn(
          'flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5',
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export const breadcrumbItem = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html => {
  return h.li(
    [
      h.DataAttribute('slot', 'breadcrumb-item'),
      h.Class(cn('inline-flex items-center gap-1.5', props.class)),
    ],
    [...props.children],
  )
}

export type BreadcrumbLinkProps = Slot &
  Readonly<{
    href: string
  }>

export const breadcrumbLink = <Msg>(
  props: BreadcrumbLinkProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.a(
    [
      h.DataAttribute('slot', 'breadcrumb-link'),
      h.Href(props.href),
      h.Class(cn('transition-colors hover:text-foreground', props.class)),
    ],
    [...props.children],
  )
}

export const breadcrumbPage = <Msg>(props: Slot, h: HtmlBuilder<Msg>): Html => {
  return h.span(
    [
      h.DataAttribute('slot', 'breadcrumb-page'),
      h.AriaCurrent('page'),
      h.Class(cn('font-normal text-foreground', props.class)),
    ],
    [...props.children],
  )
}

export type BreadcrumbSeparatorProps = Readonly<{
  class?: string
  children?: ReadonlyArray<Html | string>
  direction?: 'ltr' | 'rtl'
}>

export const breadcrumbSeparator = <Msg>(
  props: BreadcrumbSeparatorProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  return h.li(
    [
      h.DataAttribute('slot', 'breadcrumb-separator'),
      h.Role('presentation'),
      h.AriaHidden(true),
      h.Class(
        cn(
          '[&>svg]:size-3.5',
          props.direction === 'rtl' && '[&>svg]:rotate-180',
          props.class,
        ),
      ),
    ],
    props.children === undefined
      ? [Icon.chevronRight<Msg>({}, h)]
      : [...props.children],
  )
}

export type BreadcrumbTrailProps = Readonly<{
  items: ReadonlyArray<BreadcrumbTrailItem>
  maxItems?: number
  ariaLabel?: string
  direction?: 'ltr' | 'rtl'
  separator?: ReadonlyArray<Html | string>
  class?: string
}>

export const breadcrumbTrail = <Msg>(
  props: BreadcrumbTrailProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const items = collapseBreadcrumbItems(props.items, props.maxItems)
  const children: Array<Html> = []
  items.forEach((item, index) => {
    const content =
      item.kind === 'link'
        ? breadcrumbLink({ href: item.href, children: [item.label] }, h)
        : item.kind === 'page'
          ? breadcrumbPage({ children: [item.label] }, h)
          : breadcrumbEllipsis(
              item.label === undefined ? {} : { label: item.label },
              h,
            )
    children.push(breadcrumbItem({ children: [content] }, h))
    if (index < items.length - 1)
      children.push(
        breadcrumbSeparator(
          {
            ...(props.separator === undefined
              ? {}
              : { children: props.separator }),
            ...(props.direction === undefined
              ? {}
              : { direction: props.direction }),
          },
          h,
        ),
      )
  })
  return breadcrumb(
    {
      children: [breadcrumbList({ children }, h)],
      ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
      ...(props.direction === undefined ? {} : { direction: props.direction }),
      ...(props.class === undefined ? {} : { class: props.class }),
    },
    h,
  )
}

export type BreadcrumbEllipsisProps = Readonly<{
  class?: string
  label?: string
}>

export const breadcrumbEllipsis = <Msg>(
  props: BreadcrumbEllipsisProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  return h.span(
    [
      h.DataAttribute('slot', 'breadcrumb-ellipsis'),
      h.Role('presentation'),
      h.Class(cn('flex size-9 items-center justify-center', props.class)),
    ],
    [
      Icon.moreHorizontal<Msg>({ class: 'size-4' }, h),
      h.span([h.Class('sr-only')], [props.label ?? 'More levels']),
    ],
  )
}
