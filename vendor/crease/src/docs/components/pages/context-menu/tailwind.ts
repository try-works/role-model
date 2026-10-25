import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  checkboxValues,
  contextMenuFixtures,
  fixtureItems,
  fixtureLabel,
  radioValuesFor,
} from '@/docs/components/pages/context-menu/shared'
import { resolveItemConfig } from '@/docs/components/pages/dropdown-menu/shared'
import * as ContextMenu from '@/ui/context-menu'
import * as Icon from '@/lib/icon'

const GotContextMenuMessage = defineMessageUnion({
  GotContextMenuMessage: { message: ContextMenu.Message },
})
type PreviewMessage = typeof GotContextMenuMessage.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('context-menu'),
  menu: ContextMenu.Model,
  maybeLastAction: S.Option(S.String),
  checkboxItems: S.Array(S.String),
  peopleItems: S.Array(S.String),
  themeItems: S.Array(S.String),
  checkedValues: S.Array(S.String),
  peopleValue: S.Option(S.String),
  themeValue: S.Option(S.String),
})
type PreviewModel = typeof PreviewModel.Type

export const contextMenuTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: GotContextMenuMessage,
  init: index => {
    const fixture = contextMenuFixtures[index] ?? contextMenuFixtures[0]!
    return {
      _docsPage: 'context-menu',
      menu: ContextMenu.init({
        id: `docs-context-${String(index)}`,
        isAnimated: false,
      }),
      maybeLastAction: Option.none(),
      checkboxItems: [...checkboxValues(fixture)],
      peopleItems: [...radioValuesFor(fixture, 'People')],
      themeItems: [...radioValuesFor(fixture, 'Theme')],
      checkedValues: [...(fixture.checkedValues ?? [])],
      peopleValue:
        fixture.peopleValue === undefined
          ? Option.none()
          : Option.some(fixture.peopleValue),
      themeValue:
        fixture.themeValue === undefined
          ? Option.none()
          : Option.some(fixture.themeValue),
    }
  },
  update: (model, message) => {
    const menuOp__ = ContextMenu.update(model.menu, message.message)
    const menu = menuOp__.model
    const commands = menuOp__.commands ?? []
    const maybeSelection = Option.fromNullishOr(menuOp__.outMessage)
    return {
      model: {
        ...model,
        menu,
        maybeLastAction: Option.match(maybeSelection, {
          onNone: () => model.maybeLastAction,
          onSome: selected => Option.some(selected.value),
        }),
        checkedValues: Option.match(maybeSelection, {
          onNone: () => model.checkedValues,
          onSome: selected =>
            model.checkboxItems.includes(selected.value)
              ? model.checkedValues.includes(selected.value)
                ? model.checkedValues.filter(value => value !== selected.value)
                : [...model.checkedValues, selected.value]
              : model.checkedValues,
        }),
        peopleValue: Option.match(maybeSelection, {
          onNone: () => model.peopleValue,
          onSome: selected =>
            model.peopleItems.includes(selected.value)
              ? Option.some(selected.value)
              : model.peopleValue,
        }),
        themeValue: Option.match(maybeSelection, {
          onNone: () => model.themeValue,
          onSome: selected =>
            model.themeItems.includes(selected.value)
              ? Option.some(selected.value)
              : model.themeValue,
        }),
      },
      commands: Command.mapMessages(commands, next =>
        GotContextMenuMessage.GotContextMenuMessage({ message: next }),
      ),
    }
  },
  view: (index, model, h) => {
    const fixture = contextMenuFixtures[index] ?? contextMenuFixtures[0]!
    return h.div(
      [h.Class('grid justify-items-center gap-3')],
      [
        ContextMenu.contextMenu(
          {
            model: model.menu,
            toParentMessage: message =>
              GotContextMenuMessage.GotContextMenuMessage({ message }),
            trigger: h.div(
              [
                h.Class(
                  'flex aspect-video w-80 items-center justify-center rounded-xl border border-dashed text-sm',
                ),
              ],
              ['Right click here'],
            ),
            ariaLabel: `${fixture.title} menu`,
            items: fixtureItems(fixture),
            itemToConfig: item => {
              const spec = fixture.items.find(
                candidate => candidate.value === item,
              )
              const radioValue =
                spec?.group === 'People'
                  ? (Option.getOrNull(model.peopleValue) ?? undefined)
                  : (Option.getOrNull(model.themeValue) ?? undefined)
              const state = { checkedValues: model.checkedValues, radioValue }
              return spec === undefined
                ? { label: item }
                : resolveItemConfig(spec, state, name =>
                    Icon.icon(name, { class: 'size-4' }, h),
                  )
            },
            ...(fixture.keepOpenOnCheckableSelect === true
              ? { keepOpenOnCheckableSelect: true }
              : {}),
            ...(fixture.direction === 'rtl'
              ? { direction: 'rtl' as const }
              : {}),
          },
          h,
        ),
        h.p(
          [h.Role('status'), h.Class('text-sm text-muted-foreground')],
          [
            Option.match(model.maybeLastAction, {
              onNone: () => 'No action selected.',
              onSome: action => `Last action: ${fixtureLabel(fixture, action)}`,
            }),
          ],
        ),
      ],
    )
  },
})
