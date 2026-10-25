import { Effect, Queue, Schema as S, Stream } from 'effect'
import type { Attribute, HtmlBuilder } from 'foldkit/html'
import * as Mount from 'foldkit/mount'
import { defineMessageUnion } from 'foldkit/message'

/* Ported from Meta Astryx hooks/useClickableContainer.ts — nested-interactive
   filtering, text-selection guard, middle-click new tab, and safe-url
   navigation. The React hook's ref/container wiring became a mount-scoped
   listener stream: Pressed is emitted on qualifying surface clicks, and
   href navigation happens as a DOM side effect inside the listener. */

export const Message = defineMessageUnion({
  Pressed: {},
})
export type Message = typeof Message.Type

const INTERACTIVE_SELECTORS = [
  'button',
  'a',
  'input',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="slider"]',
  '[role="spinbutton"]',
  '[data-pressable-container]',
].join(',')

const NON_INTERACTIVE_SELECTORS = '[aria-readonly="true"]'

const hasInteractiveAncestor = (
  target: Element,
  container: Element,
): boolean => {
  let current: Element | null = target
  while (
    current !== null &&
    current !== container &&
    current !== document.body
  ) {
    if (
      current.matches(INTERACTIVE_SELECTORS) &&
      !current.matches(NON_INTERACTIVE_SELECTORS)
    ) {
      return true
    }
    current = current.parentElement
  }
  return false
}

const hasTextSelection = (container: Element): boolean => {
  if (typeof document === 'undefined' || !('getSelection' in document)) {
    return false
  }
  const selection = document.getSelection()
  if (selection === null || selection.isCollapsed) {
    return false
  }
  return container.contains(selection.anchorNode)
}

const isSafeUrl = (href: string): boolean => {
  try {
    const url = new URL(href, globalThis.location?.href)
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol)
  } catch {
    return false
  }
}

/** The delegated click target inside a pressable container — the visually
   hidden control that owns keyboard focus, the accessible label, and
   (for links) native navigation. */
export const PRESSABLE_CONTROL = '[data-pressable-control]'

const listeners = (
  element: HTMLElement,
  emitPress: (() => void) | undefined,
): Readonly<{
  click: (event: MouseEvent) => void
  mouseup: (event: MouseEvent) => void
}> => {
  const interactive = (): HTMLElement | null =>
    element.querySelector<HTMLElement>(PRESSABLE_CONTROL)

  const qualifies = (eventTarget: EventTarget | null): boolean =>
    eventTarget instanceof Element &&
    !hasInteractiveAncestor(eventTarget, element) &&
    !hasTextSelection(element)

  return {
    click: event => {
      if (!qualifies(event.target)) {
        return
      }
      emitPress?.()
      // Navigation is the DOM side of the click: a hidden <a> carries the
      // real href for keyboard users, and surface clicks delegate through it
      // (or the location when the anchor was detached).
      const anchor = interactive()
      if (
        anchor instanceof HTMLAnchorElement &&
        anchor.href.length > 0 &&
        isSafeUrl(anchor.href)
      ) {
        if (event.ctrlKey || event.metaKey || anchor.target === '_blank') {
          window.open(anchor.href, '_blank', 'noopener')
        } else if (anchor.isConnected) {
          anchor.click()
        } else {
          window.location.href = anchor.href
        }
      }
    },
    mouseup: event => {
      if (event.button !== 1 || !qualifies(event.target)) {
        return
      }
      const anchor = interactive()
      if (
        anchor instanceof HTMLAnchorElement &&
        anchor.href.length > 0 &&
        isSafeUrl(anchor.href)
      ) {
        window.open(anchor.href, '_blank', 'noopener')
      }
    },
  }
}

const acquire = (element: Element, emitPress: (() => void) | undefined) =>
  Effect.acquireRelease(
    Effect.sync(() => {
      if (!(element instanceof HTMLElement)) {
        return undefined
      }
      const handlers = listeners(element, emitPress)
      element.addEventListener('click', handlers.click)
      element.addEventListener('mouseup', handlers.mouseup)
      return handlers
    }),
    handlers =>
      Effect.sync(() => {
        if (handlers === undefined || !(element instanceof HTMLElement)) {
          return
        }
        element.removeEventListener('click', handlers.click)
        element.removeEventListener('mouseup', handlers.mouseup)
      }),
  )

export const ObservePressableContainer = Mount.defineStream(
  'ObservePressableContainer',
  {
    args: { emitPress: S.Boolean },
    messages: [Message.Pressed],
    execute: ({ element, emitPress }) =>
      Stream.callback<typeof Message.Pressed.Type>(queue =>
        Effect.gen(function* () {
          yield* acquire(
            element,
            emitPress === true
              ? () => Queue.offerUnsafe(queue, Message.Pressed())
              : undefined,
          )
          return yield* Effect.never
        }),
      ),
  },
)

/** Mount attribute wiring: emits `onPress` on qualifying surface clicks, and
   always installs the navigation/text-selection/interactive filters. When
   `onPress` is absent the same listeners run without emitting (href-only
   cards still navigate and still skip nested interactive elements). */
export const pressableAttributes = <Msg>(
  h: HtmlBuilder<Msg>,
  onPress: Msg | undefined,
): ReadonlyArray<Attribute<Msg>> => {
  if (onPress === undefined) {
    return [
      h.OnMount({
        name: 'ObservePressableContainer',
        f: element =>
          Stream.callback<never>(() =>
            Effect.gen(function* () {
              yield* acquire(element, undefined)
              return yield* Effect.never
            }),
          ),
      }),
    ]
  }
  return [
    h.OnMount(
      Mount.mapMessage(
        ObservePressableContainer({ emitPress: true }),
        () => onPress,
      ),
    ),
  ]
}
