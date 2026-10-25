import { Effect, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

export const Model = S.NullOr(S.String)
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedDocsCopyCode: { code: S.String },
  CompletedCopyDocsCode: {
    code: S.String,
  },
  CompletedWaitBeforeClearingDocsCopyFeedback: { code: S.String },
  ObservedDocsSidebarScroll: {},
})
export type Message = typeof Message.Type

const CopyCode = Command.define('CopyDocsCode', {
  args: { code: S.String },
  messages: [Message.CompletedCopyDocsCode],
  execute: ({ code }) =>
    Effect.promise(() => navigator.clipboard.writeText(code)).pipe(
      Effect.as(Message.CompletedCopyDocsCode({ code })),
    ),
})

const WaitBeforeClearingCopyFeedback = Command.define(
  'WaitBeforeClearingDocsCopyFeedback',
  {
    args: { code: S.String },
    messages: [Message.CompletedWaitBeforeClearingDocsCopyFeedback],
    execute: ({ code }) =>
      Effect.sleep('1800 millis').pipe(
        Effect.as(
          Message.CompletedWaitBeforeClearingDocsCopyFeedback({ code }),
        ),
      ),
  },
)

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'ClickedDocsCopyCode':
      return { model: model, commands: [CopyCode({ code: message.code })] }
    case 'CompletedCopyDocsCode':
      return {
        model: message.code,
        commands: [WaitBeforeClearingCopyFeedback({ code: message.code })],
      }
    case 'CompletedWaitBeforeClearingDocsCopyFeedback':
      return { model: model === message.code ? null : model }
    case 'ObservedDocsSidebarScroll':
      return { model: model }
  }
}
