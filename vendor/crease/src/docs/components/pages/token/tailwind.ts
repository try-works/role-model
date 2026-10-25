import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  tokenFixtures,
  type TokenItem,
} from '@/docs/components/pages/token/shared'
import * as Icon from '@/lib/icon'
import * as Badge from '@/ui/badge'
import * as Token from '@/ui/token'

const InteractedWithTokenPreview = defineMessageUnion({
  InteractedWithTokenPreview: {},
})
type InteractedWithTokenPreview = typeof InteractedWithTokenPreview.Type
const TokenPreviewModel = S.Struct({ _docsPage: S.Literal('token') })
type TokenPreviewModel = typeof TokenPreviewModel.Type

const NO_OP = InteractedWithTokenPreview.InteractedWithTokenPreview()

/* Literal icon names keep `icons:generate` statically scannable. */
const tokenIconMap: Record<
  NonNullable<TokenItem['icon']>,
  <M>(h: HtmlBuilder<M>) => Html
> = {
  user: h => Icon.icon('user', { class: 'size-3' }, h),
  star: h => Icon.icon('star', { class: 'size-3' }, h),
  tag: h => Icon.icon('tag', { class: 'size-3' }, h),
  'shield-check': h => Icon.icon('shield-check', { class: 'size-3' }, h),
}
const tokenIcon = (name: NonNullable<TokenItem['icon']>) => tokenIconMap[name]

const itemView = <Msg>(item: TokenItem, noop: Msg, h: HtmlBuilder<Msg>) =>
  Token.token(
    {
      label: item.label,
      ...(item.color === undefined ? {} : { color: item.color }),
      ...(item.size === undefined ? {} : { size: item.size }),
      ...(item.icon === undefined ? {} : { icon: tokenIcon(item.icon) }),
      ...(item.endContent === undefined
        ? {}
        : {
            endContent: [
              Badge.badge(
                { variant: 'secondary', children: [item.endContent] },
                h,
              ),
            ],
          }),
      ...(item.isDisabled === true ? { isDisabled: true } : {}),
      ...(item.hasClick === true ? { onClick: noop } : {}),
      ...(item.hasRemove === true ? { onRemove: noop } : {}),
    },
    h,
  )

export const tokenTailwindPreviewProgram = definePreviewProgram<
  TokenPreviewModel,
  InteractedWithTokenPreview
>({
  Model: TokenPreviewModel,
  Message: InteractedWithTokenPreview,
  init: () => ({ _docsPage: 'token' }),
  update: model => ({ model: model }),
  view: (index, _model, h) => {
    const fixture = tokenFixtures[index] ?? tokenFixtures[0]
    const noop = NO_OP as never
    const singleSection =
      fixture.sections.length === 1 ? fixture.sections[0] : undefined
    if (singleSection !== undefined && singleSection.label === '')
      return h.div(
        [h.Class('flex flex-wrap items-center gap-2')],
        singleSection.items.map(item => itemView(item, noop, h)),
      )
    return h.div(
      [h.Class('flex flex-col gap-10')],
      fixture.sections.map(section =>
        h.div(
          [h.Class('flex flex-col gap-2')],
          [
            h.span([h.Class('text-xs text-muted-foreground')], [section.label]),
            h.div(
              [h.Class('flex flex-wrap gap-1')],
              section.items.map(item => itemView(item, noop, h)),
            ),
          ],
        ),
      ),
    )
  },
})
