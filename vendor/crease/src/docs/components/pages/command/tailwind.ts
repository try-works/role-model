import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  commandFixtures,
  itemsForFixture,
} from '@/docs/components/pages/command/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/ui/button'
import * as CommandMenu from '@/ui/command'
import * as Dialog from '@/ui/dialog'

const PreviewMessages = defineMessageUnion({
  OpenedMenu: {},
  GotDialogMessage: { message: Dialog.Message },
  GotCommandMessage: { message: CommandMenu.Message },
})
type PreviewMessage = typeof PreviewMessages.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('command'),
  dialog: Dialog.Model,
  command: CommandMenu.Model,
  maybeValue: S.Option(S.String),
})
type PreviewModel = typeof PreviewModel.Type

export const commandTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessages,
  init: index => ({
    _docsPage: 'command',
    dialog: Dialog.init({
      id: `docs-command-dialog-${String(index)}`,
      isAnimated: true,
    }),
    command: CommandMenu.init({
      id: `docs-command-${String(index)}`,
      isAnimated: true,
    }),
    maybeValue: Option.none(),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'OpenedMenu': {
        const next = Dialog.open(model.dialog)
        return {
          model: { ...model, dialog: next.model },
          commands: Command.mapMessages(next.commands ?? [], child =>
            PreviewMessages.GotDialogMessage({ message: child }),
          ),
        }
      }
      case 'GotDialogMessage': {
        const next = Dialog.update(model.dialog, message.message)
        return {
          model: { ...model, dialog: next.model },
          commands: Command.mapMessages(next.commands ?? [], child =>
            PreviewMessages.GotDialogMessage({ message: child }),
          ),
        }
      }
      case 'GotCommandMessage': {
        const next = CommandMenu.update(model.command, message.message)
        const maybeOut = Option.fromNullishOr(next.outMessage)
        const maybeValue = Option.match(maybeOut, {
          onNone: () => model.maybeValue,
          onSome: out =>
            out._tag === 'Selected'
              ? Option.some(out.value)
              : Option.none<string>(),
        })
        return {
          model: { ...model, command: next.model, maybeValue },
          commands: Command.mapMessages(next.commands ?? [], child =>
            PreviewMessages.GotCommandMessage({ message: child }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = commandFixtures[index] ?? commandFixtures[0]!
    const items = itemsForFixture(fixture)
    const palette = CommandMenu.command(
      {
        model: model.command,
        maybeSelectedValue: model.maybeValue,
        restingInputValue: '',
        toParentMessage: message =>
          PreviewMessages.GotCommandMessage({ message }),
        items: items.map(item => item.value),
        itemToConfig: value => {
          const item = items.find(entry => entry.value === value)
          return {
            content: h.span(
              [h.Class('flex items-center gap-2')],
              [
                ...(item?.icon === undefined
                  ? []
                  : [Icon.icon(item.icon, { class: 'size-4' }, h)]),
                h.span([], [value]),
              ],
            ),
            ...(item?.shortcut === undefined
              ? {}
              : { shortcut: item.shortcut }),
          }
        },
        itemGroupKey: value =>
          items.find(entry => entry.value === value)?.group ?? 'Other',
        groupToHeading: group => group,
        placeholder:
          fixture.kind === 'rtl'
            ? 'اكتب أمرًا أو ابحث...'
            : 'Type a command or search...',
        ariaLabel: fixture.kind === 'rtl' ? 'قائمة الأوامر' : 'Command menu',
        emptyContent: 'No results found.',
      },
      h,
    )
    return h.div(
      [
        ...(fixture.kind === 'rtl' ? [h.Dir('rtl')] : []),
        h.Class('flex flex-col gap-4'),
      ],
      [
        Button.button(
          {
            variant: 'outline',
            class: 'w-fit',
            onClick: PreviewMessages.OpenedMenu(),
            children: ['Open Menu'],
          },
          h,
        ),
        Dialog.dialog(
          {
            model: model.dialog,
            toParentMessage: message =>
              PreviewMessages.GotDialogMessage({ message }),
            title: fixture.kind === 'rtl' ? 'قائمة الأوامر' : 'Command menu',
            content: () => [palette],
          },
          h,
        ),
      ],
    )
  },
})
