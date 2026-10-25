/* Ported from Meta Astryx useListFocus (packages/core/src/hooks/useListFocus.ts) and
   Toolbar keyboard wiring (packages/core/src/Toolbar/Toolbar.tsx) — examples and
   visual spec adapted to Crease UI tokens. */

import { Effect, Queue, Schema as S, Stream } from 'effect'
import * as Mount from 'foldkit/mount'
import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
  CompletedFocusToolbarItems: {},
})
export type Message = typeof Message.Type

/** Focusable items the toolbar's roving tabindex manages. Matches astryx's
    Toolbar itemSelector. */
export const TOOLBAR_ITEM_SELECTOR = 'button, input, [tabindex]'

/** Data attribute consumers stamp on transparent-padding items (ghost
    buttons, tab rows) so the toolbar slot can pull them flush to the edge
    via :has(). Mirrors astryx's data-astryx-edge-comp. */
export const TOOLBAR_EDGE_COMP_ATTR = 'data-crease-edge-comp'

// Text-editing inputs whose caret must not be hijacked by arrow navigation.
const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'number',
])

const isItemDisabled = (el: HTMLElement): boolean =>
  el.getAttribute('aria-disabled') === 'true' ||
  (el as HTMLButtonElement).disabled === true ||
  el.hasAttribute('disabled')

const getContentEditableRoot = (el: HTMLElement): HTMLElement | null => {
  if (el.isContentEditable === true) {
    return el.closest<HTMLElement>('[contenteditable]') ?? el
  }
  const candidate = el.closest<HTMLElement>('[contenteditable]')
  if (candidate && candidate.getAttribute('contenteditable') !== 'false') {
    return candidate
  }
  return null
}

/** Whether an arrow/Home/End key should be left to the browser because the
    event target is a text-editing element whose caret is not yet at the
    boundary in the direction of travel (or a selection is present). */
const shouldDeferToCaret = (
  target: EventTarget | null,
  key: string,
): boolean => {
  if (!(target instanceof HTMLElement)) return false
  const editableRoot = getContentEditableRoot(target)
  if (editableRoot) {
    const selection =
      typeof window !== 'undefined' ? window.getSelection() : null
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      return true
    }
    return (editableRoot.textContent ?? '').length > 0
  }
  const isTextarea = target.tagName === 'TEXTAREA'
  const isTextInput =
    target.tagName === 'INPUT' &&
    TEXT_INPUT_TYPES.has((target as HTMLInputElement).type)
  if (!isTextarea && !isTextInput) return false
  const input = target as HTMLInputElement | HTMLTextAreaElement
  const { selectionStart, selectionEnd, value } = input
  if (selectionStart !== selectionEnd) return true
  if (selectionStart == null) return true
  if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'Home') {
    return selectionStart > 0
  }
  if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'End') {
    return selectionStart < value.length
  }
  return false
}

const isRtlElement = (el: HTMLElement | null): boolean => {
  if (!el || typeof window === 'undefined') return false
  return window.getComputedStyle(el).direction === 'rtl'
}

const findEnabledIndex = (
  items: ReadonlyArray<HTMLElement>,
  isDisabled: (el: HTMLElement) => boolean,
  start: number,
  step: 1 | -1,
  shouldWrap: boolean,
): number => {
  const count = items.length
  if (count === 0) return -1
  let index = start
  for (let i = 0; i < count; i++) {
    if (index < 0 || index >= count) {
      if (!shouldWrap) return -1
      index = (index + count) % count
    }
    const item = items[index]
    if (item && !isDisabled(item)) return index
    index += step
  }
  return -1
}

const setTabIndex = (el: HTMLElement, value: 0 | -1): void => {
  if (el.getAttribute('tabindex') !== String(value)) {
    el.setAttribute('tabindex', String(value))
  }
}

export const FocusToolbarItems = Mount.defineStream('FocusToolbarItems', {
  args: { orientation: S.Literals(['horizontal', 'vertical']) },
  messages: [Message.CompletedFocusToolbarItems],
  execute: ({ element, orientation }) =>
    Stream.callback<typeof Message.CompletedFocusToolbarItems.Type>(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() => {
            if (!(element instanceof HTMLElement)) return undefined

            const getItems = (): Array<HTMLElement> =>
              Array.from(
                element.querySelectorAll<HTMLElement>(TOOLBAR_ITEM_SELECTOR),
              )

            /** Stamp the roving tab stop: exactly one enabled item is tabbable
                (0), the rest are -1. Prefer keeping the currently-tabbable item
                if it is still enabled; otherwise promote the first enabled. */
            const syncTabStops = (): void => {
              const items = getItems()
              const enabled = items.filter(el => !isItemDisabled(el))
              if (enabled.length === 0) return
              const current = enabled.find(
                el => el.getAttribute('tabindex') === '0',
              )
              const tabbable = current ?? enabled[0]
              for (const el of items) {
                setTabIndex(el, el === tabbable ? 0 : -1)
              }
            }

            const getCurrentIndex = (
              items: ReadonlyArray<HTMLElement>,
            ): number => {
              const active = document.activeElement
              return items.findIndex(
                item => item === active || item.contains(active),
              )
            }

            const focusIndex = (
              items: ReadonlyArray<HTMLElement>,
              index: number,
            ): void => {
              const target = items[index]
              if (!target) return
              for (const el of items) {
                setTabIndex(el, el === target ? 0 : -1)
              }
              target.focus()
            }

            const onKeyDown = (event: KeyboardEvent): void => {
              if (
                event.defaultPrevented ||
                event.ctrlKey ||
                event.metaKey ||
                event.altKey
              )
                return

              const horizontal = orientation === 'horizontal'
              const rtl =
                horizontal &&
                (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
                  ? isRtlElement(element)
                  : false

              const nextKeys: Array<string> = []
              const prevKeys: Array<string> = []
              if (horizontal) {
                nextKeys.push(rtl ? 'ArrowLeft' : 'ArrowRight')
                prevKeys.push(rtl ? 'ArrowRight' : 'ArrowLeft')
              } else {
                nextKeys.push('ArrowDown')
                prevKeys.push('ArrowUp')
              }

              const isNext = nextKeys.includes(event.key)
              const isPrev = prevKeys.includes(event.key)
              const isHome = event.key === 'Home'
              const isEnd = event.key === 'End'
              if (!isNext && !isPrev && !isHome && !isEnd) return

              if (
                shouldDeferToCaret(event.target, event.key) ||
                shouldDeferToCaret(document.activeElement, event.key)
              ) {
                return
              }

              const items = getItems()
              const currentIndex = getCurrentIndex(items)

              if (isNext) {
                const from = currentIndex === -1 ? 0 : currentIndex + 1
                const next = findEnabledIndex(
                  items,
                  isItemDisabled,
                  from,
                  1,
                  true,
                )
                if (next !== -1) focusIndex(items, next)
              } else if (isPrev) {
                const from =
                  currentIndex === -1 ? items.length - 1 : currentIndex - 1
                const prev = findEnabledIndex(
                  items,
                  isItemDisabled,
                  from,
                  -1,
                  true,
                )
                if (prev !== -1) focusIndex(items, prev)
              } else if (isHome) {
                const first = findEnabledIndex(
                  items,
                  isItemDisabled,
                  0,
                  1,
                  false,
                )
                if (first !== -1) focusIndex(items, first)
              } else if (isEnd) {
                const last = findEnabledIndex(
                  items,
                  isItemDisabled,
                  items.length - 1,
                  -1,
                  false,
                )
                if (last !== -1) focusIndex(items, last)
              }

              event.preventDefault()
            }

            const onFocusIn = (): void => syncTabStops()

            const observer = new MutationObserver(() => syncTabStops())
            observer.observe(element, {
              attributes: true,
              attributeFilter: ['disabled', 'aria-disabled'],
              childList: true,
              subtree: true,
            })

            element.addEventListener('keydown', onKeyDown)
            element.addEventListener('focusin', onFocusIn)
            syncTabStops()
            Queue.offerUnsafe(queue, Message.CompletedFocusToolbarItems({}))
            return { observer, onKeyDown, onFocusIn }
          }),
          resource =>
            Effect.sync(() => {
              if (resource === undefined || !(element instanceof HTMLElement)) {
                return
              }
              resource.observer.disconnect()
              element.removeEventListener('keydown', resource.onKeyDown)
              element.removeEventListener('focusin', resource.onFocusIn)
            }),
        )
        return yield* Effect.never
      }),
    ),
})

export const focusToolbarItemsMount = <Msg>(
  toParentMessage: (message: Message) => Msg,
  orientation: 'horizontal' | 'vertical',
) => Mount.mapMessage(FocusToolbarItems({ orientation }), toParentMessage)
