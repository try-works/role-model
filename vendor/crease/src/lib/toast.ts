import type { Update } from 'foldkit'
import {
  Duration,
  Effect,
  Equal,
  Option,
  Queue,
  Schema as S,
  Stream,
} from 'effect'
import * as Command from 'foldkit/command'
import * as Mount from 'foldkit/mount'
import { defineMessageUnion } from 'foldkit/message'
import { taggedStruct } from 'foldkit/schema'
import * as ToastPrimitive from '@foldkit/ui/toast'
import { Animation } from '@foldkit/ui'

export const Position = S.Literals([
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
])
export type Position = typeof Position.Type
export const Variant = S.Literals([
  'Default',
  'Success',
  'Error',
  'Warning',
  'Info',
])
export type Variant = typeof Variant.Type

/** The crease toast payload. `variant` lives inside the payload because the
 *  upstream Toast entry variant has no `Default` case; the primitive's own
 *  `entry.variant` field maps `Default` to `Info`. */
export const ToastPayload = S.Struct({
  title: S.String,
  description: S.optional(S.String),
  actionLabel: S.optional(S.String),
  position: S.optional(Position),
  variant: Variant,
})
export type ToastPayload = typeof ToastPayload.Type

const Toast = ToastPrimitive.make(ToastPayload)

export const Model = S.Struct({
  ...Toast.Model.fields,
  position: Position,
  limit: S.Number,
  limitedIds: S.Array(S.String),
  hoveredEntryIds: S.Array(S.String),
  hoveredPositions: S.Array(Position),
  pointerPausedPositions: S.Array(Position),
  focusedPositions: S.Array(Position),
  heights: S.Record(S.String, S.Number),
  viewportHeight: S.Number,
})
export type Model = typeof Model.Type
export const Entry = Toast.Entry
export type Entry = typeof Entry.Type

/** The crease-only message a toast action button dispatches. Every other
 *  message in the union is an upstream `Toast.Message`. */
export const ActivatedToastAction = taggedStruct('ActivatedToastAction', {
  id: S.String,
})
export const Message = defineMessageUnion({
  Added: { entry: Entry },
  Dismissed: { entryId: S.String },
  DismissedAll: {},
  CompletedWaitBeforeDismissal: { entryId: S.String, version: S.Number },
  HoveredEntry: { entryId: S.String },
  LeftEntry: { entryId: S.String },
  GotAnimationMessage: { entryId: S.String, message: Animation.Message },
  PressedEntryPointer: {
    entryId: S.String,
    pointerId: S.Number,
    clientX: S.Number,
  },
  MovedSwipePointer: { pointerId: S.Number, clientX: S.Number },
  ReleasedSwipePointer: { pointerId: S.Number, clientX: S.Number },
  CancelledSwipe: { pointerId: S.Number },
  PressedEscape: {},
  CompletedWaitForSwipeSettled: { entryId: S.String, version: S.Number },
  ChangedToastViewportPointer: {
    position: Position,
    hovered: S.Boolean,
    pause: S.Boolean,
    fallbackPosition: Position,
  },
  ChangedToastViewportFocus: {
    position: Position,
    focused: S.Boolean,
    fallbackPosition: Position,
  },
  MeasuredToast: { entryId: S.String, height: S.Number },
  MeasuredToastViewport: { height: S.Number },
  ChangedToastLimit: { limit: S.Number },
})
export type Message = typeof Message.Type | typeof ActivatedToastAction.Type

export const OutMessage = defineMessageUnion({
  DismissedToast: { entry: Entry },
  ActivatedToast: { entry: Entry },
})
export type OutMessage = typeof OutMessage.Type

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const primitiveVariant = (
  variant: Variant,
): 'Info' | 'Success' | 'Warning' | 'Error' =>
  variant === 'Default' ? 'Info' : variant

/** Maps the primitive's `DismissedToast({payload})` back to crease's
 *  `{entry}` shape by structural payload equality — the primitive rebuilds
 *  the payload through Schema decoding, so identity comparison misses. */
const toOutMessage = (
  model: Model,
  out: typeof Toast.OutMessage.Type | undefined,
  entryId?: string,
): OutMessage | undefined => {
  if (out === undefined) return undefined
  const entry = model.entries.find(candidate =>
    entryId === undefined
      ? Equal.equals(candidate.payload, out.payload)
      : candidate.id === entryId,
  )
  return entry === undefined ? undefined : OutMessage.DismissedToast({ entry })
}

const mapCommands = (
  commands:
    | ReadonlyArray<Command.Command<typeof Toast.Message.Type>>
    | undefined,
): ReadonlyArray<Command.Command<Message>> =>
  Command.mapMessages(commands ?? [], message => message)

export const init = (
  config: Readonly<{
    id: string
    defaultDuration?: Duration.Input
    swipeToDismiss?: ToastPrimitive.SwipeToDismissConfig | false
    limit?: number
    position?: Position
  }>,
): Model => ({
  ...Toast.init({
    id: config.id,
    ...(config.defaultDuration === undefined
      ? {}
      : { defaultDuration: config.defaultDuration }),
    ...(config.swipeToDismiss === false
      ? {}
      : {
          swipeToDismiss: config.swipeToDismiss ?? {
            direction: config.position?.endsWith('left') ? 'Left' : 'Right',
          },
        }),
  }),
  position: config.position ?? 'bottom-right',
  limit: normalizeLimit(config.limit ?? 3),
  limitedIds: [],
  hoveredEntryIds: [],
  hoveredPositions: [],
  pointerPausedPositions: [],
  focusedPositions: [],
  heights: {},
  viewportHeight: 0,
})

const normalizeLimit = (limit: number): number =>
  Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 3

const leaving = (entry: Entry): boolean =>
  entry.animation.transitionState === 'LeaveStart' ||
  entry.animation.transitionState === 'LeaveAnimating'

export const visibleEntries = (model: Model): ReadonlyArray<Entry> =>
  model.entries.filter(entry => !model.limitedIds.includes(entry.id))

const toggle = <T>(
  values: ReadonlyArray<T>,
  value: T,
  enabled: boolean,
): ReadonlyArray<T> =>
  enabled
    ? values.includes(value)
      ? values
      : [...values, value]
    : values.filter(item => item !== value)

/** Limited entries keep their payload and ID, but cannot expire before being
 * seen. Versioned primitive timers make previously scheduled waits harmless. */
const reconcile = (
  model: Model,
  commands: ReadonlyArray<Command.Command<Message>> = [],
): UpdateReturn => {
  const previousLimited = new Set(model.limitedIds)
  const candidates = model.entries.filter(
    entry => !leaving(entry) || !previousLimited.has(entry.id),
  )
  const visibleIds = new Set(
    candidates.slice(-model.limit).map(entry => entry.id),
  )
  const limitedIds = model.entries
    .filter(entry => !visibleIds.has(entry.id))
    .map(entry => entry.id)
  let next = { ...model, limitedIds }
  const effects = [...commands]
  const limited = new Set(limitedIds)
  const hovered = new Set(model.hoveredEntryIds)
  for (const entry of next.entries) {
    if (leaving(entry)) continue
    const position = entry.payload.position ?? next.position
    const paused =
      limited.has(entry.id) ||
      hovered.has(entry.id) ||
      next.pointerPausedPositions.includes(position) ||
      next.focusedPositions.includes(position)
    if (paused === entry.isHovered) continue
    const result = Toast.update(
      next,
      paused
        ? Toast.Message.HoveredEntry({ entryId: entry.id })
        : Toast.Message.LeftEntry({ entryId: entry.id }),
    )
    next = { ...next, ...result.model }
    effects.push(...mapCommands(result.commands))
  }
  return { model: next, commands: effects }
}

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'ChangedToastLimit':
      return reconcile({ ...model, limit: normalizeLimit(message.limit) })
    case 'ChangedToastViewportPointer':
      return reconcile({
        ...model,
        position: message.fallbackPosition,
        hoveredPositions: toggle(
          model.hoveredPositions,
          message.position,
          message.hovered,
        ),
        pointerPausedPositions: toggle(
          model.pointerPausedPositions,
          message.position,
          message.hovered && message.pause,
        ),
      })
    case 'ChangedToastViewportFocus':
      return reconcile({
        ...model,
        position: message.fallbackPosition,
        focusedPositions: toggle(
          model.focusedPositions,
          message.position,
          message.focused,
        ),
      })
    case 'MeasuredToast':
      return message.height === model.heights[message.entryId] ||
        !model.entries.some(entry => entry.id === message.entryId)
        ? { model }
        : {
            model: {
              ...model,
              heights: { ...model.heights, [message.entryId]: message.height },
            },
          }
    case 'MeasuredToastViewport':
      return model.viewportHeight === message.height
        ? { model }
        : { model: { ...model, viewportHeight: message.height } }
    case 'HoveredEntry':
    case 'LeftEntry':
      return reconcile({
        ...model,
        hoveredEntryIds: toggle(
          model.hoveredEntryIds,
          message.entryId,
          message._tag === 'HoveredEntry',
        ),
      })
    case 'CompletedWaitBeforeDismissal':
      if (
        model.limitedIds.includes(message.entryId) ||
        model.entries.find(entry => entry.id === message.entryId)?.isHovered
      )
        return { model }
      break
    case 'PressedEntryPointer':
      if (model.limitedIds.includes(message.entryId)) return { model }
      break
  }
  if (message._tag === 'ActivatedToastAction') {
    const entry = model.entries.find(candidate => candidate.id === message.id)
    if (entry === undefined) return { model }
    const result = Toast.dismiss(model, message.id)
    return {
      ...reconcile({ ...model, ...result.model }, mapCommands(result.commands)),
      outMessage: OutMessage.ActivatedToast({ entry }),
    }
  }
  const result = Toast.update(model, message)
  const outMessage = toOutMessage(
    model,
    result.outMessage,
    message._tag === 'GotAnimationMessage' ? message.entryId : undefined,
  )
  return {
    ...reconcile(
      {
        ...model,
        ...result.model,
        heights: Object.fromEntries(
          Object.entries(model.heights).filter(([id]) =>
            result.model.entries.some(entry => entry.id === id),
          ),
        ),
        hoveredEntryIds: model.hoveredEntryIds.filter(id =>
          result.model.entries.some(entry => entry.id === id),
        ),
      },
      mapCommands(result.commands),
    ),
    ...(outMessage === undefined ? {} : { outMessage }),
  }
}

export type ToastInput = Readonly<{
  title: string
  description?: string
  actionLabel?: string
  duration?: Duration.Input
  sticky?: boolean
  position?: Position
}>
export type ShowInput = ToastInput & Readonly<{ variant: Variant }>
export type UpdateInput = Partial<Omit<ToastInput, 'duration'>> &
  Readonly<{ duration?: Duration.Input; variant?: Variant }>

const toastInput = (variant: Variant, input: ToastInput): ShowInput => ({
  ...input,
  variant,
})
export const success = (input: ToastInput): ShowInput =>
  toastInput('Success', input)
export const error = (input: ToastInput): ShowInput =>
  toastInput('Error', input)
export const info = (input: ToastInput): ShowInput => toastInput('Info', input)
export const warning = (input: ToastInput): ShowInput =>
  toastInput('Warning', input)
export const plain = (input: ToastInput): ShowInput =>
  toastInput('Default', input)

const payload = (
  input: Pick<ToastInput, 'title' | 'description' | 'actionLabel' | 'position'>,
  variant: Variant,
): ToastPayload => ({
  title: input.title,
  variant,
  ...(input.description === undefined
    ? {}
    : { description: input.description }),
  ...(input.actionLabel === undefined
    ? {}
    : { actionLabel: input.actionLabel }),
  ...(input.position === undefined ? {} : { position: input.position }),
})

export const show = (model: Model, input: ShowInput): UpdateReturn => {
  const result = Toast.show(model, {
    payload: payload(input, input.variant),
    variant: primitiveVariant(input.variant),
    ...(input.duration === undefined ? {} : { duration: input.duration }),
    ...(input.sticky === undefined ? {} : { sticky: input.sticky }),
  })
  return reconcile({ ...model, ...result.model }, mapCommands(result.commands))
}

/** Rebuilds an entry's payload/variant/duration, then routes a synthetic
 *  `LeftEntry` through the primitive so its dismissal timer reschedules
 *  against a fresh `pendingDismissVersion`. */
export const updateToast = (
  model: Model,
  id: string,
  input: UpdateInput,
): UpdateReturn => {
  const previous = model.entries.find(entry => entry.id === id)
  if (previous === undefined) return { model }
  const variant = input.variant ?? previous.payload.variant
  const nextEntry: Entry = {
    ...previous,
    payload: {
      title: input.title ?? previous.payload.title,
      variant,
      ...(input.description === undefined
        ? previous.payload.description === undefined
          ? {}
          : { description: previous.payload.description }
        : { description: input.description }),
      ...(input.actionLabel === undefined
        ? previous.payload.actionLabel === undefined
          ? {}
          : { actionLabel: previous.payload.actionLabel }
        : { actionLabel: input.actionLabel }),
      ...(input.position === undefined
        ? previous.payload.position === undefined
          ? {}
          : { position: previous.payload.position }
        : { position: input.position }),
    },
    variant: primitiveVariant(variant),
    maybeDuration:
      input.sticky === true
        ? Option.none()
        : input.duration !== undefined
          ? Option.some(Duration.fromInputUnsafe(input.duration))
          : previous.maybeDuration,
  }
  const replaced = {
    ...model,
    entries: model.entries.map(candidate =>
      candidate.id === id ? nextEntry : candidate,
    ),
  }
  // Refresh the timer without clearing viewport focus/hover or queue pauses.
  const result = Toast.update(
    replaced,
    Toast.Message.LeftEntry({ entryId: id }),
  )
  return reconcile(
    { ...replaced, ...result.model },
    mapCommands(result.commands),
  )
}

export const dismiss = (model: Model, id: string): UpdateReturn =>
  update(model, Toast.Message.Dismissed({ entryId: id }))
export const dismissAll = (model: Model): UpdateReturn =>
  update(model, Toast.Message.DismissedAll())
export const Added = Entry

/** Geometry shared by both skins. Index zero is the newest, frontmost card. */
export const stackLayout = (
  model: Model,
  position: Position,
  expanded: boolean,
  fallback = model.position,
) => {
  const entries = [...model.entries]
    .reverse()
    .filter(entry => (entry.payload.position ?? fallback) === position)
  const limitedIds = new Set(model.limitedIds)
  const visible = entries.filter(entry => !limitedIds.has(entry.id))
  const indices = new Map(
    [...visible, ...entries.filter(entry => limitedIds.has(entry.id))].map(
      (entry, index) => [entry.id, index],
    ),
  )
  const heightOf = (entry: Entry): number =>
    model.heights[entry.id] ??
    (entry.payload.description ? 74 : entry.payload.actionLabel ? 66 : 54)
  const frontHeight = visible[0] ? heightOf(visible[0]) : 0
  const totalHeight =
    visible.reduce((sum, entry) => sum + heightOf(entry), 0) +
    Math.max(0, visible.length - 1) * 12
  let offset = 0
  return {
    height: expanded
      ? totalHeight
      : frontHeight + Math.max(0, visible.length - 1) * 12,
    entries: entries.map(entry => {
      const limited = limitedIds.has(entry.id)
      const index = indices.get(entry.id)!
      const naturalHeight = heightOf(entry)
      const height = expanded ? naturalHeight : frontHeight || naturalHeight
      const sign = position.startsWith('top') ? 1 : -1
      const closed =
        entry.animation.transitionState === 'EnterStart' ||
        entry.animation.transitionState === 'LeaveAnimating'
      const stackIndex = Math.min(index, visible.length)
      const scale = expanded ? 1 : Math.max(0, 1 - stackIndex * 0.1)
      const translation = expanded
        ? limited
          ? Math.max(0, totalHeight - height)
          : offset
        : stackIndex * 12 + (1 - scale) * height
      const swiping = entry.swipeState._tag === 'Dragging'
      const swipeOffset = ToastPrimitive.swipeOffset(entry.swipeState)
      const swipeDirection =
        entry.swipeState._tag === 'Dismissing'
          ? entry.swipeState.direction
          : Option.getOrUndefined(model.maybeSwipeConfig)?.direction
      const swipeExit =
        swipeDirection === 'Left'
          ? position.endsWith('left')
            ? '-150%'
            : position.endsWith('center')
              ? 'calc(-50vw - 50%)'
              : 'calc(-100vw - 100%)'
          : position.endsWith('right')
            ? '150%'
            : position.endsWith('center')
              ? 'calc(50vw + 50%)'
              : 'calc(100vw + 100%)'
      if (!limited) offset += naturalHeight + 12
      return {
        entry,
        index,
        limited,
        swiping,
        swipeDirection,
        behind: index > 0 && !expanded,
        style: {
          height: `${height}px`,
          zIndex: String(1000 - index),
          transform:
            closed && !limited && entry.swipeState._tag === 'Dismissing'
              ? `translateX(${swipeExit}) translateY(${sign * translation}px) scale(${scale})`
              : closed && !limited
                ? `translateY(${sign * -150}%)`
                : swiping ||
                    entry.swipeState._tag === 'Settling' ||
                    entry.swipeState._tag === 'Dismissing'
                  ? `translateX(${swipeOffset}px) translateY(${sign * translation}px) scale(${scale})`
                  : `translateY(${sign * translation}px) scale(${scale})`,
          opacity:
            limited || (closed && entry.swipeState._tag === 'Dismissing')
              ? '0'
              : '1',
          '--toast-swipe-movement-x': `${swipeOffset}px`,
          '--toast-index': String(index),
          '--toast-height': `${naturalHeight}px`,
          '--toast-frontmost-height': `${frontHeight}px`,
          '--toast-offset-y': `${Math.max(0, offset - naturalHeight - 12)}px`,
        },
      }
    }),
  }
}

/** Observe the unscaled, unclamped content so expansion supports mixed heights
 * and reflows after a promise update, viewport resize, or font change. */
export const ObserveToast = Mount.defineStream('ObserveToastContent', {
  args: { entryId: S.String },
  messages: [Message.MeasuredToast],
  execute: ({ element, entryId }) =>
    Stream.callback<typeof Message.MeasuredToast.Type>(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            if (!(element instanceof HTMLElement)) return undefined
            const emit = () =>
              Queue.offerUnsafe(
                queue,
                Message.MeasuredToast({
                  entryId,
                  height: element.offsetHeight + 2,
                }),
              )
            const resize = new ResizeObserver(emit)
            resize.observe(element)
            emit()
            return () => resize.disconnect()
          }),
          cleanup => Effect.sync(() => cleanup?.()),
        )
        return yield* Effect.never
      }),
    ),
})

export const contentMount = <Msg>(
  entryId: string,
  send: (message: Message) => Msg,
) => Mount.mapMessage(ObserveToast({ entryId }), send)

type ViewportMessage = Extract<
  Message,
  {
    _tag:
      | 'ChangedToastViewportFocus'
      | 'Dismissed'
      | 'MeasuredToastViewport'
      | 'ChangedToastViewportPointer'
      | 'PressedEntryPointer'
      | 'MovedSwipePointer'
      | 'ReleasedSwipePointer'
      | 'CancelledSwipe'
      | 'PressedEscape'
  }
>

export const ObserveToastViewport = Mount.defineStream('ObserveToastViewport', {
  args: {
    position: Position,
    fallbackPosition: Position,
    modelId: S.String,
    swipeEnabled: S.Boolean,
    pause: S.Boolean,
  },
  messages: [
    Message.ChangedToastViewportFocus,
    Message.Dismissed,
    Message.MeasuredToastViewport,
    Message.ChangedToastViewportPointer,
    Message.PressedEntryPointer,
    Message.MovedSwipePointer,
    Message.ReleasedSwipePointer,
    Message.CancelledSwipe,
    Message.PressedEscape,
  ],
  execute: ({ element, position, fallbackPosition, swipeEnabled, pause }) =>
    Stream.callback<ViewportMessage>(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            if (!(element instanceof HTMLElement)) return undefined
            let lastFocused: Element | undefined
            let hoverRect: DOMRect | undefined
            let drag:
              | { card: HTMLElement; pointerId: number; pointerType: string }
              | undefined
            const emit = (message: ViewportMessage) =>
              Queue.offerUnsafe(queue, message)
            const hovered = (enabled: boolean) => {
              if (enabled === (hoverRect !== undefined)) return
              hoverRect = enabled ? element.getBoundingClientRect() : undefined
              emit(
                Message.ChangedToastViewportPointer({
                  position,
                  fallbackPosition,
                  hovered: enabled,
                  pause,
                }),
              )
            }
            // Retain the expanded interaction area while cards move or disappear.
            // A layout-triggered pointerleave must not masquerade as moving away.
            const extendHoverRect = () => {
              if (!hoverRect) return
              const rect = element.getBoundingClientRect()
              const top = Math.min(hoverRect.top, rect.top)
              const bottom = Math.max(hoverRect.bottom, rect.bottom)
              hoverRect = new DOMRect(rect.left, top, rect.width, bottom - top)
            }
            const containsPointer = (event: PointerEvent) =>
              hoverRect !== undefined &&
              event.clientX >= hoverRect.left &&
              event.clientX <= hoverRect.right &&
              event.clientY >= hoverRect.top &&
              event.clientY <= hoverRect.bottom
            const enter = (event: PointerEvent) => {
              if (event.pointerType !== 'touch') hovered(true)
            }
            const leave = (event: PointerEvent) => {
              if (!drag && !containsPointer(event)) hovered(false)
            }
            const down = (event: PointerEvent) => {
              if (
                !swipeEnabled ||
                drag ||
                event.button !== 0 ||
                !event.isPrimary ||
                !(event.target instanceof Element)
              )
                return
              if (
                event.target.closest(
                  'button, a, input, select, textarea, [contenteditable], [role="button"], [role="link"], [data-toast-swipe-ignore], [data-base-ui-swipe-ignore]',
                )
              )
                return
              const card = event.target.closest(
                '[data-slot="toast-entry"]:not([data-limited]):not([data-leave])',
              )
              if (!(card instanceof HTMLElement) || !element.contains(card))
                return
              event.preventDefault()
              card.setPointerCapture(event.pointerId)
              drag = {
                card,
                pointerId: event.pointerId,
                pointerType: event.pointerType,
              }
              hovered(true)
              emit(
                Message.PressedEntryPointer({
                  entryId: card.id,
                  pointerId: event.pointerId,
                  clientX: event.clientX,
                }),
              )
            }
            const move = (event: PointerEvent) => {
              if (drag) {
                if (event.pointerId === drag.pointerId)
                  emit(
                    Message.MovedSwipePointer({
                      pointerId: event.pointerId,
                      clientX: event.clientX,
                    }),
                  )
              } else if (
                event.pointerType !== 'touch' &&
                hoverRect &&
                !containsPointer(event)
              )
                hovered(false)
            }
            const end = (event: PointerEvent, cancelled: boolean) => {
              if (!drag || event.pointerId !== drag.pointerId) return
              const previous = drag
              drag = undefined
              emit(
                cancelled
                  ? Message.CancelledSwipe({ pointerId: event.pointerId })
                  : Message.ReleasedSwipePointer({
                      pointerId: event.pointerId,
                      clientX: event.clientX,
                    }),
              )
              if (previous.card.hasPointerCapture(event.pointerId))
                previous.card.releasePointerCapture(event.pointerId)
              if (previous.pointerType === 'touch' || !containsPointer(event))
                hovered(false)
            }
            const up = (event: PointerEvent) => end(event, false)
            const cancel = (event: PointerEvent) => end(event, true)
            const lostCapture = (event: PointerEvent) => end(event, true)
            const focus = () => {
              lastFocused = element.ownerDocument.activeElement ?? undefined
              Queue.offerUnsafe(
                queue,
                Message.ChangedToastViewportFocus({
                  position,
                  fallbackPosition,
                  focused: true,
                }),
              )
            }
            const blur = (event: FocusEvent) => {
              if (
                !(event.relatedTarget instanceof Node) ||
                !element.contains(event.relatedTarget)
              ) {
                lastFocused = undefined
                Queue.offerUnsafe(
                  queue,
                  Message.ChangedToastViewportFocus({
                    position,
                    fallbackPosition,
                    focused: false,
                  }),
                )
              }
            }
            const key = (event: KeyboardEvent) => {
              if (event.defaultPrevented) return
              if (event.key === 'Escape' && drag) {
                event.preventDefault()
                const previous = drag
                drag = undefined
                emit(Message.PressedEscape())
                if (previous.card.hasPointerCapture(previous.pointerId))
                  previous.card.releasePointerCapture(previous.pointerId)
                return
              }
              if (
                event.key === 'F6' &&
                element.querySelector(
                  '[data-slot="toast-entry"]:not([data-limited])',
                )
              ) {
                event.preventDefault()
                element.focus({ preventScroll: true })
              } else if (
                event.key === 'Escape' &&
                element.contains(element.ownerDocument.activeElement)
              ) {
                const entry =
                  (element.ownerDocument.activeElement as HTMLElement)?.closest(
                    '[data-slot="toast-entry"]',
                  ) ??
                  element.querySelector(
                    '[data-slot="toast-entry"]:not([data-limited])',
                  )
                if (entry?.id) {
                  event.preventDefault()
                  Queue.offerUnsafe(
                    queue,
                    Message.Dismissed({ entryId: entry.id }),
                  )
                }
              }
            }
            const measure = () => {
              extendHoverRect()
              Queue.offerUnsafe(
                queue,
                Message.MeasuredToastViewport({
                  height: element.ownerDocument.defaultView?.innerHeight ?? 0,
                }),
              )
              if (position.startsWith('bottom'))
                element.scrollTop = element.scrollHeight
            }
            const resize = new ResizeObserver(measure)
            resize.observe(element)
            element.ownerDocument.defaultView?.addEventListener(
              'resize',
              measure,
            )
            measure()
            const mutation = new MutationObserver(() => {
              if (lastFocused && !element.contains(lastFocused)) {
                const next = element.querySelector<HTMLElement>(
                  '[data-slot="toast-entry"]:not([data-limited]) button',
                )
                ;(next ?? element).focus({ preventScroll: true })
              }
            })
            mutation.observe(element, { childList: true, subtree: true })
            element.addEventListener('focusin', focus)
            element.addEventListener('focusout', blur)
            element.addEventListener('pointerenter', enter)
            element.addEventListener('pointerleave', leave)
            element.addEventListener('pointerdown', down)
            element.addEventListener('lostpointercapture', lostCapture)
            element.ownerDocument.addEventListener('pointermove', move)
            element.ownerDocument.addEventListener('pointerup', up)
            element.ownerDocument.addEventListener('pointercancel', cancel)
            element.ownerDocument.addEventListener('keydown', key)
            return () => {
              resize.disconnect()
              element.ownerDocument.defaultView?.removeEventListener(
                'resize',
                measure,
              )
              mutation.disconnect()
              element.removeEventListener('focusin', focus)
              element.removeEventListener('focusout', blur)
              element.removeEventListener('pointerenter', enter)
              element.removeEventListener('pointerleave', leave)
              element.removeEventListener('pointerdown', down)
              element.removeEventListener('lostpointercapture', lostCapture)
              element.ownerDocument.removeEventListener('pointermove', move)
              element.ownerDocument.removeEventListener('pointerup', up)
              element.ownerDocument.removeEventListener('pointercancel', cancel)
              if (drag?.card.hasPointerCapture(drag.pointerId))
                drag.card.releasePointerCapture(drag.pointerId)
              element.ownerDocument.removeEventListener('keydown', key)
            }
          }),
          cleanup => Effect.sync(() => cleanup?.()),
        )
        return yield* Effect.never
      }),
    ),
})

export const viewportMount = <Msg>(
  position: Position,
  fallbackPosition: Position,
  modelId: string,
  send: (message: Message) => Msg,
  swipeEnabled: boolean,
  pause: boolean,
) =>
  Mount.mapMessage(
    ObserveToastViewport({
      position,
      fallbackPosition,
      modelId,
      swipeEnabled,
      pause,
    }),
    send,
  )
