import type { Update } from 'foldkit'
import { Schema as S } from 'effect'
import * as Command from 'foldkit/command'
import { defineMessageUnion } from 'foldkit/message'
import { Dialog } from '@foldkit/ui'

/* Renderer-neutral state for the MobileNav port of Meta Astryx's MobileNav:
   a full-viewport dialog hosting an edge-anchored navigation drawer. */

export const MobileNavSide = S.Literals(['start', 'end', 'auto'])
export type MobileNavSide = typeof MobileNavSide.Type

export const ResolvedSide = S.Literals(['start', 'end'])
export type ResolvedSide = typeof ResolvedSide.Type

export const Model = S.Struct({
  dialog: Dialog.Model,
  side: MobileNavSide,
  resolvedSide: ResolvedSide,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  GotMobileNavDialogMessage: { message: Dialog.Message },
})
export type Message = typeof Message.Type
export const OutMessage = Dialog.OutMessage
export type OutMessage = typeof OutMessage.Type

export type InitConfig = Dialog.InitConfig &
  Readonly<{
    side?: MobileNavSide
  }>

export const init = (config: InitConfig): Model => ({
  dialog: Dialog.init(config),
  side: config.side ?? 'auto',
  resolvedSide: 'start',
})

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const mapDialogResult = (
  model: Model,
  result: ReturnType<typeof Dialog.update>,
): UpdateReturn => {
  const { model: dialog, commands: dialogCommands, outMessage } = result
  const commands = dialogCommands ?? []
  return {
    model: { ...model, dialog },
    commands: Command.mapMessages(commands, message =>
      Message['GotMobileNavDialogMessage']({ message }),
    ),
    ...(outMessage === undefined ? {} : { outMessage }),
  }
}

/** 'auto' picks the edge the toggle sits on: the opener's center relative to
    the viewport midpoint. Called at the application boundary, not in update. */
const resolveAutoSide = (): ResolvedSide => {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return 'start'
  }
  const active = document.activeElement
  if (active instanceof HTMLElement) {
    const rect = active.getBoundingClientRect()
    const center = rect.left + rect.width / 2
    return center < window.innerWidth / 2 ? 'start' : 'end'
  }
  return 'start'
}

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotMobileNavDialogMessage':
      return mapDialogResult(
        model,
        Dialog.update(model.dialog, message.message),
      )
  }
}

export const open = (model: Model): UpdateReturn => {
  const resolvedSide = model.side === 'auto' ? resolveAutoSide() : model.side
  return mapDialogResult({ ...model, resolvedSide }, Dialog.open(model.dialog))
}

export const close = (model: Model): UpdateReturn =>
  mapDialogResult(model, Dialog.close(model.dialog))
