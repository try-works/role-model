import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  badgeToneVariant,
  itemLabels,
  overflowListFixtures,
  type OverflowListFixture,
} from '@/docs/components/pages/overflow-list/shared'
import * as Badge from '@/ui/badge'
import * as Button from '@/ui/button'
import * as MoreMenu from '@/ui/more-menu'
import * as OverflowList from '@/ui/overflow-list'

const GotListMessage = defineMessageUnion({
  GotListMessage: { message: OverflowList.Message },
})
const GotMenuMessage = defineMessageUnion({
  GotMenuMessage: { message: MoreMenu.Message },
})
const OverflowListPreviewMessage = S.Union([
  GotListMessage.GotListMessage,
  GotMenuMessage.GotMenuMessage,
])
type OverflowListPreviewMessage = typeof OverflowListPreviewMessage.Type
const OverflowListPreviewModel = S.Struct({
  _docsPage: S.Literal('overflow-list'),
  list: OverflowList.Model,
  menu: MoreMenu.Model,
  hiddenCount: S.Number,
})
type OverflowListPreviewModel = typeof OverflowListPreviewModel.Type

const renderItems = <Msg>(
  fixture: OverflowListFixture,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html | string> =>
  fixture.items.map(item =>
    item.kind === 'badge'
      ? Badge.badge(
          { variant: badgeToneVariant(item.tone), children: [item.label] },
          h,
        )
      : Button.button(
          {
            variant:
              item.variant === 'primary'
                ? 'default'
                : item.variant === 'destructive'
                  ? 'destructive'
                  : 'secondary',
            size: 'sm',
            children: [item.label],
          },
          h,
        ),
  )

const renderIndicator = <Msg>(
  fixture: OverflowListFixture,
  model: OverflowListPreviewModel,
  h: HtmlBuilder<OverflowListPreviewMessage>,
): ((items: ReadonlyArray<OverflowList.OverflowListItem>) => Html) => {
  const labels = itemLabels(fixture)
  switch (fixture.indicator) {
    case 'moreButton':
      return overflowItems =>
        Button.button(
          {
            variant: 'ghost',
            size: 'sm',
            children: [`+${String(overflowItems.length)} more`],
          },
          h,
        )
    case 'badge':
      return overflowItems =>
        Badge.badge(
          { variant: 'ghost', children: [`+${String(overflowItems.length)}`] },
          h,
        )
    case 'moreMenu':
      return overflowItems =>
        MoreMenu.moreMenu(
          {
            model: model.menu,
            toParentMessage: message =>
              GotMenuMessage.GotMenuMessage({ message }),
            icon: h.span(
              [h.Class('text-sm font-medium')],
              [`+${String(overflowItems.length)}`],
            ),
            items: overflowItems.map(({ index }) => ({
              label: labels[index] ?? '',
            })),
          },
          h,
        )
  }
}

const frame = (
  fixture: OverflowListFixture,
  inner: Html,
  h: HtmlBuilder<OverflowListPreviewMessage>,
): Html => {
  switch (fixture.container.kind) {
    case 'frame':
      return h.div(
        [
          h.Class('rounded-md border border-dashed border-border p-2'),
          h.Style({ maxWidth: `${String(fixture.container.maxWidth)}px` }),
        ],
        [inner],
      )
    case 'center':
      return h.div(
        [
          h.Class('mx-auto flex justify-center'),
          h.Style({ width: `${String(fixture.container.width)}px` }),
        ],
        [h.div([h.Class('w-full rounded-lg border bg-card p-2')], [inner])],
      )
    case 'card':
      return h.div(
        [
          h.Class('rounded-lg border bg-card p-2'),
          h.Style({
            resize: 'horizontal',
            overflow: 'hidden',
            width: `${String(fixture.container.width)}px`,
            minWidth: `${String(fixture.container.minWidth ?? 80)}px`,
            maxWidth: '100%',
          }),
        ],
        [inner],
      )
  }
}

export const overflowListTailwindPreviewProgram = definePreviewProgram<
  OverflowListPreviewModel,
  OverflowListPreviewMessage
>({
  Model: OverflowListPreviewModel,
  Message: OverflowListPreviewMessage,
  init: index => {
    const fixture = overflowListFixtures[index] ?? overflowListFixtures[0]
    return {
      _docsPage: 'overflow-list',
      list: OverflowList.init({
        itemCount: fixture.items.length,
        ...(fixture.collapseFrom === undefined
          ? {}
          : { collapseFrom: fixture.collapseFrom }),
      }),
      menu: MoreMenu.init({
        id: `docs-overflow-menu-${String(index)}`,
        isAnimated: false,
      }),
      hiddenCount: 0,
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotListMessage': {
        const listOp__ = OverflowList.update(model.list, message.message)
        const maybeHidden = Option.fromNullishOr(listOp__.outMessage)
        return {
          model: {
            ...model,
            list: listOp__.model,
            hiddenCount: Option.match(maybeHidden, {
              onNone: () => model.hiddenCount,
              onSome: changed => changed.hiddenIndices.length,
            }),
          },
        }
      }
      case 'GotMenuMessage': {
        const menuOp__ = MoreMenu.update(model.menu, message.message)
        const commands = menuOp__.commands ?? []
        return {
          model: { ...model, menu: menuOp__.model },
          commands: Command.mapMessages(commands, next =>
            GotMenuMessage.GotMenuMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = overflowListFixtures[index] ?? overflowListFixtures[0]
    return h.div(
      [h.Class('grid w-full justify-items-center gap-3')],
      [
        frame(
          fixture,
          OverflowList.overflowList(
            {
              model: model.list,
              toParentMessage: message =>
                GotListMessage.GotListMessage({ message }),
              gap: fixture.gap,
              ...(fixture.maxVisibleItems === undefined
                ? {}
                : { maxVisibleItems: fixture.maxVisibleItems }),
              ...(fixture.maxRows === undefined
                ? {}
                : { maxRows: fixture.maxRows }),
              ...(fixture.collapseFrom === undefined
                ? {}
                : { collapseFrom: fixture.collapseFrom }),
              ...(fixture.container.kind === 'card'
                ? { behavior: 'observeParent' as const }
                : {}),
              overflowRenderer: renderIndicator(fixture, model, h),
              children: renderItems(fixture, h),
            },
            h,
          ),
          h,
        ),
        h.p(
          [h.Role('status'), h.Class('text-sm text-muted-foreground')],
          [
            model.hiddenCount === 0
              ? 'Everything fits.'
              : `${String(model.hiddenCount)} item(s) collapsed.`,
          ],
        ),
      ],
    )
  },
})
