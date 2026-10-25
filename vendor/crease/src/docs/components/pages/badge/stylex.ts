import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  type BadgeItem,
  badgeFixtures,
  badgeStyleXPalette,
} from '@/docs/components/pages/badge/shared'
import { className } from '@/stylex/style'
import * as Icon from '@/lib/icon'
import * as Badge from '@/stylex/badge'
import * as Spinner from '@/stylex/spinner'

const styles = stylex.create({
  wrap: { gap: '0.5rem', display: 'flex', flexWrap: 'wrap' },
  wrapCentered: { justifyContent: 'center', width: '100%' },
  /* Custom-palette badges compose the badge base styles directly — the
     component's variant map is intentionally closed, so custom colors are
     authored as StyleX styles (light-dark() follows the app's color-scheme). */
  badgeBase: {
    borderColor: 'transparent',
    borderRadius: '2rem',
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.25rem',
    overflow: 'hidden',
    paddingBlock: '0.125rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1rem',
    whiteSpace: 'nowrap',
    height: '1.25rem',
    width: 'fit-content',
  },
})

const iconFor = <Msg>(item: BadgeItem, h: HtmlBuilder<Msg>): Array<Html> => {
  if (item.icon === undefined) return []
  const dataIcon =
    item.icon.position === 'start' ? 'inline-start' : 'inline-end'
  const icon =
    item.icon.name === 'badge-check'
      ? Icon.badgeCheck({ dataIcon }, h)
      : item.icon.name === 'bookmark'
        ? Icon.bookmark({ dataIcon }, h)
        : Icon.arrowUpRight({ dataIcon }, h)
  return [icon]
}

const badgeItem = <Msg>(item: BadgeItem, h: HtmlBuilder<Msg>): Html => {
  if (item.palette !== undefined) {
    return h.span(
      [
        h.Class(className(styles.badgeBase)),
        h.Style({
          backgroundColor: badgeStyleXPalette[item.palette].backgroundColor,
          color: badgeStyleXPalette[item.palette].color,
        }),
      ],
      [item.label],
    )
  }
  const iconInset =
    item.icon?.position === 'start' || item.spinner === 'start'
      ? 'start'
      : item.icon?.position === 'end' || item.spinner === 'end'
        ? 'end'
        : undefined
  return Badge.badge(
    {
      ...(item.variant === undefined ? {} : { variant: item.variant }),
      ...(item.href === undefined ? {} : { href: item.href }),
      ...(iconInset === undefined ? {} : { iconInset }),
      children: [
        ...(item.icon?.position === 'start' ? iconFor(item, h) : []),
        ...(item.spinner === 'start'
          ? [
              Spinner.spinner(
                { size: 'sm', isDecorative: true, dataIcon: 'inline-start' },
                h,
              ),
            ]
          : []),
        item.label,
        ...(item.spinner === 'end'
          ? [
              Spinner.spinner(
                { size: 'sm', isDecorative: true, dataIcon: 'inline-end' },
                h,
              ),
            ]
          : []),
        ...(item.icon?.position === 'end' ? iconFor(item, h) : []),
      ],
    },
    h,
  )
}

export const badgeStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = badgeFixtures[exampleIndex] ?? badgeFixtures[0]
  return h.div(
    [
      h.Class(
        className(
          styles.wrap,
          ...(fixture.centered ? [styles.wrapCentered] : []),
        ),
      ),
      ...(fixture.direction === 'rtl' ? [h.Dir('rtl')] : []),
    ],
    fixture.items.map(item => badgeItem(item, h)),
  )
}
