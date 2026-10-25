import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import { buttonVariants, type ButtonVariants } from '@/ui/button'
import { cn } from '@/lib/utils'
import {
  normalizePagination,
  paginationItems,
  type PaginationRecipeProps,
} from '@/lib/pagination'

export * from '@/lib/pagination'

type SlotProps = Readonly<{
  children: ReadonlyArray<Html | string>
  class?: string
  ariaLabel?: string
  direction?: 'ltr' | 'rtl'
}>

export const pagination = <Msg>(
  props: SlotProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.nav(
    [
      h.Role('navigation'),
      h.AriaLabel(props.ariaLabel ?? 'Pagination'),
      h.DataAttribute('slot', 'pagination'),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
      h.Class(cn('mx-auto flex w-full justify-center', props.class)),
    ],
    [...props.children],
  )
}

export const paginationContent = <Msg>(
  props: SlotProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.ul(
    [
      h.DataAttribute('slot', 'pagination-content'),
      h.Class(cn('flex flex-row items-center gap-1', props.class)),
    ],
    [...props.children],
  )
}

export const paginationItem = <Msg>(
  props: SlotProps,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.li(
    [h.DataAttribute('slot', 'pagination-item'), h.Class(cn(props.class))],
    [...props.children],
  )
}

export type PaginationLinkProps = Readonly<{
  href: string
  children: ReadonlyArray<Html | string>
  isActive?: boolean
  size?: ButtonVariants['size']
  ariaLabel?: string
  class?: string
}>

export const paginationLink = <Msg>(
  props: PaginationLinkProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const isActive = props.isActive ?? false

  return h.a(
    [
      h.Href(props.href),
      ...(isActive ? [h.AriaCurrent('page')] : []),
      ...(props.ariaLabel === undefined ? [] : [h.AriaLabel(props.ariaLabel)]),
      h.DataAttribute('slot', 'pagination-link'),
      ...(isActive ? [h.DataAttribute('active', 'true')] : []),
      h.Class(
        cn(
          buttonVariants({
            variant: isActive ? 'outline' : 'ghost',
            size: props.size ?? 'icon',
          }),
          props.class,
        ),
      ),
    ],
    [...props.children],
  )
}

export type PaginationDirectionProps = Readonly<{
  href?: string
  isDisabled?: boolean
  class?: string
  direction?: 'ltr' | 'rtl'
  label?: string
}>

export const paginationPrevious = <Msg>(
  props: PaginationDirectionProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const rtl = props.direction === 'rtl'
  const icon = rtl
    ? Icon.chevronRight<Msg>({}, h)
    : Icon.chevronLeft<Msg>({}, h)
  const label = props.label ?? 'Previous'
  if (props.isDisabled === true || props.href === undefined)
    return h.span(
      [
        h.Role('link'),
        h.AriaDisabled(true),
        h.Tabindex(-1),
        h.AriaLabel('Go to previous page'),
        h.DataAttribute('slot', 'pagination-previous'),
        h.Class(
          cn(
            buttonVariants({ variant: 'ghost', size: 'default' }),
            'gap-1 px-2.5 opacity-50 sm:pl-2.5',
            props.class,
          ),
        ),
      ],
      [icon, h.span([h.Class('hidden sm:block')], [label])],
    )
  return paginationLink<Msg>(
    {
      href: props.href,
      ariaLabel: 'Go to previous page',
      size: 'default',
      class: cn('gap-1 px-2.5 sm:pl-2.5', props.class),
      children: [icon, h.span([h.Class('hidden sm:block')], [label])],
    },
    h,
  )
}

export const paginationNext = <Msg>(
  props: PaginationDirectionProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const rtl = props.direction === 'rtl'
  const icon = rtl
    ? Icon.chevronLeft<Msg>({}, h)
    : Icon.chevronRight<Msg>({}, h)
  const label = props.label ?? 'Next'
  if (props.isDisabled === true || props.href === undefined)
    return h.span(
      [
        h.Role('link'),
        h.AriaDisabled(true),
        h.Tabindex(-1),
        h.AriaLabel('Go to next page'),
        h.DataAttribute('slot', 'pagination-next'),
        h.Class(
          cn(
            buttonVariants({ variant: 'ghost', size: 'default' }),
            'gap-1 px-2.5 opacity-50 sm:pr-2.5',
            props.class,
          ),
        ),
      ],
      [h.span([h.Class('hidden sm:block')], [label]), icon],
    )
  return paginationLink<Msg>(
    {
      href: props.href,
      ariaLabel: 'Go to next page',
      size: 'default',
      class: cn('gap-1 px-2.5 sm:pr-2.5', props.class),
      children: [h.span([h.Class('hidden sm:block')], [label]), icon],
    },
    h,
  )
}

export type PaginationEllipsisProps = Readonly<{
  class?: string
}>

export const paginationEllipsis = <Msg>(
  props: PaginationEllipsisProps = {},
  h: HtmlBuilder<Msg>,
): Html => {
  return h.span(
    [
      h.AriaHidden(true),
      h.DataAttribute('slot', 'pagination-ellipsis'),
      h.Class(cn('flex size-9 items-center justify-center', props.class)),
    ],
    [
      Icon.moreHorizontal<Msg>({ class: 'size-4' }, h),
      h.span([h.Class('sr-only')], ['More pages']),
    ],
  )
}

const actionButton = <Msg>(
  page: number,
  current: number,
  label: string,
  message: Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.OnClick(message),
      h.AriaLabel(label),
      ...(page === current
        ? [h.AriaCurrent('page'), h.DataAttribute('active', 'true')]
        : []),
      h.DataAttribute('slot', 'pagination-button'),
      h.Class(
        buttonVariants({
          variant: page === current ? 'outline' : 'ghost',
          size: 'icon',
        }),
      ),
    ],
    [String(page)],
  )

const actionDirection = <Msg>(
  direction: 'previous' | 'next',
  page: number,
  disabled: boolean,
  message: Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.Disabled(disabled),
      h.OnClick(message),
      h.AriaLabel(`Go to ${direction} page`),
      h.DataAttribute('slot', `pagination-${direction}`),
      h.Class(
        cn(
          buttonVariants({ variant: 'ghost', size: 'default' }),
          'gap-1 px-2.5',
        ),
      ),
    ],
    direction === 'previous'
      ? [
          Icon.chevronLeft<Msg>({}, h),
          h.span([h.Class('hidden sm:block')], ['Previous']),
        ]
      : [
          h.span([h.Class('hidden sm:block')], ['Next']),
          Icon.chevronRight<Msg>({}, h),
        ],
  )

export const paginationPages = <Msg>(
  props: PaginationRecipeProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const normalized = normalizePagination(props)
  const navigate = (page: number, label: string): Html =>
    props.navigation.kind === 'link'
      ? paginationLink(
          {
            href: props.navigation.href(page),
            isActive: page === normalized.page,
            ariaLabel: label,
            children: [String(page)],
          },
          h,
        )
      : actionButton(
          page,
          normalized.page,
          label,
          props.navigation.onNavigate(page),
          h,
        )
  const previous = normalized.page - 1
  const next = normalized.page + 1
  return pagination(
    {
      ...(props.ariaLabel === undefined ? {} : { ariaLabel: props.ariaLabel }),
      children: [
        paginationContent(
          {
            children: [
              paginationItem(
                {
                  children: [
                    props.navigation.kind === 'link'
                      ? paginationPrevious(
                          {
                            ...(previous < 1
                              ? { isDisabled: true }
                              : { href: props.navigation.href(previous) }),
                          },
                          h,
                        )
                      : actionDirection(
                          'previous',
                          previous,
                          previous < 1,
                          props.navigation.onNavigate(Math.max(1, previous)),
                          h,
                        ),
                  ],
                },
                h,
              ),
              ...paginationItems(normalized).map(item =>
                paginationItem(
                  {
                    children: [
                      typeof item === 'number'
                        ? navigate(
                            item,
                            item === normalized.page
                              ? `Page ${String(item)}, current page`
                              : `Go to page ${String(item)}`,
                          )
                        : paginationEllipsis({}, h),
                    ],
                  },
                  h,
                ),
              ),
              paginationItem(
                {
                  children: [
                    props.navigation.kind === 'link'
                      ? paginationNext(
                          {
                            ...(next > normalized.totalPages
                              ? { isDisabled: true }
                              : { href: props.navigation.href(next) }),
                          },
                          h,
                        )
                      : actionDirection(
                          'next',
                          next,
                          next > normalized.totalPages,
                          props.navigation.onNavigate(
                            Math.min(normalized.totalPages, next),
                          ),
                          h,
                        ),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}
