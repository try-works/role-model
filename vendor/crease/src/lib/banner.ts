import { Effect, Schema as S, Stream } from 'effect'
import type { Update } from 'foldkit'
import type { Attribute, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

/* Ported from Meta Astryx Banner.tsx — the dismissible/collapsible state
   machine and the focus-origin handoff (focusin/pointerdown capture records
   the element focused before the banner; on unmount focus returns to it so a
   keyboard user never lands on <body>). */

export const BannerStatuses = ['info', 'warning', 'error', 'success'] as const
export type BannerStatus = (typeof BannerStatuses)[number]

export type BannerContainer = 'card' | 'section'

export type BannerElevation = 'none' | 'low' | 'med' | 'high'

/** Closest lucide glyphs for astryx's registry icon names
   (info / warning / error / success). */
export const STATUS_ICON: Readonly<Record<BannerStatus, string>> = {
  info: 'info',
  warning: 'triangle-alert',
  error: 'circle-alert',
  success: 'circle-check',
}

export const STATUS_ROLE: Readonly<Record<BannerStatus, 'alert' | 'status'>> = {
  info: 'status',
  warning: 'alert',
  error: 'alert',
  success: 'status',
}

/** astryx IconColor per status mapped onto the alert-hue tokens crease uses
   for the same severities (accent → primary, warning → warning,
   error → destructive, success → success). */
export const STATUS_TEXT_CLASS: Readonly<Record<BannerStatus, string>> = {
  info: 'text-primary',
  warning: 'text-warning',
  error: 'text-destructive',
  success: 'text-success',
}

export const Model = S.Struct({
  isDismissed: S.Boolean,
  isOpen: S.Boolean,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  Dismissed: {},
  ToggledContent: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  Dismissed: {},
})
export type OutMessage = typeof OutMessage.Type

export const init = (
  config?: Readonly<{ defaultIsOpen?: boolean }>,
): Model => ({
  isDismissed: false,
  isOpen: config?.defaultIsOpen ?? false,
})

export const update = (
  model: Model,
  message: Message,
): Update.ReturnWithOutMessage<Model, Message, OutMessage> => {
  switch (message._tag) {
    case 'Dismissed':
      return {
        model: { ...model, isDismissed: true },
        outMessage: OutMessage.Dismissed(),
      }
    case 'ToggledContent':
      return { model: { ...model, isOpen: !model.isOpen } }
  }
}

type FocusState = Readonly<{
  onFocusIn: (event: FocusEvent) => void
  onPointerDown: () => void
  origin: () => HTMLElement | undefined
}>

const acquireFocusOrigin = (element: Element) =>
  Effect.acquireRelease(
    Effect.sync((): FocusState | undefined => {
      if (!(element instanceof HTMLElement)) {
        return undefined
      }
      let origin: HTMLElement | undefined
      const remember = (candidate: EventTarget | null): void => {
        if (
          candidate instanceof HTMLElement &&
          candidate !== document.body &&
          !element.contains(candidate)
        ) {
          origin = candidate
        }
      }
      const onFocusIn = (event: FocusEvent): void =>
        remember(event.relatedTarget)
      // pointerdown fires before focus moves, so the still-focused element
      // is the one outside the banner.
      const onPointerDown = (): void => remember(document.activeElement)
      element.addEventListener('focusin', onFocusIn)
      element.addEventListener('pointerdown', onPointerDown, true)
      return { onFocusIn, onPointerDown, origin: () => origin }
    }),
    state =>
      Effect.sync(() => {
        if (state === undefined || !(element instanceof HTMLElement)) {
          return
        }
        element.removeEventListener('focusin', state.onFocusIn)
        element.removeEventListener('pointerdown', state.onPointerDown, true)
        // Restore only when the unmount stranded focus (the banner held it —
        // the browser resets activeElement to body). A focus that legitimately
        // moved elsewhere before removal is left alone.
        const stranded =
          document.activeElement === document.body ||
          element.contains(document.activeElement)
        const origin = state.origin()
        if (stranded && origin !== undefined && origin.isConnected) {
          origin.focus()
        }
      }),
  )

/** Mount attribute on the banner root: remembers the element focused before
   the banner and returns focus to it when the banner unmounts while holding
   focus (dismiss). Emits no messages — the handoff happens entirely in the
   mount's release. */
export const focusOriginMount = <Msg>(h: HtmlBuilder<Msg>): Attribute<Msg> =>
  h.OnMount({
    name: 'ObserveFocusOrigin',
    f: element =>
      Stream.callback<never>(() =>
        Effect.gen(function* () {
          yield* acquireFocusOrigin(element)
          return yield* Effect.never
        }),
      ),
  })
