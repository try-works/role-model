import { Effect, Option, Queue, Schema as S, Stream } from 'effect'
import type { Update } from 'foldkit'
import * as Mount from 'foldkit/mount'
import { defineMessageUnion } from 'foldkit/message'

/* Behavior for Stepper: the Model is pure view-machinery — the measured root
   width that drives horizontal collapse, and the (seenStep, previousSeenStep)
   pair that choreographs the connector fill. activeStep stays parent-owned;
   the pair refreshes when the stepper reports a click or a programmatic change. */

export const Model = S.Struct({
  id: S.String,
  maybeRootWidth: S.Option(S.Number),
  seenStep: S.Number,
  previousSeenStep: S.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ClickedStep: { step: S.Number },
  ObservedStepperRoot: { width: S.Number },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ClickedStep: { step: S.Number },
})
export type OutMessage = typeof OutMessage.Type

export const init = ({
  id,
  activeStep,
}: {
  id: string
  activeStep: number
}): Model => ({
  id,
  maybeRootWidth: Option.none(),
  seenStep: activeStep,
  previousSeenStep: activeStep,
})

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'ClickedStep':
      return {
        model: {
          ...model,
          previousSeenStep: model.seenStep,
          seenStep: message.step,
        },
        outMessage: OutMessage.ClickedStep({ step: message.step }),
      }
    case 'ObservedStepperRoot':
      return { model: { ...model, maybeRootWidth: Option.some(message.width) } }
  }
}

/** Reflect a programmatic activeStep change (one not produced by ClickedStep)
    into the connector-fill choreography pair. */
export const reflectActiveStep = (model: Model, activeStep: number): Model =>
  model.seenStep === activeStep
    ? model
    : { ...model, previousSeenStep: model.seenStep, seenStep: activeStep }

/** The step the flow came from, derived exactly as Astryx does from its
    render-time `seen` pair. */
export const previousActiveStep = (model: Model, activeStep: number): number =>
  model.seenStep === activeStep ? model.previousSeenStep : model.seenStep

export const isCompact = (
  model: Model,
  stepCount: number,
  minimumStepWidth: number,
): boolean =>
  model.maybeRootWidth._tag === 'Some' &&
  model.maybeRootWidth.value > 0 &&
  stepCount > 0 &&
  model.maybeRootWidth.value / stepCount < minimumStepWidth

export const ObserveStepperRoot = Mount.defineStream('ObserveStepperRoot', {
  messages: [Message.ObservedStepperRoot],
  execute: ({ element }) =>
    Stream.callback<typeof Message.ObservedStepperRoot.Type>(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            if (!(element instanceof HTMLElement)) return undefined
            const emit = () =>
              Queue.offerUnsafe(
                queue,
                Message.ObservedStepperRoot({ width: element.clientWidth }),
              )
            const resize = new ResizeObserver(emit)
            resize.observe(element)
            emit()
            return { resize }
          }),
          resource => Effect.sync(() => resource?.resize.disconnect()),
        )
        return yield* Effect.never
      }),
    ),
})

export const rootMount = <Msg>(toParentMessage: (message: Message) => Msg) =>
  Mount.mapMessage(ObserveStepperRoot(), toParentMessage)

// --- Pure connector-fill choreography (mirrors Step.tsx) ------------------

export type StepperProgress = 'completed' | 'in-progress' | 'not-started'

export const progressFor = (
  index: number,
  activeStep: number,
): StepperProgress =>
  index === activeStep
    ? 'in-progress'
    : index < activeStep
      ? 'completed'
      : 'not-started'

/** One step's slice of the animated span, in CSS <time> units. */
export type StepperTiming = Readonly<{ duration: string; delay: string }>

export const FILL_SPAN_MS = 300

const fillTimeSlice = (time: number, factor: number): string => {
  if (factor <= 0) return '0ms'
  if (factor === 1) return `${time}ms`
  return `${Math.round(time * factor * 10000) / 10000}ms`
}

export const OT_ARRIVAL_SHARE_HORIZONTAL = 0.5
export const OT_ARRIVAL_SHARE_VERTICAL = 0.3
export const OT_RAIL_SHARE_OF_LEAVING = 0.25

export const fillTiming = (
  isSingleAdvance: boolean,
  animatedSpan: number,
  spanIndex: number,
  offset: number,
  share: number,
): StepperTiming =>
  !isSingleAdvance || spanIndex !== animatedSpan
    ? { duration: '0ms', delay: '0ms' }
    : {
        duration: fillTimeSlice(FILL_SPAN_MS, share),
        delay: fillTimeSlice(FILL_SPAN_MS, offset),
      }

export type StepperStatus = 'accent' | 'success' | 'warning' | 'error'

/** Screen-reader phrasing for a step's progress/status, mirroring
    Astryx's t('@astryx.step.status.*') — no i18n layer in Crease UI. */
export const stepStatusText = (
  status: StepperStatus | undefined,
  progress: StepperProgress,
): string | null =>
  status === 'error'
    ? 'Error'
    : status === 'warning'
      ? 'Warning'
      : status === 'success' || progress === 'completed'
        ? 'Completed'
        : null

export const stepAriaLabel = (
  index: number,
  label: string,
  statusText: string | null,
): string =>
  statusText === null
    ? `Go to step ${index + 1}, ${label}`
    : `Go to step ${index + 1}, ${label}, ${statusText}`
