import { Effect, Queue, Stream } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import * as Mount from 'foldkit/mount'

export const Message = defineMessageUnion({ Entered: {}, Left: {} })
type Message = typeof Message.Type

type Rectangle = Readonly<{
  left: number
  right: number
  top: number
  bottom: number
}>

export const isWithinHoverArea = (
  x: number,
  y: number,
  rect: Rectangle,
  leeway = 8,
): boolean =>
  rect.right > rect.left &&
  rect.bottom > rect.top &&
  x >= rect.left - leeway &&
  x <= rect.right + leeway &&
  y >= rect.top - leeway &&
  y <= rect.bottom + leeway

// The dropdown backdrop is a descendant but covers the whole viewport.
// Track the actual trigger and panel bounds rather than the wrapper's ancestry.
export const ObserveDocumentationHover = Mount.defineStream(
  'ObserveSidebarDocumentationHover',
  {
    args: {},
    messages: [Message.Entered, Message.Left],
    execute: ({ element }) =>
      Stream.callback<Message>(queue =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              const doc = element.ownerDocument
              const viewport = doc.defaultView
              let engaged = false
              const emit = (inside: boolean) => {
                if (engaged === inside) return
                engaged = inside
                Queue.offerUnsafe(
                  queue,
                  inside ? Message.Entered() : Message.Left(),
                )
              }
              const move = (event: PointerEvent) => {
                if (
                  event.pointerType !== 'mouse' &&
                  event.pointerType !== 'pen'
                )
                  return
                const regions = element.querySelectorAll(
                  '[data-slot="dropdown-menu-trigger"], [data-slot="dropdown-menu-content"]',
                )
                emit(
                  Array.from(regions).some(region =>
                    isWithinHoverArea(
                      event.clientX,
                      event.clientY,
                      region.getBoundingClientRect(),
                    ),
                  ),
                )
              }
              const leave = () => emit(false)
              doc.addEventListener('pointermove', move, true)
              doc.addEventListener('pointerleave', leave)
              viewport?.addEventListener('blur', leave)
              return () => {
                doc.removeEventListener('pointermove', move, true)
                doc.removeEventListener('pointerleave', leave)
                viewport?.removeEventListener('blur', leave)
              }
            }),
            cleanup => Effect.sync(cleanup),
          )
          return yield* Effect.never
        }),
      ),
  },
)
