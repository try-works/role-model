import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type MessageScrollerKind =
  | 'anchoring'
  | 'group-chat'
  | 'previous-context'
  | 'streaming'
  | 'opening-position'
  | 'load-history'
  | 'animation'
  | 'commands'
  | 'visibility'
  | 'scrollable'

export type MessageScrollerFixture = Readonly<{
  title: string
  description: string
  kind: MessageScrollerKind
}>

export const messageScrollerFixtures: ReadonlyArray<MessageScrollerFixture> = [
  {
    title: 'Anchoring Turns',
    description:
      "The user's message anchors near the top of the viewport when a new turn is appended.",
    kind: 'anchoring',
  },
  {
    title: 'Group Chat',
    description:
      'Anchors are role-independent — a marker row like "Marcus joined the chat" can anchor a turn.',
    kind: 'group-chat',
  },
  {
    title: 'Keeping Context Visible',
    description:
      'The anchor scroll keeps a peek of the previous turn above the new one.',
    kind: 'previous-context',
  },
  {
    title: 'Following the Live Edge',
    description:
      'While following, streamed content keeps the viewport pinned to the end; scrolling up releases it.',
    kind: 'streaming',
  },
  {
    title: 'Opening Saved Threads',
    description:
      'A saved thread opens scrolled to the bookmarked message instead of the end.',
    kind: 'opening-position',
  },
  {
    title: 'Loading Earlier Messages',
    description:
      'Prepending history preserves the reader’s scroll position — no jump.',
    kind: 'load-history',
  },
  {
    title: 'Animating New Messages',
    description:
      'Appended rows play an entrance transition via a model-driven class flip.',
    kind: 'animation',
  },
  {
    title: 'Jumping to Messages',
    description: 'A Command scrolls the viewport to a specific message by id.',
    kind: 'commands',
  },
  {
    title: 'Tracking the Reader’s Position',
    description:
      'An IntersectionObserver Mount stream reports which messages are in view.',
    kind: 'visibility',
  },
  {
    title: 'Reading Scroll State',
    description:
      'The measured scroll metrics and follow state render as live indicators.',
    kind: 'scrollable',
  },
]

const CHAT_SCHEMA = `const ChatMessage = S.Struct({
  id: S.Int,
  role: S.Literals(['user', 'assistant', 'marker']),
  text: S.String,
})
export type ChatMessage = typeof ChatMessage.Type

const CHAT: Array<ChatMessage> = [
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
]`

const SEND_CHAT = `const SEND_CHAT = [
  { role: 'user', text: 'Thanks — that covers it.' },
  {
    role: 'assistant',
    text: 'Anytime — and for next time: the changelog lives under docs/releases, the migration guide covers the Button tokens, and the theme snippet is in the README. Ping me if the upgrade surfaces anything odd.',
  },
] as const`

const MEMBER_CHAT = `const MEMBER_CHAT = [
  { role: 'marker', text: 'Priya joined the chat' },
  {
    role: 'assistant',
    text: 'Welcome, Priya — quick recap: we are shipping the release tomorrow, the Button size tokens were renamed, listbox typing is now strict, and RTL support is on by default in the calendar. The full notes are pinned above.',
  },
] as const`

const HISTORY_CHAT = `const HISTORY_CHAT: Array<ChatMessage> = [
  { id: -4, role: 'assistant', text: 'Earlier context: kicking things off.' },
  { id: -3, role: 'user', text: 'Did anyone open the RFC yet?' },
  { id: -2, role: 'assistant', text: 'Yes — review comments are in.' },
  { id: -1, role: 'marker', text: 'History loaded' },
]`

const STREAM_CHUNKS_SRC = `const STREAM_CHUNKS = [
  'Streaming',
  ' tokens',
  ' land',
  ' chunk',
  ' by',
  ' chunk…',
] as const`

const EXTRA_DATA: Partial<Record<MessageScrollerKind, string>> = {
  anchoring: SEND_CHAT,
  'group-chat': MEMBER_CHAT,
  'previous-context': SEND_CHAT,
  streaming: STREAM_CHUNKS_SRC,
  'load-history': HISTORY_CHAT,
  animation: SEND_CHAT,
}

const STYLE_SOURCE = `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'
import type { StaticStyles } from '@stylexjs/stylex'

const isStaticStyle = (value: unknown): value is StaticStyles =>
  typeof value === 'object' && value !== null
const cx = (...values: ReadonlyArray<unknown>): string =>
  className(...values.filter(isStaticStyle))

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    maxWidth: '28rem',
    width: '100%',
  },
  toolbar: { display: 'flex', flexWrap: 'wrap', gap: '0.5rem' },
  frame: {
    borderColor: 'var(--border)',
    borderRadius: '0.375rem',
    borderStyle: 'solid',
    borderWidth: 1,
    height: '18rem',
    position: 'relative',
    width: '100%',
  },
  marker: {
    color: 'var(--muted-foreground)',
    fontSize: '0.75rem', lineHeight: '1rem',
    textAlign: 'center',
  },
  metrics: {
    color: 'var(--muted-foreground)',
    display: 'grid',
    fontSize: '0.75rem', lineHeight: '1rem',
    gap: '0.125rem 0.75rem',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  following: { color: 'var(--muted-foreground)', fontSize: '0.75rem', lineHeight: '1rem' },
  row: {
    opacity: 1,
    transform: 'translateY(0)',
    transitionDuration: '300ms',
    transitionProperty: 'opacity, transform',
  },
  rowEntering: { opacity: 0, transform: 'translateY(0.5rem)' },
  icon: { height: '1rem', width: '1rem' },
})`

const rowSource = (kind: MessageScrollerKind, isSx: boolean): string => {
  const anchored =
    kind === 'group-chat'
      ? `message.role === 'marker'`
      : `message.role === 'user'`
  const animClass = `\`transition-all duration-300 \${model.animatingIds.includes(message.id) ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}\``
  const itemClass =
    kind === 'animation' && !isSx ? `\n      class: ${animClass},` : ''
  const markerRow = isSx
    ? `h.div([h.Class(cx(styles.marker))], [message.text])`
    : `h.div([h.Class('text-center text-xs text-muted-foreground')], [message.text])`
  return `const chatRow = (model: Model, message: ChatMessage, h: HtmlBuilder<Message>) =>
  MessageScroller.messageScrollerItem(
    {
      messageId: \`msg-\${String(message.id)}\`,
      scrollAnchor: ${anchored},${itemClass}
      children: [
        ${
          kind === 'animation' && isSx
            ? `h.div(
          [
            model.animatingIds.includes(message.id)
              ? h.Class(cx(styles.row, styles.rowEntering))
              : h.Class(cx(styles.row)),
          ],
          [
            message.role === 'marker'
              ? ${markerRow}
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
        ),`
            : `message.role === 'marker'
          ? ${markerRow}
          : Bubble.bubble(
              {
                align: message.role === 'user' ? 'end' : 'start',
                children: [
                  Bubble.bubbleContent({ children: [message.text] }, h),
                ],
              },
              h,
            ),`
        }
      ],
    },
    h,
  )`
}

const toolbarButton = (
  label: string,
  messageExpr: string,
  isSx: boolean,
): string =>
  `Button.button(
          {
            variant: 'outline',
            size: 'sm',
            onClick: ${messageExpr},
            children: ['${label}'],
          },
          h,
        )`

const toolbarSource = (kind: MessageScrollerKind, isSx: boolean): string => {
  const wrap = (inner: string): string =>
    `h.div([h.Class(${isSx ? 'cx(styles.toolbar)' : `'flex flex-wrap gap-2'`})], [
        ${inner}
      ]),`
  switch (kind) {
    case 'anchoring':
    case 'previous-context':
      return wrap(toolbarButton('Send message', 'Message.PressedSend()', isSx))
    case 'group-chat':
      return wrap(
        toolbarButton(
          'Marcus joins the chat',
          'Message.PressedAddMember()',
          isSx,
        ),
      )
    case 'streaming':
      return wrap(
        toolbarButton('Start streaming', 'Message.PressedStartStream()', isSx),
      )
    case 'load-history':
      return wrap(
        toolbarButton(
          'Load earlier messages',
          'Message.PressedLoadHistory()',
          isSx,
        ),
      )
    case 'animation':
      return wrap(toolbarButton('Send message', 'Message.PressedSend()', isSx))
    case 'commands':
      return wrap(
        `${toolbarButton('Jump to first question', 'Message.PressedJumpTo({ id: 2 })', isSx)},
        ${toolbarButton('Jump to the RTL answer', 'Message.PressedJumpTo({ id: 8 })', isSx)},
        ${toolbarButton('Jump to the last turn', 'Message.PressedJumpTo({ id: 10 })', isSx)}`,
      )
    case 'opening-position':
    case 'visibility':
    case 'scrollable':
      return ''
  }
}

const headerSource = (kind: MessageScrollerKind, isSx: boolean): string => {
  if (kind === 'visibility')
    return `h.p([h.Class(${isSx ? 'cx(styles.following)' : `'text-xs text-muted-foreground'`})], [
        model.visibleIds.length === 0
          ? 'Nothing in view'
          : \`In view: \${model.visibleIds.map(id => \`msg-\${String(id)}\`).join(', ')}\`,
      ]),`
  if (kind === 'streaming')
    return `h.p([h.Class(${isSx ? 'cx(styles.following)' : `'text-xs text-muted-foreground'`})], [
        model.scroller.isFollowing
          ? 'Following the live edge'
          : model.scroller.hasNewMessages
            ? 'New messages below — jump to the end'
            : 'Not following',
      ]),`
  if (kind === 'scrollable')
    return `h.div([h.Class(${isSx ? 'cx(styles.metrics)' : `'grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground'`})], [
        h.span([], [\`scrollTop: \${String(Math.round(model.scroller.scrollTop))}px\`]),
        h.span([], [\`scrollHeight: \${String(Math.round(model.scroller.scrollHeight))}px\`]),
        h.span([], [
          model.scroller.isFollowing
            ? 'Following the live edge'
            : 'Not following',
        ]),
        h.span([], [
          model.scroller.hasNewMessages
            ? 'New messages below'
            : 'No pending messages',
        ]),
      ]),`
  return ''
}

const COMMANDS: Partial<Record<MessageScrollerKind, string>> = {
  anchoring: `const ScrollToAnchor = Command.define('ScrollChatToAnchor', {
  args: { viewportId: S.String, peek: S.Number },
  messages: [Message.CompletedAnchorScroll],
  execute: ({ viewportId, peek }) =>
    Effect.promise(
      () =>
        new Promise<void>(resolve => {
          requestAnimationFrame(() => {
                  const viewport = document.getElementById(viewportId)
                  const anchors = viewport?.querySelectorAll('[data-scroll-anchor]')
                  const target = anchors === undefined ? undefined : anchors[anchors.length - 1]
                  if (viewport instanceof HTMLElement && target instanceof HTMLElement) {
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
})`,
  'previous-context': `const ScrollToAnchor = Command.define('ScrollChatToAnchor', {
  args: { viewportId: S.String, peek: S.Number },
  messages: [Message.CompletedAnchorScroll],
  execute: ({ viewportId, peek }) =>
    Effect.promise(
      () =>
        new Promise<void>(resolve => {
          requestAnimationFrame(() => {
                  const viewport = document.getElementById(viewportId)
                  const anchors = viewport?.querySelectorAll('[data-scroll-anchor]')
                  const target = anchors === undefined ? undefined : anchors[anchors.length - 1]
                  if (viewport instanceof HTMLElement && target instanceof HTMLElement) {
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
})`,
  'group-chat': `const ScrollToAnchor = Command.define('ScrollChatToAnchor', {
  args: { viewportId: S.String, peek: S.Number },
  messages: [Message.CompletedAnchorScroll],
  execute: ({ viewportId, peek }) =>
    Effect.promise(
      () =>
        new Promise<void>(resolve => {
          requestAnimationFrame(() => {
                  const viewport = document.getElementById(viewportId)
                  const anchors = viewport?.querySelectorAll('[data-scroll-anchor]')
                  const target = anchors === undefined ? undefined : anchors[anchors.length - 1]
                  if (viewport instanceof HTMLElement && target instanceof HTMLElement) {
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
})`,
  streaming: `const NextStreamChunk = Command.define('NextStreamChunk', {
  args: { step: S.Int },
  messages: [Message.StreamedChunk],
  execute: ({ step }) =>
    Effect.sleep('250 millis').pipe(
      Effect.as(Message.StreamedChunk({ step })),
    ),
})`,
  'opening-position': `const ScrollToMessage = Command.define('ScrollChatToMessage', {
  args: { viewportId: S.String, messageId: S.String },
  messages: [Message.CompletedJump],
  execute: ({ viewportId, messageId }) =>
    Effect.promise(
      () =>
        new Promise<void>(resolve => {
          requestAnimationFrame(() => {
                  const viewport = document.getElementById(viewportId)
                  const target = viewport?.querySelector(
                    \`[data-message-id="\${messageId}"]\`,
                  )
                  if (viewport instanceof HTMLElement && target instanceof HTMLElement) {
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
})`,
  'load-history': `const CaptureViewportAnchor = Command.define('CaptureViewportAnchor', {
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

const RestoreViewportAnchor = Command.define('RestoreViewportAnchor', {
  args: { viewportId: S.String, messageId: S.String, offset: S.Number },
  messages: [Message.CompletedLoadHistory],
  execute: ({ viewportId, messageId, offset }) =>
    Effect.promise(
      () =>
        new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            const viewport = document.getElementById(viewportId)
            const target = viewport?.querySelector(
              \`[data-message-id="\${messageId}"]\`,
            )
            if (viewport instanceof HTMLElement && target instanceof HTMLElement) {
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
})`,
  animation: `const FinishEntryAnimation = Command.define('FinishEntryAnimation', {
  args: { id: S.Int },
  messages: [Message.FinishedEntryAnimation],
  execute: ({ id }) =>
    Effect.sleep('300 millis').pipe(
      Effect.as(Message.FinishedEntryAnimation({ id })),
    ),
})`,
  commands: `const ScrollToMessage = Command.define('ScrollChatToMessage', {
  args: { viewportId: S.String, messageId: S.String },
  messages: [Message.CompletedJump],
  execute: ({ viewportId, messageId }) =>
    Effect.promise(
      () =>
        new Promise<void>(resolve => {
          requestAnimationFrame(() => {
                  const viewport = document.getElementById(viewportId)
                  const target = viewport?.querySelector(
                    \`[data-message-id="\${messageId}"]\`,
                  )
                  if (viewport instanceof HTMLElement && target instanceof HTMLElement) {
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
})`,
  visibility: `const ObserveVisibleMessages = Mount.defineStream('ObserveVisibleMessages', {
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
})`,
}

const UPDATE_CASES: Record<MessageScrollerKind, string> = {
  anchoring: `    case 'PressedSend': {
      const nextId = model.chat.length + 1
      const appended = SEND_CHAT.map((row, index) => ({
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
            viewportId: \`\${model.scroller.id}-viewport\`,
            peek: 72,
          }),
        ],
      }
    }
    case 'CompletedAnchorScroll':
      return { model }`,
  'group-chat': `    case 'PressedAddMember': {
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
            viewportId: \`\${model.scroller.id}-viewport\`,
            peek: 72,
          }),
        ],
      }
    }
    case 'CompletedAnchorScroll':
      return { model }`,
  'previous-context': `    case 'PressedSend': {
      const nextId = model.chat.length + 1
      const appended = SEND_CHAT.map((row, index) => ({
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
            viewportId: \`\${model.scroller.id}-viewport\`,
            peek: 140,
          }),
        ],
      }
    }
    case 'CompletedAnchorScroll':
      return { model }`,
  streaming: `    case 'PressedStartStream':
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
        model: { ...model, chat, streamStep: nextStep, streaming: nextStep < STREAM_CHUNKS.length },
        commands:
          nextStep < STREAM_CHUNKS.length
            ? [NextStreamChunk({ step: nextStep })]
            : [],
      }
    }`,
  'opening-position': `    case 'GotScrollerMessage': {
      const isMount =
        message.message._tag === 'ObservedMessageScrollerViewport' &&
        message.message.reason === 'mount'
      const next = MessageScroller.update(
        isMount ? { ...model.scroller, isFollowing: false } : model.scroller,
        message.message,
      )
      const commands = next.commands ?? []
      const mapped = Command.mapMessages(commands, child =>
        Message.GotScrollerMessage({ message: child }),
      )
      if (
        message.message._tag === 'ObservedMessageScrollerViewport' &&
        message.message.reason === 'mount'
      )
        return {
          model: { ...model, scroller: { ...next.model, isFollowing: false } },
          commands: [
            ...mapped,
            ScrollToMessage({
              viewportId: \`\${model.scroller.id}-viewport\`,
              messageId: 'msg-5',
            }),
          ],
        }
      return { model: { ...model, scroller: next.model }, commands: mapped }
    }
    case 'CompletedJump':
      return { model }`,
  'load-history': `    case 'PressedLoadHistory':
      return {
        model,
        commands: [
          CaptureViewportAnchor({
            viewportId: \`\${model.scroller.id}-viewport\`,
          }),
        ],
      }
    case 'CapturedViewportAnchor':
      return {
        model: { ...model, chat: [...HISTORY_CHAT, ...model.chat] },
        commands: [
          RestoreViewportAnchor({
            viewportId: \`\${model.scroller.id}-viewport\`,
            messageId: message.messageId,
            offset: message.offset,
          }),
        ],
      }
    case 'CompletedLoadHistory':
      return { model }`,
  animation: `    case 'PressedSend': {
      const nextId = model.chat.length + 1
      const appended = SEND_CHAT.map((row, index) => ({
        id: nextId + index,
        role: row.role,
        text: row.text,
      }))
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
    }
    case 'FinishedEntryAnimation':
      return {
        model: {
          ...model,
          animatingIds: model.animatingIds.filter(id => id !== message.id),
        },
      }`,
  commands: `    case 'PressedJumpTo':
      return {
        model,
        commands: [
          ScrollToMessage({
            viewportId: \`\${model.scroller.id}-viewport\`,
            messageId: \`msg-\${String(message.id)}\`,
          }),
        ],
      }
    case 'CompletedJump':
      return { model }`,
  visibility: `    case 'ObservedVisibility':
      return { model: { ...model, visibleIds: message.ids } }`,
  scrollable: '',
}

const MODEL_FIELDS: Partial<Record<MessageScrollerKind, string>> = {
  streaming: `  streaming: S.Boolean,
  streamStep: S.Int,
`,
  animation: `  animatingIds: S.Array(S.Int),
`,
  visibility: `  visibleIds: S.Array(S.Int),
`,
}

const MODEL_INIT: Partial<Record<MessageScrollerKind, string>> = {
  streaming: `    streaming: false,
    streamStep: 0,
`,
  animation: `    animatingIds: [],
`,
  visibility: `    visibleIds: [],
`,
}

const MESSAGE_FIELDS: Partial<Record<MessageScrollerKind, string>> = {
  anchoring: `  PressedSend: {},
  CompletedAnchorScroll: {},
`,
  'group-chat': `  PressedAddMember: {},
  CompletedAnchorScroll: {},
`,
  'previous-context': `  PressedSend: {},
  CompletedAnchorScroll: {},
`,
  streaming: `  PressedStartStream: {},
  StreamedChunk: { step: S.Int },
`,
  'opening-position': `  CompletedJump: {},
`,
  'load-history': `  PressedLoadHistory: {},
  CapturedViewportAnchor: { messageId: S.String, offset: S.Number },
  CompletedLoadHistory: {},
`,
  animation: `  PressedSend: {},
  FinishedEntryAnimation: { id: S.Int },
`,
  commands: `  PressedJumpTo: { id: S.Int },
  CompletedJump: {},
`,
  visibility: `  ObservedVisibility: { ids: S.Array(S.Int) },
`,
}

const source = (
  fixture: MessageScrollerFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isSx = renderer !== 'tailwind'
  const kind = fixture.kind
  const needsEffect = COMMANDS[kind] !== undefined
  const needsMount = kind === 'visibility'
  const imports = `import { ${needsEffect || needsMount ? 'Effect, ' : ''}${needsMount ? 'Queue, ' : ''}Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
${
  needsMount
    ? `import * as Mount from 'foldkit/mount'
import { Stream } from 'effect'
`
    : ''
}
import * as Bubble from '@/${isSx ? 'stylex' : 'ui'}/bubble'
import * as Button from '@/${isSx ? 'stylex' : 'ui'}/button'
import * as MessageScroller from '@/${isSx ? 'stylex' : 'ui'}/message-scroller'
${isSx ? `\n${STYLE_SOURCE}` : ''}
${CHAT_SCHEMA}${EXTRA_DATA[kind] === undefined ? '' : `\n${EXTRA_DATA[kind]}`}`

  const toolbar = toolbarSource(kind, isSx)
  const header = headerSource(kind, isSx)
  const updateCases = UPDATE_CASES[kind]
  const gotScrollerCase =
    kind === 'opening-position'
      ? ''
      : `    case 'GotScrollerMessage': {
      const next = MessageScroller.update(model.scroller, message.message)
      const commands = next.commands ?? []
      return {
        model: { ...model, scroller: next.model },
        commands: Command.mapMessages(commands, child =>
          Message.GotScrollerMessage({ message: child }),
        ),
      }
    }
`
  return foldkitApplication({
    title: `Message Scroller — ${fixture.title}`,
    imports,
    model: `export const Model = S.Struct({
  scroller: MessageScroller.Model,
  chat: S.Array(ChatMessage),
${MODEL_FIELDS[kind] ?? ''}})
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  GotScrollerMessage: { message: MessageScroller.Message },
${MESSAGE_FIELDS[kind] ?? ''}});
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    scroller: MessageScroller.init('conversation'),
    chat: CHAT,
${MODEL_INIT[kind] ?? ''}  },
})`,
    update: `${COMMANDS[kind] === undefined ? '' : `${COMMANDS[kind]}\n\n`}export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
${gotScrollerCase}${updateCases === '' ? '' : `${updateCases}\n`}  }
}`,
    view: `${rowSource(kind, isSx)}

const scrollerFrame = (model: Model, h: HtmlBuilder<Message>) =>
  ${
    kind === 'visibility'
      ? `h.div(
    [
      h.OnMount(
        Mount.mapMessage(ObserveVisibleMessages(), message => message),
      ),
    ],
    [
      ${frameInner(isSx)},
    ],
  )`
      : frameInner(isSx)
  }

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Message Scroller — ${fixture.title}',
  body: h.main([h.Class(${isSx ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    h.div([h.Class(${isSx ? 'cx(styles.column)' : `'flex w-full max-w-md flex-col gap-3'`})], [
      ${toolbar}${header}
      scrollerFrame(model, h),
    ]),
  ]),
})`,
  })
}

const frameInner = (isSx: boolean): string => `h.div(
        [h.Class(${isSx ? 'cx(styles.frame)' : `'relative h-72 w-full rounded-md border'`})],
        [
          MessageScroller.messageScroller({ children: [
            MessageScroller.messageScrollerViewport(
              {
                model: model.scroller,
                toParentMessage: message =>
                  Message.GotScrollerMessage({ message }),
                children: [
                  MessageScroller.messageScrollerContent(
                    {
                      children: model.chat.map(message =>
                        chatRow(model, message, h),
                      ),
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            MessageScroller.messageScrollerButton(
              {
                model: model.scroller,
                toParentMessage: message =>
                  Message.GotScrollerMessage({ message }),
                direction: 'end',
              },
              h,
            ),
          ] }, h),
        ],
      )`

const messageScrollerExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  messageScrollerFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    code: source(fixture, renderer),
  }))

export const messageScrollerExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, messageScrollerExamplesFor(renderer))
