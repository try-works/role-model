import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from './contracts'
import { className } from './style'
import { reset } from './reset'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import {
  collapseBreadcrumbItems,
  type BreadcrumbTrailItem,
} from '@/lib/breadcrumb'
export * from '@/lib/breadcrumb'
type Slot = Readonly<{
  layoutStyle?: ComponentLayoutStyle
  children: ReadonlyArray<Html | string>
}>
const styles = stylex.create({
  nav: {},
  list: {
    gap: { default: '0.375rem', '@media (min-width: 640px)': '0.625rem' },
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    overflowWrap: 'break-word',
  },
  item: { gap: '0.375rem', alignItems: 'center', display: 'inline-flex' },
  link: {
    color: { default: tokens.mutedForeground, ':hover': tokens.foreground },
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color',
  },
  page: { color: tokens.foreground, fontWeight: 400 },
  separator: { height: '0.875rem', width: '0.875rem' },
  separatorRtl: { transform: 'rotate(180deg)' },
  ellipsis: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    height: '2.25rem',
    width: '2.25rem',
  },
  iconSm: { height: '1rem', width: '1rem' },
  hidden: {
    margin: -1,
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
})
export type BreadcrumbProps = Slot &
  Readonly<{ ariaLabel?: string; direction?: 'ltr' | 'rtl' }>
export const breadcrumb = <Msg>(
  p: BreadcrumbProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.nav(
    [
      h.AriaLabel(p.ariaLabel ?? 'Breadcrumb'),
      ...(p.direction === undefined ? [] : [h.Dir(p.direction)]),
      h.DataAttribute('slot', 'breadcrumb'),
      h.Class(className(styles.nav, p.layoutStyle)),
    ],
    [...p.children],
  )
export const breadcrumbList = <Msg>(p: Slot, h: HtmlBuilder<Msg>): Html =>
  h.ol(
    [
      h.DataAttribute('slot', 'breadcrumb-list'),
      h.Class(className(reset.list, styles.list, p.layoutStyle)),
    ],
    [...p.children],
  )
export const breadcrumbItem = <Msg>(p: Slot, h: HtmlBuilder<Msg>): Html =>
  h.li(
    [
      h.DataAttribute('slot', 'breadcrumb-item'),
      h.Class(className(styles.item, p.layoutStyle)),
    ],
    [...p.children],
  )
export type BreadcrumbLinkProps = Slot & Readonly<{ href: string }>
export const breadcrumbLink = <Msg>(
  p: BreadcrumbLinkProps,
  h: HtmlBuilder<Msg>,
): Html =>
  h.a(
    [
      h.DataAttribute('slot', 'breadcrumb-link'),
      h.Href(p.href),
      h.Class(className(reset.link, styles.link, p.layoutStyle)),
    ],
    [...p.children],
  )
export const breadcrumbPage = <Msg>(p: Slot, h: HtmlBuilder<Msg>): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'breadcrumb-page'),
      h.AriaCurrent('page'),
      h.Class(className(styles.page, p.layoutStyle)),
    ],
    [...p.children],
  )
export type BreadcrumbSeparatorProps = Readonly<{
  layoutStyle?: ComponentLayoutStyle
  children?: ReadonlyArray<Html | string>
  direction?: 'ltr' | 'rtl'
}>
export const breadcrumbSeparator = <Msg>(
  p: BreadcrumbSeparatorProps = {},
  h: HtmlBuilder<Msg>,
): Html =>
  h.li(
    [
      h.DataAttribute('slot', 'breadcrumb-separator'),
      h.Role('presentation'),
      h.AriaHidden(true),
      h.Class(
        className(
          styles.separator,
          p.direction === 'rtl' && styles.separatorRtl,
          p.layoutStyle,
        ),
      ),
    ],
    p.children === undefined ? [Icon.chevronRight({}, h)] : [...p.children],
  )
export type BreadcrumbEllipsisProps = Readonly<{
  layoutStyle?: ComponentLayoutStyle
  label?: string
}>
export const breadcrumbEllipsis = <Msg>(
  p: BreadcrumbEllipsisProps = {},
  h: HtmlBuilder<Msg>,
): Html =>
  h.span(
    [
      h.DataAttribute('slot', 'breadcrumb-ellipsis'),
      h.Role('presentation'),
      h.Class(className(styles.ellipsis, p.layoutStyle)),
    ],
    [
      Icon.moreHorizontal({ class: className(styles.iconSm) }, h),
      h.span([h.Class(className(styles.hidden))], [p.label ?? 'More levels']),
    ],
  )

export type BreadcrumbTrailProps = Readonly<{
  items: ReadonlyArray<BreadcrumbTrailItem>
  maxItems?: number
  ariaLabel?: string
  direction?: 'ltr' | 'rtl'
  separator?: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle
}>
export const breadcrumbTrail = <Msg>(
  p: BreadcrumbTrailProps,
  h: HtmlBuilder<Msg>,
): Html => {
  const items = collapseBreadcrumbItems(p.items, p.maxItems),
    children: Array<Html> = []
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
            ...(p.separator === undefined ? {} : { children: p.separator }),
            ...(p.direction === undefined ? {} : { direction: p.direction }),
          },
          h,
        ),
      )
  })
  return breadcrumb(
    {
      children: [breadcrumbList({ children }, h)],
      ...(p.ariaLabel === undefined ? {} : { ariaLabel: p.ariaLabel }),
      ...(p.direction === undefined ? {} : { direction: p.direction }),
      ...(p.layoutStyle === undefined ? {} : { layoutStyle: p.layoutStyle }),
    },
    h,
  )
}
