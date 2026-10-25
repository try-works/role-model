import { Effect, Queue, Schema as S, Stream } from 'effect'
import { Command } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Mount from 'foldkit/mount'
import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  messageScrollerFixtures,
  type MessageScrollerFixture,
} from '@/docs/components/pages/message-scroller/shared'
import * as Bubble from '@/ui/bubble'
import * as Button from '@/ui/button'
import * as MessageScroller from '@/ui/message-scroller'

const ChatMessage = S.Struct({
  id: S.Int,
  role: S.Literals(['user', 'assistant', 'marker']),
  text: S.String,
})

const CHAT: Array<typeof ChatMessage.Type> = [
  { id: 1, role: 'assistant', text: 'Hey — welcome to the thread.' },
  { id: 2, role: 'user', text: 'Can you summarize the release notes?' },
  {
    id: 3,
    role: 'assistant',
    text: 'Sure — highlights are auth, theming, and the new chart kit.',
  },
  { id: 4, role: 'user', text: 'Any breaking changes?' },
  {
    id: 5,
    role: 'assistant',
    text: 'Two: the renamed Button size tokens and strict listbox typing.',
  },
  { id: 6, role: 'marker', text: 'Marcus joined the chat' },
  { id: 7, role: 'user', text: 'Does the calendar support RTL?' },
  {
    id: 8,
    role: 'assistant',
    text: 'Yes — pass direction rtl and the mirrored keys follow.',
  },
  { id: 9, role: 'user', text: 'Nice. Last one — how do I persist the theme?' },
  {
    id: 10,
    role: 'assistant',
    text: 'Write the resolved theme to localStorage on every change.',
  },
]

const SEND_CHAT = [
  { role: 'user', text: 'Thanks — that covers it.' },
  {
    role: 'assistant',
    text: 'Anytime — and for next time: the changelog lives under docs/releases, the migration guide covers the Button tokens, and the theme snippet is in the README. Ping me if the upgrade surfaces anything odd.',
  },
] as const

const MEMBER_CHAT = [
  { role: 'marker', text: 'Priya joined the chat' },
  {
    role: 'assistant',
    text: 'Welcome, Priya — quick recap: we are shipping the release tomorrow, the Button size tokens were renamed, listbox typing is now strict, and RTL support is on by default in the calendar. The full notes are pinned above.',
  },
] as const

const HISTORY_CHAT: Array<typeof ChatMessage.Type> = [
  { id: -4, role: 'assistant', text: 'Earlier context: kicking things off.' },
  { id: -3, role: 'user', text: 'Did anyone open the RFC yet?' },
  { id: -2, role: 'assistant', text: 'Yes — review comments are in.' },
  { id: -1, role: 'marker', text: 'History loaded' },
]

const STREAM_CHUNKS = [
  'Streaming',
  ' tokens',
  ' land',
  ' chunk',
  ' by',
  ' chunk…',
] as const

const Message = defineMessageUnion({
  GotScrollerMessage: { message: MessageScroller.Message },
  PressedSend: {},
  PressedAddMember: {},
  PressedStartStream: {},
  PressedLoadHistory: {},
  CapturedViewportAnchor: { messageId: S.String, offset: S.Number },
  PressedJumpTo: { id: S.Int },
  StreamedChunk: { step: S.Int },
  FinishedEntryAnimation: { id: S.Int },
  ObservedVisibility: { ids: S.Array(S.Int) },
  CompletedAnchorScroll: {},
  CompletedJump: {},
  CompletedLoadHistory: {},
})
type Message = typeof Message.Type

const Model = S.Struct({
  _docsPage: S.Literal('message-scroller'),
  kind: S.Literals([
    'anchoring',
    'group-chat',
    'previous-context',
    'streaming',
    'opening-position',
    'load-history',
    'animation',
    'commands',
    'visibility',
    'scrollable',
  ]),
  scroller: MessageScroller.Model,
  chat: S.Array(ChatMessage),
  streaming: S.Boolean,
  streamStep: S.Int,
  animatingIds: S.Array(S.Int),
  visibleIds: S.Array(S.Int),
})
type Model = typeof Model.Type

const fixtureOf = (index: number): MessageScrollerFixture =>
  messageScrollerFixtures[index] ?? messageScrollerFixtures[0]!

const ScrollToAnchor = Command.define('ScrollChatToAnchorPreview', {
  args: { viewportId: S.String, peek: S.Number },
  messages: [Message.CompletedAnchorScroll],
  execute: ({ viewportId, peek }) =>
    Effect.promise(
      () =>
        new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            const viewport = document.getElementById(viewportId)
            const anchors = viewport?.querySelectorAll('[data-scroll-anchor]')
            const target =
              anchors === undefined ? undefined : anchors[anchors.length - 1]
            if (
              viewport instanceof HTMLElement &&
              target instanceof HTMLElement
            ) {
              const top =
                viewport.scrollTop +
                target.getBoundingClientRect().top -
                viewport.getBoundingClientRect().top -
                peek
              const reduced =
                globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
                  .matches ?? false
              viewport.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
            }
            resolve()
          })
        }),
    ).pipe(Effect.as(Message.CompletedAnchorScroll())),
})

const ScrollToMessage = Command.define('ScrollChatToMessagePreview', {
  args: { viewportId: S.String, messageId: S.String },
  messages: [Message.CompletedJump],
  execute: ({ viewportId, messageId }) =>
    Effect.promise(
      () =>
        new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            const viewport = document.getElementById(viewportId)
            const target = viewport?.querySelector(
              `[data-message-id="${messageId}"]`,
            )
            if (
              viewport instanceof HTMLElement &&
              target instanceof HTMLElement
            ) {
              const top =
                viewport.scrollTop +
                target.getBoundingClientRect().top -
                viewport.getBoundingClientRect().top -
                viewport.clientHeight / 2 +
                target.clientHeight / 2
              const reduced =
                globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
                  .matches ?? false
              viewport.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
            }
            resolve()
          })
        }),
    ).pipe(Effect.as(Message.CompletedJump())),
})

const CaptureViewportAnchor = Command.define('CaptureViewportAnchorPreview', {
  args: { viewportId: S.String },
  messages: [Message.CapturedViewportAnchor],
  execute: ({ viewportId }) =>
    Effect.promise(
      () =>
        new Promise<typeof Message.CapturedViewportAnchor.Type>(resolve => {
          requestAnimationFrame(() => {
            const viewport = document.getElementById(viewportId)
            let messageId = ''
            let offset = 0
            if (viewport instanceof HTMLElement) {
              const items = viewport.querySelectorAll('[data-message-id]')
              for (const item of items) {
                if (!(item instanceof HTMLElement)) continue
                const rect = item.getBoundingClientRect()
                if (rect.bottom > viewport.getBoundingClientRect().top) {
                  messageId = item.dataset.messageId ?? ''
                  offset = rect.top - viewport.getBoundingClientRect().top
                  break
                }
              }
            }
            resolve(Message.CapturedViewportAnchor({ messageId, offset }))
          })
        }),
    ),
})

const RestoreViewportAnchor = Command.define('RestoreViewportAnchorPreview', {
  args: { viewportId: S.String, messageId: S.String, offset: S.Number },
  messages: [Message.CompletedLoadHistory],
  execute: ({ viewportId, messageId, offset }) =>
    Effect.promise(
      () =>
        new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            const viewport = document.getElementById(viewportId)
            const target = viewport?.querySelector(
              `[data-message-id="${messageId}"]`,
            )
            if (
              viewport instanceof HTMLElement &&
              target instanceof HTMLElement
            ) {
              const top =
                viewport.scrollTop +
                target.getBoundingClientRect().top -
                viewport.getBoundingClientRect().top -
                offset
              viewport.scrollTo({ top, behavior: 'auto' })
            }
            resolve()
          })
        }),
    ).pipe(Effect.as(Message.CompletedLoadHistory())),
})

const NextStreamChunk = Command.define('NextStreamChunkPreview', {
  args: { step: S.Int },
  messages: [Message.StreamedChunk],
  execute: ({ step }) =>
    Effect.sleep('250 millis').pipe(Effect.as(Message.StreamedChunk({ step }))),
})

const FinishEntryAnimation = Command.define('FinishEntryAnimationPreview', {
  args: { id: S.Int },
  messages: [Message.FinishedEntryAnimation],
  execute: ({ id }) =>
    Effect.sleep('300 millis').pipe(
      Effect.as(Message.FinishedEntryAnimation({ id })),
    ),
})

const ObserveVisibleMessages = Mount.defineStream(
  'ObserveVisibleMessagesPreview',
  {
    messages: [Message.ObservedVisibility],
    execute: ({ element }) =>
      Stream.callback<typeof Message.ObservedVisibility.Type>(queue =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              if (!(element instanceof HTMLElement)) return undefined
              const viewport = element.querySelector(
                '[data-slot="message-scroller-viewport"]',
              )
              if (!(viewport instanceof HTMLElement)) return undefined
              const visible = new Set<number>()
              const observer = new IntersectionObserver(
                entries => {
                  for (const entry of entries) {
                    const raw = (entry.target as HTMLElement).dataset.messageId
                    const id = Number(raw?.replace('msg-', ''))
                    if (Number.isNaN(id)) continue
                    if (entry.isIntersecting) visible.add(id)
                    else visible.delete(id)
                  }
                  Queue.offerUnsafe(
                    queue,
                    Message.ObservedVisibility({
                      ids: [...visible].sort((a, b) => a - b),
                    }),
                  )
                },
                { root: viewport, threshold: 0.5 },
              )
              viewport
                .querySelectorAll('[data-message-id]')
                .forEach(item => observer.observe(item))
              return observer
            }),
            observer =>
              Effect.sync(() => {
                if (observer !== undefined) observer.disconnect()
              }),
          )
          return yield* Effect.never
        }),
      ),
  },
)

const anchorPeek = (kind: MessageScrollerFixture['kind']): number =>
  kind === 'previous-context' ? 140 : 72

const chatRow = (
  message: typeof ChatMessage.Type,
  fixture: MessageScrollerFixture,
  model: Model,
  h: HtmlBuilder<Message>,
) =>
  MessageScroller.messageScrollerItem(
    {
      messageId: `msg-${String(message.id)}`,
      scrollAnchor:
        fixture.kind === 'group-chat'
          ? message.role === 'marker'
          : message.role === 'user',
      ...(fixture.kind === 'animation'
        ? {
            class: `transition-all duration-300 ${
              model.animatingIds.includes(message.id)
                ? 'opacity-0 translate-y-2'
                : 'opacity-100 translate-y-0'
            }`,
          }
        : {}),
      children: [
        message.role === 'marker'
          ? h.div(
              [h.Class('text-center text-xs text-muted-foreground')],
              [message.text],
            )
          : Bubble.bubble(
              {
                align: message.role === 'user' ? 'end' : 'start',
                children: [
                  Bubble.bubbleContent({ children: [message.text] }, h),
                ],
              },
              h,
            ),
      ],
    },
    h,
  )

const scrollerFrame = (
  fixture: MessageScrollerFixture,
  model: Model,
  h: HtmlBuilder<Message>,
) => {
  const frame = h.div(
    [h.Class('relative h-72 w-full rounded-md border')],
    [
      MessageScroller.messageScroller(
        {
          children: [
            MessageScroller.messageScrollerViewport(
              {
                model: model.scroller,
                toParentMessage: message =>
                  Message.GotScrollerMessage({ message }),
                children: [
                  MessageScroller.messageScrollerContent(
                    {
                      children: model.chat.map(message =>
                        chatRow(message, fixture, model, h),
                      ),
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            ...(fixture.kind === 'scrollable'
              ? [
                  MessageScroller.messageScrollerButton(
                    {
                      model: model.scroller,
                      toParentMessage: message =>
                        Message.GotScrollerMessage({ message }),
                      direction: 'start',
                    },
                    h,
                  ),
                ]
              : []),
            MessageScroller.messageScrollerButton(
              {
                model: model.scroller,
                toParentMessage: message =>
                  Message.GotScrollerMessage({ message }),
                direction: 'end',
              },
              h,
            ),
          ],
        },
        h,
      ),
    ],
  )
  if (fixture.kind === 'visibility')
    return h.div(
      [
        h.OnMount(
          Mount.mapMessage(ObserveVisibleMessages(), message => message),
        ),
      ],
      [frame],
    )
  return frame
}

const toolbarButton = (
  label: string,
  message: Message,
  h: HtmlBuilder<Message>,
) =>
  Button.button(
    {
      variant: 'outline',
      size: 'sm',
      onClick: message,
      children: [label],
    },
    h,
  )

const bodyView = (
  fixture: MessageScrollerFixture,
  model: Model,
  h: HtmlBuilder<Message>,
) => {
  const toolbar = (() => {
    switch (fixture.kind) {
      case 'anchoring':
      case 'previous-context':
      case 'animation':
        return [toolbarButton('Send message', Message.PressedSend(), h)]
      case 'group-chat':
        return [
          toolbarButton('Marcus joins the chat', Message.PressedAddMember(), h),
        ]
      case 'streaming':
        return [
          toolbarButton('Start streaming', Message.PressedStartStream(), h),
        ]
      case 'load-history':
        return [
          toolbarButton(
            'Load earlier messages',
            Message.PressedLoadHistory(),
            h,
          ),
        ]
      case 'commands':
        return [
          toolbarButton(
            'Jump to first question',
            Message.PressedJumpTo({ id: 2 }),
            h,
          ),
          toolbarButton(
            'Jump to the RTL answer',
            Message.PressedJumpTo({ id: 8 }),
            h,
          ),
          toolbarButton(
            'Jump to the last turn',
            Message.PressedJumpTo({ id: 10 }),
            h,
          ),
        ]
      default:
        return []
    }
  })()
  const header = (() => {
    if (fixture.kind === 'visibility')
      return [
        h.p(
          [h.Class('text-xs text-muted-foreground')],
          [
            model.visibleIds.length === 0
              ? 'Nothing in view'
              : `In view: ${model.visibleIds.map(id => `msg-${String(id)}`).join(', ')}`,
          ],
        ),
      ]
    if (fixture.kind === 'streaming')
      return [
        h.p(
          [h.Class('text-xs text-muted-foreground')],
          [
            model.scroller.isFollowing
              ? 'Following the live edge'
              : model.scroller.hasNewMessages
                ? 'New messages below — jump to the end'
                : 'Not following',
          ],
        ),
      ]
    if (fixture.kind === 'scrollable')
      return [
        h.div(
          [
            h.Class(
              'grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground',
            ),
          ],
          [
            h.span(
              [],
              [`scrollTop: ${String(Math.round(model.scroller.scrollTop))}px`],
            ),
            h.span(
              [],
              [
                `scrollHeight: ${String(Math.round(model.scroller.scrollHeight))}px`,
              ],
            ),
            h.span(
              [],
              [
                model.scroller.isFollowing
                  ? 'Following the live edge'
                  : 'Not following',
              ],
            ),
            h.span(
              [],
              [
                model.scroller.hasNewMessages
                  ? 'New messages below'
                  : 'No pending messages',
              ],
            ),
          ],
        ),
      ]
    return []
  })()
  return h.div(
    [h.Class('flex w-full max-w-md flex-col gap-3')],
    [...toolbar, ...header, scrollerFrame(fixture, model, h)],
  )
}

export const messageScrollerTailwindPreviewProgram = definePreviewProgram<
  Model,
  Message
>({
  Model,
  Message,
  init: index => {
    const fixture = fixtureOf(index)
    return {
      _docsPage: 'message-scroller',
      kind: fixture.kind,
      scroller: MessageScroller.init(`docs-message-scroller-${String(index)}`),
      chat: CHAT,
      streaming: false,
      streamStep: 0,
      animatingIds: [],
      visibleIds: [],
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotScrollerMessage': {
        const isOpeningMount =
          model.kind === 'opening-position' &&
          message.message._tag === 'ObservedMessageScrollerViewport' &&
          message.message.reason === 'mount'
        // The opening position owns the first scroll, so stop following
        // before the scroller would jump to the end on mount.
        const next = MessageScroller.update(
          isOpeningMount
            ? { ...model.scroller, isFollowing: false }
            : model.scroller,
          message.message,
        )
        const mapped = Command.mapMessages(next.commands ?? [], child =>
          Message.GotScrollerMessage({ message: child }),
        )
        if (
          model.kind === 'opening-position' &&
          message.message._tag === 'ObservedMessageScrollerViewport' &&
          message.message.reason === 'mount'
        )
          return {
            model: {
              ...model,
              scroller: { ...next.model, isFollowing: false },
            },
            commands: [
              ...mapped,
              ScrollToMessage({
                viewportId: `${model.scroller.id}-viewport`,
                messageId: 'msg-5',
              }),
            ],
          }
        return { model: { ...model, scroller: next.model }, commands: mapped }
      }
      case 'PressedSend': {
        const nextId = model.chat.length + 1
        const appended = SEND_CHAT.map((row, index) => ({
          id: nextId + index,
          role: row.role,
          text: row.text,
        }))
        if (model.kind === 'animation')
          return {
            model: {
              ...model,
              scroller: { ...model.scroller, isFollowing: false },
              chat: [...model.chat, ...appended],
              animatingIds: [
                ...model.animatingIds,
                ...appended.map(row => row.id),
              ],
            },
            commands: appended.map(row => FinishEntryAnimation({ id: row.id })),
          }
        return {
          model: {
            ...model,
            scroller: { ...model.scroller, isFollowing: false },
            chat: [...model.chat, ...appended],
          },
          commands: [
            ScrollToAnchor({
              viewportId: `${model.scroller.id}-viewport`,
              peek: anchorPeek(model.kind),
            }),
          ],
        }
      }
      case 'PressedAddMember': {
        const nextId = model.chat.length + 1
        const appended = MEMBER_CHAT.map((row, index) => ({
          id: nextId + index,
          role: row.role,
          text: row.text,
        }))
        return {
          model: {
            ...model,
            scroller: { ...model.scroller, isFollowing: false },
            chat: [...model.chat, ...appended],
          },
          commands: [
            ScrollToAnchor({
              viewportId: `${model.scroller.id}-viewport`,
              peek: 72,
            }),
          ],
        }
      }
      case 'PressedStartStream':
        return model.streaming
          ? { model }
          : {
              model: {
                ...model,
                chat: [
                  ...model.chat,
                  {
                    id: model.chat.length + 1,
                    role: 'assistant',
                    text: '',
                  },
                ],
                streaming: true,
                streamStep: 0,
              },
              commands: [NextStreamChunk({ step: 0 })],
            }
      case 'StreamedChunk': {
        const chunk = STREAM_CHUNKS[message.step]
        const chat = model.chat.map((row, index) =>
          index === model.chat.length - 1 && chunk !== undefined
            ? { ...row, text: row.text + chunk }
            : row,
        )
        const nextStep = message.step + 1
        return {
          model: {
            ...model,
            chat,
            streamStep: nextStep,
            streaming: nextStep < STREAM_CHUNKS.length,
          },
          commands:
            nextStep < STREAM_CHUNKS.length
              ? [NextStreamChunk({ step: nextStep })]
              : [],
        }
      }
      case 'PressedLoadHistory':
        return {
          model,
          commands: [
            CaptureViewportAnchor({
              viewportId: `${model.scroller.id}-viewport`,
            }),
          ],
        }
      case 'CapturedViewportAnchor':
        return {
          model: { ...model, chat: [...HISTORY_CHAT, ...model.chat] },
          commands: [
            RestoreViewportAnchor({
              viewportId: `${model.scroller.id}-viewport`,
              messageId: message.messageId,
              offset: message.offset,
            }),
          ],
        }
      case 'PressedJumpTo':
        return {
          model,
          commands: [
            ScrollToMessage({
              viewportId: `${model.scroller.id}-viewport`,
              messageId: `msg-${String(message.id)}`,
            }),
          ],
        }
      case 'FinishedEntryAnimation':
        return {
          model: {
            ...model,
            animatingIds: model.animatingIds.filter(id => id !== message.id),
          },
        }
      case 'ObservedVisibility':
        return { model: { ...model, visibleIds: message.ids } }
      case 'CompletedAnchorScroll':
      case 'CompletedJump':
      case 'CompletedLoadHistory':
        return { model }
    }
  },
  view: (index, model, h) => bodyView(fixtureOf(index), model, h),
})
