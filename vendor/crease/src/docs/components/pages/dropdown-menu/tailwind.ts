import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  checkboxValues,
  dropdownMenuFixtures,
  fixtureItems,
  fixtureLabel,
  radioValues,
  resolveItemConfig,
} from '@/docs/components/pages/dropdown-menu/shared'
import * as Avatar from '@/ui/avatar'
import * as DropdownMenu from '@/ui/dropdown-menu'
import * as Icon from '@/lib/icon'

const GotDropdownPreviewMessage = defineMessageUnion({
  GotDropdownPreviewMessage: { message: DropdownMenu.Message },
})
type GotDropdownPreviewMessage = typeof GotDropdownPreviewMessage.Type
const DropdownPreviewModel = S.Struct({
  _docsPage: S.Literal('dropdown-menu'),
  dropdownMenu: DropdownMenu.Model,
  maybeLastAction: S.Option(S.String),
  checkboxItems: S.Array(S.String),
  radioItems: S.Array(S.String),
  checkedValues: S.Array(S.String),
  radioValue: S.Option(S.String),
})
type DropdownPreviewModel = typeof DropdownPreviewModel.Type

export const dropdownMenuTailwindPreviewProgram = definePreviewProgram<
  DropdownPreviewModel,
  GotDropdownPreviewMessage
>({
  Model: DropdownPreviewModel,
  Message: GotDropdownPreviewMessage,
  init: index => {
    const fixture = dropdownMenuFixtures[index] ?? dropdownMenuFixtures[0]
    return {
      _docsPage: 'dropdown-menu',
      dropdownMenu: DropdownMenu.init({
        id: `docs-dropdown-${String(index)}`,
        isAnimated: false,
      }),
      maybeLastAction: Option.none(),
      checkboxItems: [...checkboxValues(fixture)],
      radioItems: [...radioValues(fixture)],
      checkedValues: [...(fixture.checkedValues ?? [])],
      radioValue:
        fixture.radioValue === undefined
          ? Option.none()
          : Option.some(fixture.radioValue),
    }
  },
  update: (model, message) => {
    const dropdownMenuOp__ = DropdownMenu.update(
      model.dropdownMenu,
      message.message,
    )
    const dropdownMenu = dropdownMenuOp__.model
    const commands = dropdownMenuOp__.commands ?? []
    const maybeSelection = Option.fromNullishOr(dropdownMenuOp__.outMessage)
    return {
      model: {
        ...model,
        dropdownMenu,
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
        radioValue: Option.match(maybeSelection, {
          onNone: () => model.radioValue,
          onSome: selected =>
            model.radioItems.includes(selected.value)
              ? Option.some(selected.value)
              : model.radioValue,
        }),
      },
      commands: Command.mapMessages(commands, next =>
        GotDropdownPreviewMessage.GotDropdownPreviewMessage({ message: next }),
      ),
    }
  },
  view: (index, model, h) => {
    const fixture = dropdownMenuFixtures[index] ?? dropdownMenuFixtures[0]
    const state = {
      checkedValues: model.checkedValues,
      radioValue: Option.getOrNull(model.radioValue) ?? undefined,
    }
    const trigger =
      fixture.trigger.kind === 'avatar'
        ? Avatar.avatar(
            {
              children: [
                Avatar.avatarFallback(
                  { children: [fixture.trigger.initials] },
                  h,
                ),
              ],
            },
            h,
          )
        : fixture.trigger.label
    return h.div(
      [h.Class('grid justify-items-center gap-3')],
      [
        DropdownMenu.dropdownMenu(
          {
            model: model.dropdownMenu,
            toParentMessage: message =>
              GotDropdownPreviewMessage.GotDropdownPreviewMessage({ message }),
            trigger,
            triggerClass:
              fixture.trigger.kind === 'avatar'
                ? 'rounded-full'
                : 'rounded-md border px-4 py-2 text-sm font-medium',
            ariaLabel: `${fixture.title} menu`,
            items: fixtureItems(fixture),
            itemToConfig: item => {
              const spec = fixture.items.find(
                candidate => candidate.value === item,
              )
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
