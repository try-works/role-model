import { Schema as S } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  type BadgeItem,
  badgeFixtures,
  badgeTailwindPaletteClass,
} from '@/docs/components/pages/badge/shared'
import * as Icon from '@/lib/icon'
import * as Badge from '@/ui/badge'
import * as Spinner from '@/ui/spinner'

const InteractedWithBadgePreview = defineMessageUnion({
  InteractedWithBadgePreview: {},
})
type InteractedWithBadgePreview = typeof InteractedWithBadgePreview.Type
const BadgePreviewModel = S.Struct({ _docsPage: S.Literal('badge') })
type BadgePreviewModel = typeof BadgePreviewModel.Type

const badgeItem = <Msg>(item: BadgeItem, h: HtmlBuilder<Msg>) =>
  Badge.badge(
    {
      ...(item.variant === undefined ? {} : { variant: item.variant }),
      ...(item.href === undefined ? {} : { href: item.href }),
      ...(item.palette === undefined
        ? {}
        : {
            class: badgeTailwindPaletteClass[item.palette],
          }),
      children: [
        ...(item.icon?.position === 'start'
          ? [
              item.icon.name === 'badge-check'
                ? Icon.badgeCheck({ dataIcon: 'inline-start' }, h)
                : item.icon.name === 'bookmark'
                  ? Icon.bookmark({ dataIcon: 'inline-start' }, h)
                  : Icon.arrowUpRight({ dataIcon: 'inline-start' }, h),
            ]
          : []),
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
        ...(item.icon?.position === 'end'
          ? [
              item.icon.name === 'badge-check'
                ? Icon.badgeCheck({ dataIcon: 'inline-end' }, h)
                : item.icon.name === 'bookmark'
                  ? Icon.bookmark({ dataIcon: 'inline-end' }, h)
                  : Icon.arrowUpRight({ dataIcon: 'inline-end' }, h),
            ]
          : []),
      ],
    },
    h,
  )

export const badgeTailwindPreviewProgram = definePreviewProgram<
  BadgePreviewModel,
  InteractedWithBadgePreview
>({
  Model: BadgePreviewModel,
  Message: InteractedWithBadgePreview,
  init: () => ({ _docsPage: 'badge' }),
  update: model => ({ model: model }),
  view: (index, _model, h) => {
    const fixture = badgeFixtures[index] ?? badgeFixtures[0]
    return h.div(
      [
        h.Class(
          fixture.centered
            ? 'flex w-full flex-wrap justify-center gap-2'
            : 'flex flex-wrap gap-2',
        ),
        ...(fixture.direction === 'rtl' ? [h.Dir('rtl')] : []),
      ],
      fixture.items.map(item => badgeItem(item, h)),
    )
  },
})
