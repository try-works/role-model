/* Ported from diceui ActionBar (diceui.com/docs/components/base/action-bar):
   document-level Escape dismissal while the bar is open. Roving-tabindex
   arrow navigation inside the group reuses lib/toolbar's mount. */

import { Effect, Schema as S, Stream } from 'effect'
import { Queue } from 'effect'
import * as Mount from 'foldkit/mount'
import { defineMessageUnion } from 'foldkit/message'

export type ActionBarSide = 'top' | 'bottom'
export type ActionBarAlign = 'start' | 'center' | 'end'

export const Message = defineMessageUnion({
  RequestedClose: {},
  CompletedEscapeListener: {},
})
export type Message = typeof Message.Type

export const EscapeActionBar = Mount.defineStream('EscapeActionBar', {
  args: {},
  messages: [Message.RequestedClose, Message.CompletedEscapeListener],
  execute: ({ element }) =>
    Stream.callback<
      | typeof Message.RequestedClose.Type
      | typeof Message.CompletedEscapeListener.Type
    >(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            if (!(element instanceof HTMLElement)) return undefined
            const ownerDocument = element.ownerDocument ?? document
            const onKeyDown = (event: KeyboardEvent): void => {
              if (event.key === 'Escape' && !event.defaultPrevented) {
                Queue.offerUnsafe(queue, Message.RequestedClose({}))
              }
            }
            ownerDocument.addEventListener('keydown', onKeyDown)
            Queue.offerUnsafe(queue, Message.CompletedEscapeListener({}))
            return { onKeyDown }
          }),
          resource =>
            Effect.sync(() => {
              if (resource === undefined || !(element instanceof HTMLElement)) {
                return
              }
              const ownerDocument = element.ownerDocument ?? document
              ownerDocument.removeEventListener('keydown', resource.onKeyDown)
            }),
        )
        return yield* Effect.never
      }),
    ),
})

export const escapeActionBarMount = <Msg>(
  toParentMessage: (message: Message) => Msg,
) => Mount.mapMessage(EscapeActionBar({}), toParentMessage)
