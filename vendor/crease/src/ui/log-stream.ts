import { Command, type Update } from 'foldkit'
import { Option, Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as MessageScrollerBehavior from '@/lib/message-scroller'
import { cn } from '@/lib/utils'

/* Ported from Meta Astryx LogStream.tsx (packages/lab) — mono grid rows
   (timestamp | level | source | message) with level accents, expandable
   per-row detail panels, follow-scroll live tailing with a "Jump to latest"
   affordance, and an always-dark terminal variant.
   The terminal palette is intentionally fixed (always-dark brand surface).
   astryx's ReactNode detail ports to Html; the scroll listener pinning ports
   to the shared message-scroller Mount observer. */

// =============================================================================
// Model
// =============================================================================

export const LogStreamLevel = S.Literals(['info', 'warn', 'error', 'debug'])
export type LogStreamLevel = typeof LogStreamLevel.Type

/** One row in the stream; all strings are pre-formatted by the caller. */
export type LogEntry = Readonly<{
  /** Stable unique key, e.g. `"req-1042"`. */
  id: string
  /** Pre-formatted timestamp, e.g. `"14:02:11.482"`. Deterministic. */
  timestamp: string
  level: LogStreamLevel
  message: string
  /** Emitting service/component, e.g. `"api-gateway"`. */
  source?: string
  /** When set, the row becomes a disclosure button for this panel. */
  detail?: Html
}>

export const Model = S.Struct({
  id: S.String,
  scroller: MessageScrollerBehavior.Model,
  expandedIds: S.Array(S.String),
})
export type Model = typeof Model.Type

export const init = (config: {
  id: string
  /** Initially pinned to the tail. @default false (astryx uncontrolled) */
  isFollowing?: boolean
}): Model => ({
  id: config.id,
  scroller: {
    ...MessageScrollerBehavior.init(`${config.id}-stream`),
    isFollowing: config.isFollowing ?? false,
  },
  expandedIds: [],
})

export const Message = defineMessageUnion({
  GotLogStreamScrollerMessage: { message: MessageScrollerBehavior.Message },
  ToggledLogStreamEntry: { id: S.String },
  ClickedJumpToLatest: {},
})
export type Message = typeof Message.Type

/** Mirrors astryx's `onFollowChange`. */
export const OutMessage = defineMessageUnion({
  ChangedLogStreamFollowing: { isFollowing: S.Boolean },
})
export type OutMessage = typeof OutMessage.Type

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const withFollowOutMessage = (
  previous: Model,
  next: Model,
  commands: Update.Commands<Message> = [],
): UpdateReturn => ({
  model: next,
  commands,
  ...(previous.scroller.isFollowing === next.scroller.isFollowing
    ? {}
    : {
        outMessage: OutMessage.ChangedLogStreamFollowing({
          isFollowing: next.scroller.isFollowing,
        }),
      }),
})

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'GotLogStreamScrollerMessage': {
      const next = MessageScrollerBehavior.update(
        model.scroller,
        message.message,
      )
      return withFollowOutMessage(
        model,
        { ...model, scroller: next.model },
        Command.mapMessages(next.commands ?? [], inner =>
          Message.GotLogStreamScrollerMessage({ message: inner }),
        ),
      )
    }
    case 'ToggledLogStreamEntry': {
      const expandedIds = model.expandedIds.includes(message.id)
        ? model.expandedIds.filter(id => id !== message.id)
        : [...model.expandedIds, message.id]
      return { model: { ...model, expandedIds } }
    }
    case 'ClickedJumpToLatest': {
      const next = MessageScrollerBehavior.update(
        model.scroller,
        MessageScrollerBehavior.Message.RequestedScroll({ direction: 'end' }),
      )
      return withFollowOutMessage(
        model,
        { ...model, scroller: next.model },
        Command.mapMessages(next.commands ?? [], inner =>
          Message.GotLogStreamScrollerMessage({ message: inner }),
        ),
      )
    }
  }
}

// =============================================================================
// View
// =============================================================================

/** User counts as "scrolled away" beyond this distance from the bottom. */
const FOLLOW_THRESHOLD_PX = 24

// The terminal variant is intentionally always-dark (terminal chrome is a
// brand surface, mirroring real shells), so it uses fixed near-black grays
// rather than theme tokens, which would flip with the color scheme.
const TERM = {
  root: 'border-[#26262a] bg-[#0a0a0a]',
  row: 'text-[#b9b9c0] border-b-0 py-px',
  rowButtonHover: 'hover:bg-[#141417]',
  timestamp: 'text-[#8b8b94]',
  source: 'text-[#8b8b94]',
  message: 'text-[#b9b9c0]',
  detail: 'bg-[#0e0e10] border-b-[#26262a] text-[#b9b9c0]',
  jump: 'border-[#26262a] bg-[#141417] text-[#e8e8ea] hover:bg-[#1d1d21]',
} as const

const TERM_LEVEL: Record<LogStreamLevel, string> = {
  info: 'text-[#b9b9c0]',
  debug: 'text-[#8b8b94]',
  warn: 'text-[#f2c00b]',
  error: 'text-[#ff6166]',
}

/* astryx darkens the warning/error inks for text contrast; Crease's palette
   ports them onto warning/destructive (closest semantic tokens). */
const LEVEL: Record<LogStreamLevel, string> = {
  info: 'text-muted-foreground',
  debug: 'text-muted-foreground/60',
  warn: 'text-warning',
  error: 'text-destructive',
}

export type LogStreamProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  /** Log rows, oldest first (live tails append at the end). */
  entries: ReadonlyArray<LogEntry>
  /** Visual treatment; 'terminal' is always dark. @default 'default' */
  variant?: 'default' | 'terminal'
  /** Max height of the scroll area before it scrolls (px number or CSS). */
  maxHeight?: number | string
  /** Show the timestamp column. @default true */
  hasTimestamps?: boolean
  /** Accessible label for the log region. @default 'Log stream' */
  label?: string
  /** Escape hatch: fully replace the default row for an entry. */
  renderEntry?: (entry: LogEntry) => Html
  class?: string
}>

export const logStream = <Msg>(
  props: LogStreamProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const isTerminal = props.variant === 'terminal'
  const hasTimestamps = props.hasTimestamps ?? true
  const hasSource = props.entries.some(entry => entry.source !== undefined)

  const scroller = model.scroller
  const distanceFromBottom =
    scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
  const isAtBottom =
    scroller.scrollHeight === 0 || distanceFromBottom <= FOLLOW_THRESHOLD_PX

  const colsClass = hasTimestamps
    ? hasSource
      ? '[grid-template-columns:96px_52px_128px_minmax(0,1fr)]'
      : '[grid-template-columns:96px_52px_minmax(0,1fr)]'
    : hasSource
      ? '[grid-template-columns:52px_128px_minmax(0,1fr)]'
      : '[grid-template-columns:52px_minmax(0,1fr)]'

  const renderDefaultRow = (entry: LogEntry): ReadonlyArray<Html> => {
    const isExpandable = entry.detail !== undefined
    const isExpanded = isExpandable && model.expandedIds.includes(entry.id)
    const cells: ReadonlyArray<Html | string> = [
      ...(hasTimestamps
        ? [
            h.span(
              [
                h.Class(
                  cn(
                    'whitespace-nowrap tabular-nums',
                    isTerminal ? TERM.timestamp : 'text-muted-foreground',
                  ),
                ),
              ],
              [entry.timestamp],
            ),
          ]
        : []),
      h.span(
        [
          h.Class(
            cn(
              'text-xs leading-5 font-semibold uppercase tracking-[0.08em]',
              isTerminal ? TERM_LEVEL[entry.level] : LEVEL[entry.level],
            ),
          ),
        ],
        [entry.level],
      ),
      ...(hasSource
        ? [
            h.span(
              [
                h.Class(
                  cn(
                    'min-w-0 overflow-hidden text-ellipsis whitespace-nowrap',
                    isTerminal ? TERM.source : 'text-muted-foreground',
                  ),
                ),
                ...(entry.source === undefined ? [] : [h.Title(entry.source)]),
              ],
              [entry.source ?? ''],
            ),
          ]
        : []),
      h.span(
        [
          h.Class(
            cn(
              'min-w-0 break-words whitespace-pre-wrap',
              isTerminal
                ? cn(
                    TERM.message,
                    entry.level === 'error' && 'text-[#ff6166]',
                    entry.level === 'warn' && 'text-[#f2c00b]',
                  )
                : undefined,
            ),
          ),
        ],
        [entry.message],
      ),
    ]

    const rowClass = cn(
      'grid items-baseline gap-x-3 px-3 py-1 leading-[1.7] [content-visibility:auto] [contain-intrinsic-block-size:auto_28px] transition-opacity duration-150 ease-out starting:opacity-0',
      colsClass,
      isTerminal
        ? TERM.row
        : cn(
            'border-b border-border text-foreground last:border-b-0',
            entry.level === 'error' &&
              'bg-[color-mix(in_srgb,var(--destructive)_6%,transparent)]',
            entry.level === 'warn' &&
              'bg-[color-mix(in_srgb,var(--warning)_5%,transparent)]',
          ),
    )

    if (!isExpandable) {
      return [
        h.div(
          [h.DataAttribute('level', entry.level), h.Class(rowClass)],
          [...cells],
        ),
      ]
    }
    return [
      h.button(
        [
          h.Type('button'),
          h.DataAttribute('level', entry.level),
          h.AriaExpanded(isExpanded),
          h.OnClick(
            props.toParentMessage(
              Message.ToggledLogStreamEntry({ id: entry.id }),
            ),
          ),
          h.Class(
            cn(
              rowClass,
              'w-full border-t-0 border-x-0 text-left font-mono text-sm',
              'disabled:cursor-default',
              isTerminal ? TERM.rowButtonHover : 'hover:bg-muted/50',
            ),
          ),
        ],
        [...cells],
      ),
      ...(isExpanded
        ? [
            h.div(
              [
                h.Class(
                  cn(
                    'border-b px-3 py-3',
                    isTerminal ? TERM.detail : 'border-border bg-muted',
                  ),
                ),
              ],
              [entry.detail ?? h.empty],
            ),
          ]
        : []),
    ]
  }

  return h.div(
    [
      h.DataAttribute('slot', 'log-stream'),
      h.DataAttribute('variant', props.variant ?? 'default'),
      h.Class(
        cn(
          'relative flex flex-col overflow-hidden rounded-lg border font-mono text-sm',
          isTerminal ? TERM.root : 'border-border bg-card',
          props.class,
        ),
      ),
    ],
    [
      h.div(
        [
          h.Id(`${scroller.id}-viewport`),
          h.Role('log'),
          h.AriaLabel(props.label ?? 'Log stream'),
          /* role="log" is implicitly aria-live="polite" — on a busy stream
             that floods assistive tech. Follow-pinning doubles as the mute
             switch: off while unfollowed, polite while following. */
          h.AriaLive(scroller.isFollowing ? 'polite' : 'off'),
          h.DataAttribute('slot', 'log-stream-viewport'),
          h.DataAttribute('following', String(scroller.isFollowing)),
          h.Class('overflow-y-auto overscroll-contain [scrollbar-width:thin]'),
          ...(props.maxHeight === undefined
            ? []
            : [
                h.Style({
                  maxHeight:
                    typeof props.maxHeight === 'number'
                      ? `${String(props.maxHeight)}px`
                      : props.maxHeight,
                }),
              ]),
          h.OnMount(
            MessageScrollerBehavior.viewportMount(message =>
              props.toParentMessage(
                Message.GotLogStreamScrollerMessage({ message }),
              ),
            ),
          ),
        ],
        props.entries.map(entry =>
          h.div(
            [h.Key(entry.id)],
            [
              ...(props.renderEntry === undefined
                ? renderDefaultRow(entry)
                : [props.renderEntry(entry)]),
            ],
          ),
        ),
      ),
      ...(!scroller.isFollowing && !isAtBottom && props.entries.length > 0
        ? [
            h.button(
              [
                h.Type('button'),
                h.OnClick(props.toParentMessage(Message.ClickedJumpToLatest())),
                h.Class(
                  cn(
                    'absolute bottom-3 right-3 rounded-full border px-3 py-1 font-mono text-sm font-medium shadow-md cursor-pointer',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isTerminal
                      ? TERM.jump
                      : 'border-border bg-card text-foreground hover:bg-muted',
                  ),
                ),
              ],
              ['Jump to latest ↓'],
            ),
          ]
        : []),
    ],
  )
}
