import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/lib/icon'
import type { ButtonSize } from './contracts'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import {
  normalizePagination,
  paginationItems,
  type PaginationRecipeProps,
} from '@/lib/pagination'

export * from '@/lib/pagination'

type SlotProps = Readonly<{
  children: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
  ariaLabel?: string
  direction?: 'ltr' | 'rtl'
}>

const styles = stylex.create({
  active: {
    borderColor: tokens.border,
    backgroundColor: { default: tokens.background, ':hover': tokens.muted },
    boxShadow: tokens.shadowSm,
    color: { default: tokens.foreground, ':hover': tokens.foreground },
  },
  actionActive: {
    backgroundColor: { default: tokens.background, ':hover': tokens.muted },
    boxShadow: tokens.shadowSm,
    color: { default: tokens.foreground, ':hover': tokens.foreground },
  },
  directionLink: { gap: '0.25rem', paddingInline: '0.625rem' },
  disabled: {
    cursor: interactionTokens.cursorDisabled,
    opacity: 0.5,
    pointerEvents: 'none',
  },
  content: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'row',
  },
  ellipsis: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    height: '2.25rem',
    width: '2.25rem',
  },
  ellipsisIcon: { height: '1rem', width: '1rem' },
  iconSize: { flexShrink: 0, height: '1rem', width: '1rem' },
  labelSpan: {
    display: { default: 'none', '@media (min-width: 640px)': 'block' },
  },
  link: {
    borderColor: tokens.transparent,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundClip: 'padding-box',
    backgroundColor: { default: tokens.transparent, ':hover': tokens.muted },
    color: { default: tokens.foreground, ':hover': tokens.foreground },
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    textDecorationLine: 'none',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  nav: {
    marginInline: 'auto',
    display: 'flex',
    justifyContent: 'center',
    width: '100%',
  },
  sizeDefault: {
    gap: '0.375rem',
    paddingInline: '0.625rem',
    height: '2.25rem',
  },
  sizeIcon: { height: '2.25rem', width: '2.25rem' },
  sizeLg: { gap: '0.375rem', paddingInline: '0.625rem', height: '2.5rem' },
  sizeSm: { gap: '0.25rem', paddingInline: '0.625rem', height: '2rem' },
  srOnly: {
    margin: -1,
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: 1,
    width: 1,
  },
})

const sizes = {
  default: styles.sizeDefault,
  sm: styles.sizeSm,
  lg: styles.sizeLg,
  icon: styles.sizeIcon,
} as const

export const pagination = <Msg>(props: SlotProps, h: HtmlBuilder<Msg>): Html =>
  h.nav(
    [
      h.Role('navigation'),
      h.AriaLabel(props.ariaLabel ?? 'Pagination'),
      h.DataAttribute('slot', 'pagination'),
      ...(props.direction === undefined ? [] : [h.Dir(props.direction)]),
      h.Class(className(styles.nav, props.layoutStyle)),
    ],
    [...props.children],
  )
export const paginationContent = <Msg>(
  props: SlotProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.ul(
    [
      h.DataAttribute('slot', 'pagination-content'),
      h.Class(className(reset.list, styles.content, props.layoutStyle)),
    ],
    [...props.children],
  )
export const paginationItem = <Msg>(
  props: SlotProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.li(
    [
      h.DataAttribute('slot', 'pagination-item'),
      h.Class(className(props.layoutStyle)),
    ],
    [...props.children],
  )

export type PaginationLinkSize = Extract<
  ButtonSize,
  'default' | 'sm' | 'lg' | 'icon'
>

export type PaginationLinkProps = Readonly<{
  href: string
  children: ReadonlyArray<Html | string>
  isActive?: boolean
  size?: PaginationLinkSize
  ariaLabel?: string
  layoutStyle?: ComponentLayoutStyle
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
        className(
          reset.link,
          styles.link,
          sizes[props.size ?? 'icon'],
          isActive && styles.active,
          props.layoutStyle,
        ),
      ),
    ],
    [...props.children],
  )
}

export type PaginationDirectionProps = Readonly<{
  href?: string
  isDisabled?: boolean
  layoutStyle?: ComponentLayoutStyle
  direction?: 'ltr' | 'rtl'
  label?: string
}>
export const paginationPrevious = <Msg>(
  props: PaginationDirectionProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const icon =
    props.direction === 'rtl'
      ? Icon.chevronRight<Msg>({ class: className(styles.iconSize) }, h)
      : Icon.chevronLeft<Msg>({ class: className(styles.iconSize) }, h)
  const label = props.label ?? 'Previous'
  return props.isDisabled === true || props.href === undefined
    ? h.span(
        [
          h.Role('link'),
          h.AriaDisabled(true),
          h.Tabindex(-1),
          h.AriaLabel('Go to previous page'),
          h.DataAttribute('slot', 'pagination-previous'),
          h.Class(
            className(
              styles.link,
              styles.sizeDefault,
              styles.directionLink,
              styles.disabled,
              props.layoutStyle,
            ),
          ),
        ],
        [icon, h.span([h.Class(className(styles.labelSpan))], [label])],
      )
    : paginationLink(
        {
          href: props.href,
          ariaLabel: 'Go to previous page',
          size: 'default',
          layoutStyle: (props.layoutStyle === undefined
            ? styles.directionLink
            : {
                ...styles.directionLink,
                ...props.layoutStyle,
              }) as ComponentLayoutStyle,
          children: [
            icon,
            h.span([h.Class(className(styles.labelSpan))], [label]),
          ],
        },
        h,
      )
}
export const paginationNext = <Msg>(
  props: PaginationDirectionProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const icon =
    props.direction === 'rtl'
      ? Icon.chevronLeft<Msg>({ class: className(styles.iconSize) }, h)
      : Icon.chevronRight<Msg>({ class: className(styles.iconSize) }, h)
  const label = props.label ?? 'Next'
  return props.isDisabled === true || props.href === undefined
    ? h.span(
        [
          h.Role('link'),
          h.AriaDisabled(true),
          h.Tabindex(-1),
          h.AriaLabel('Go to next page'),
          h.DataAttribute('slot', 'pagination-next'),
          h.Class(
            className(
              styles.link,
              styles.sizeDefault,
              styles.directionLink,
              styles.disabled,
              props.layoutStyle,
            ),
          ),
        ],
        [h.span([h.Class(className(styles.labelSpan))], [label]), icon],
      )
    : paginationLink(
        {
          href: props.href,
          ariaLabel: 'Go to next page',
          size: 'default',
          layoutStyle: (props.layoutStyle === undefined
            ? styles.directionLink
            : {
                ...styles.directionLink,
                ...props.layoutStyle,
              }) as ComponentLayoutStyle,
          children: [
            h.span([h.Class(className(styles.labelSpan))], [label]),
            icon,
          ],
        },
        h,
      )
}

export type PaginationEllipsisProps = Readonly<{
  layoutStyle?: ComponentLayoutStyle
}>
export const paginationEllipsis = <Msg>(
  props: PaginationEllipsisProps = {},
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.AriaHidden(true),
      h.DataAttribute('slot', 'pagination-ellipsis'),
      h.Class(className(styles.ellipsis, props.layoutStyle)),
    ],
    [
      Icon.moreHorizontal<Msg>({ class: className(styles.ellipsisIcon) }, h),
      h.span([h.Class(className(styles.srOnly))], ['More pages']),
    ],
  )

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
        className(
          reset.button,
          styles.link,
          styles.sizeIcon,
          page === current && styles.actionActive,
        ),
      ),
    ],
    [String(page)],
  )
const actionDirection = <Msg>(
  direction: 'previous' | 'next',
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
        className(
          reset.button,
          styles.link,
          styles.sizeDefault,
          styles.directionLink,
        ),
      ),
    ],
    direction === 'previous'
      ? [
          Icon.chevronLeft<Msg>({ class: className(styles.iconSize) }, h),
          h.span([h.Class(className(styles.labelSpan))], ['Previous']),
        ]
      : [
          h.span([h.Class(className(styles.labelSpan))], ['Next']),
          Icon.chevronRight<Msg>({ class: className(styles.iconSize) }, h),
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
  const previous = normalized.page - 1,
    next = normalized.page + 1
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
                          previous < 1
                            ? { isDisabled: true }
                            : { href: props.navigation.href(previous) },
                          h,
                        )
                      : actionDirection(
                          'previous',
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
                          next > normalized.totalPages
                            ? { isDisabled: true }
                            : { href: props.navigation.href(next) },
                          h,
                        )
                      : actionDirection(
                          'next',
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
