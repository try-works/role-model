import type { Update } from 'foldkit'
import { Option, Schema as S } from 'effect'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import { Dialog } from '@foldkit/ui'

export const Model = Dialog.Model
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotAlertDialogPrimitiveMessage: { message: Dialog.Message },
  RequestedAlertDialogCancel: {},
  RequestedAlertDialogConfirm: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  CancelledAlertDialog: {},
  ConfirmedAlertDialog: {},
})
export type OutMessage = typeof OutMessage.Type

export const init = Dialog.init

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const liftDialog = (result: ReturnType<typeof Dialog.update>): UpdateReturn => {
  const { model: model, commands: modelCommands__ } = result
  const commands = modelCommands__ ?? []
  return {
    model: model,
    commands: Command.mapMessages(commands, message =>
      Message['GotAlertDialogPrimitiveMessage']({ message }),
    ),
  }
}

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'RequestedAlertDialogConfirm':
      return { model: model, outMessage: OutMessage['ConfirmedAlertDialog']() }
    case 'RequestedAlertDialogCancel': {
      const { model: next, commands: nextCommands__ } = liftDialog(
        Dialog.close(model),
      )
      const commands = nextCommands__ ?? []
      return {
        model: next,
        commands: commands,
        outMessage: OutMessage['CancelledAlertDialog'](),
      }
    }
    case 'GotAlertDialogPrimitiveMessage': {
      const { model: next, commands: nextCommands__ } = liftDialog(
        Dialog.update(model, message.message),
      )
      const commands = nextCommands__ ?? []
      return {
        model: next,
        commands: commands,
        ...(message.message._tag === 'RequestedClose'
          ? { outMessage: OutMessage['CancelledAlertDialog']() }
          : {}),
      }
    }
  }
}

export const open = (model: Model): UpdateReturn =>
  liftDialog(Dialog.open(model))
export const close = (model: Model): UpdateReturn =>
  liftDialog(Dialog.close(model))
