import type { Update } from 'foldkit'
import { Duration, Effect, Schema as S } from 'effect'
import * as Command from 'foldkit/command'
import { Tooltip as TooltipPrimitive } from '@foldkit/ui'
import { defineMessageUnion } from 'foldkit/message'

/* The visibility state machine is the foldkit Tooltip primitive; this module
   keeps crease's message/OutMessage vocabulary as a thin adapter so callers
   (and the two renderer skins) keep a stable API. */

export const Model = S.Struct({
  ...TooltipPrimitive.Model.fields,
  closeDelayMs: S.Number,
  pendingCloseVersion: S.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  EnteredTooltipTrigger: {},
  LeftTooltipTrigger: {},
  FocusedTooltipTrigger: {},
  BlurredTooltipTrigger: {},
  PressedEscapeOnTooltip: {},
  PressedPointerOnTooltipTrigger: { pointerType: S.String },
  CompletedTooltipAnchor: {},
  CompletedWaitBeforeShowingTooltip: { version: S.Number },
  CompletedWaitBeforeClosingTooltip: { version: S.Number },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ShownTooltip: {},
  HiddenTooltip: {},
})
export type OutMessage = typeof OutMessage.Type

export type InitConfig = Readonly<{
  id: string
  showDelay?: Duration.Input
  closeDelay?: Duration.Input
}>

const millis = (input: Duration.Input): number =>
  Math.max(0, Duration.toMillis(input))

export const init = (config: InitConfig): Model => ({
  ...TooltipPrimitive.init({
    id: config.id,
    ...(config.showDelay === undefined ? {} : { showDelay: config.showDelay }),
  }),
  closeDelayMs: millis(config.closeDelay ?? '100 millis'),
  pendingCloseVersion: 0,
})

export const WaitBeforeShowing = Command.define('WaitBeforeShowingTooltip', {
  args: { delayMs: S.Number, version: S.Number },
  messages: [Message['CompletedWaitBeforeShowingTooltip']],
  execute: ({ delayMs, version }) =>
    Effect.sleep(`${delayMs} millis`).pipe(
      Effect.as(Message['CompletedWaitBeforeShowingTooltip']({ version })),
    ),
})

/* The upstream Tooltip has no close delay; crease keeps its close-wait
   semantics by deferring the primitive-visible close in the adapter. */
export const WaitBeforeClosing = Command.define('WaitBeforeClosingTooltip', {
  args: { delayMs: S.Number, version: S.Number },
  messages: [Message['CompletedWaitBeforeClosingTooltip']],
  execute: ({ delayMs, version }) =>
    Effect.sleep(`${delayMs} millis`).pipe(
      Effect.as(Message['CompletedWaitBeforeClosingTooltip']({ version })),
    ),
})

const toPrimitiveMessage = (message: Message): TooltipPrimitive.Message => {
  switch (message._tag) {
    case 'EnteredTooltipTrigger':
      return TooltipPrimitive.Message.EnteredTrigger()
    case 'LeftTooltipTrigger':
      return TooltipPrimitive.Message.LeftTrigger()
    case 'FocusedTooltipTrigger':
      return TooltipPrimitive.Message.FocusedTrigger()
    case 'BlurredTooltipTrigger':
      return TooltipPrimitive.Message.BlurredTrigger()
    case 'PressedEscapeOnTooltip':
      return TooltipPrimitive.Message.PressedEscape()
    case 'PressedPointerOnTooltipTrigger':
      // Crease suppresses a pointer-induced focus for every pointer type
      // (Base UI focus-visible parity). Upstream only treats 'mouse' that
      // way, so the adapter remaps before the primitive records it.
      return TooltipPrimitive.Message.PressedPointerOnTrigger({
        pointerType: 'mouse',
      })
    case 'CompletedTooltipAnchor':
      return TooltipPrimitive.Message.CompletedAnchorTooltip()
    case 'CompletedWaitBeforeShowingTooltip':
      return TooltipPrimitive.Message.CompletedWaitBeforeShowing({
        version: message.version,
      })
    // Handled crease-side; the primitive never sees a closing completion.
    case 'CompletedWaitBeforeClosingTooltip':
      return TooltipPrimitive.Message.CompletedWaitBeforeShowing({
        version: -1,
      })
  }
}

const fromPrimitiveMessage = (message: TooltipPrimitive.Message): Message => {
  switch (message._tag) {
    case 'CompletedWaitBeforeShowing':
      return Message.CompletedWaitBeforeShowingTooltip({
        version: message.version,
      })
    case 'CompletedAnchorTooltip':
      return Message.CompletedTooltipAnchor()
    case 'EnteredTrigger':
      return Message.EnteredTooltipTrigger()
    case 'LeftTrigger':
      return Message.LeftTooltipTrigger()
    case 'FocusedTrigger':
      return Message.FocusedTooltipTrigger()
    case 'BlurredTrigger':
      return Message.BlurredTooltipTrigger()
    case 'PressedEscape':
      return Message.PressedEscapeOnTooltip()
    case 'PressedPointerOnTrigger':
      return Message.PressedPointerOnTooltipTrigger({
        pointerType: message.pointerType,
      })
  }
}

const toOutMessage = (out: TooltipPrimitive.OutMessage): OutMessage =>
  out._tag === 'Shown' ? OutMessage.ShownTooltip() : OutMessage.HiddenTooltip()

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

/* Primitive Commands are re-expressed with crease names/args so callers and
   tests keep resolving `WaitBeforeShowingTooltip`/`WaitBeforeClosingTooltip`. */
const mapCommands = (
  commands:
    | ReadonlyArray<Command.Command<TooltipPrimitive.Message>>
    | undefined,
): ReadonlyArray<Command.Command<Message>> =>
  (commands ?? []).map(command => {
    const args = command.args as
      | { delay?: Duration.Duration; version?: number }
      | undefined
    if (
      command.name === 'WaitBeforeShowing' &&
      args?.delay !== undefined &&
      args.version !== undefined
    ) {
      return WaitBeforeShowing({
        delayMs: Duration.toMillis(args.delay),
        version: args.version,
      })
    }
    return Command.mapMessage(command, fromPrimitiveMessage)
  })

const forward = (
  model: Model,
  result: Update.ReturnWithOutMessage<
    TooltipPrimitive.Model,
    TooltipPrimitive.Message,
    TooltipPrimitive.OutMessage
  >,
  pendingCloseVersion: number,
): UpdateReturn => ({
  model: {
    ...result.model,
    closeDelayMs: model.closeDelayMs,
    pendingCloseVersion,
  },
  commands: mapCommands(result.commands),
  ...(result.outMessage === undefined
    ? {}
    : { outMessage: toOutMessage(result.outMessage) }),
})

export const update = (model: Model, message: Message): UpdateReturn => {
  if (message._tag === 'CompletedWaitBeforeClosingTooltip') {
    return message.version === model.pendingCloseVersion &&
      model.isOpen &&
      !model.isHovered &&
      !model.isFocused
      ? {
          model: { ...model, isOpen: false },
          outMessage: OutMessage.HiddenTooltip(),
        }
      : { model }
  }
  const result = TooltipPrimitive.update(model, toPrimitiveMessage(message))
  /* The primitive clears `isDismissed` when EITHER pointer or focus
     disengages; crease keeps the dismissal until BOTH have. Restore the flag
     while the still-engaged side is up. */
  const keepsDismissed =
    model.isDismissed &&
    ((message._tag === 'LeftTooltipTrigger' && model.isFocused) ||
      (message._tag === 'BlurredTooltipTrigger' && model.isHovered))
  const adjusted = keepsDismissed
    ? { ...result, model: { ...result.model, isDismissed: true } }
    : result
  /* Any new engagement event invalidates an armed closing wait. */
  const invalidatesClose =
    message._tag === 'EnteredTooltipTrigger' ||
    message._tag === 'FocusedTooltipTrigger' ||
    message._tag === 'PressedEscapeOnTooltip' ||
    message._tag === 'LeftTooltipTrigger' ||
    message._tag === 'BlurredTooltipTrigger'
  const pendingCloseVersion =
    model.pendingCloseVersion + (invalidatesClose ? 1 : 0)
  /* The primitive closes instantly on disengage; crease delays the visible
     close by `closeDelayMs`, keeping the tooltip open while the wait arms. */
  if (
    (message._tag === 'LeftTooltipTrigger' ||
      message._tag === 'BlurredTooltipTrigger') &&
    model.isOpen &&
    !adjusted.model.isOpen &&
    model.closeDelayMs > 0
  ) {
    return {
      model: {
        ...adjusted.model,
        isOpen: true,
        closeDelayMs: model.closeDelayMs,
        pendingCloseVersion,
      },
      commands: [
        ...mapCommands(adjusted.commands),
        WaitBeforeClosing({
          delayMs: model.closeDelayMs,
          version: pendingCloseVersion,
        }),
      ],
    }
  }
  return forward(model, adjusted, pendingCloseVersion)
}

export const reflectShowDelay = (
  model: Model,
  showDelay: Duration.Input,
): Model => ({
  ...model,
  ...TooltipPrimitive.reflectShowDelay(model, showDelay),
})

export const reflectCloseDelay = (
  model: Model,
  closeDelay: Duration.Input,
): Model => ({ ...model, closeDelayMs: millis(closeDelay) })
