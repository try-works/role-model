import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  fixtureOptions,
  moreMenuFixtures,
} from '@/docs/components/pages/more-menu/shared'
import * as Icon from '@/lib/icon'
import * as MoreMenu from '@/ui/more-menu'

const GotMoreMenuMessage = defineMessageUnion({
  GotMoreMenuMessage: { message: MoreMenu.Message },
})
type GotMoreMenuMessage = typeof GotMoreMenuMessage.Type
const MoreMenuPreviewModel = S.Struct({
  _docsPage: S.Literal('more-menu'),
  menu: MoreMenu.Model,
  maybeLastAction: S.Option(S.String),
})
type MoreMenuPreviewModel = typeof MoreMenuPreviewModel.Type

export const moreMenuTailwindPreviewProgram = definePreviewProgram<
  MoreMenuPreviewModel,
  GotMoreMenuMessage
>({
  Model: MoreMenuPreviewModel,
  Message: GotMoreMenuMessage,
  init: index => ({
    _docsPage: 'more-menu',
    menu: MoreMenu.init({
      id: `docs-more-menu-${String(index)}`,
      isAnimated: false,
    }),
    maybeLastAction: Option.none(),
  }),
  update: (model, message) => {
    const menuOp__ = MoreMenu.update(model.menu, message.message)
    const menu = menuOp__.model
    const commands = menuOp__.commands ?? []
    const maybeSelection = Option.fromNullishOr(menuOp__.outMessage)
    return {
      model: {
        ...model,
        menu,
        maybeLastAction: Option.match(maybeSelection, {
          onNone: () => model.maybeLastAction,
          onSome: selection => Option.some(selection.value),
        }),
      },
      commands: Command.mapMessages(commands, next =>
        GotMoreMenuMessage.GotMoreMenuMessage({ message: next }),
      ),
    }
  },
  view: (index, model, h) => {
    const fixture = moreMenuFixtures[index] ?? moreMenuFixtures[0]
    return h.div(
      [h.Class('grid justify-items-center gap-3')],
      [
        MoreMenu.moreMenu(
          {
            model: model.menu,
            toParentMessage: message =>
              GotMoreMenuMessage.GotMoreMenuMessage({ message }),
            items: fixtureOptions(fixture, name =>
              Icon.icon(name, { class: 'size-4' }, h),
            ),
            ...(fixture.variant === undefined
              ? {}
              : { variant: fixture.variant }),
            ...(fixture.label === undefined ? {} : { label: fixture.label }),
          },
          h,
        ),
        h.p(
          [h.Role('status'), h.Class('text-sm text-muted-foreground')],
          [
            Option.match(model.maybeLastAction, {
              onNone: () => 'No action selected.',
              onSome: action => `Selected: ${action}`,
            }),
          ],
        ),
      ],
    )
  },
})
