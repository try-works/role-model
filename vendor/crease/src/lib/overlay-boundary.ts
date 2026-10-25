import { Effect, Schema as S } from 'effect'
import * as Mount from 'foldkit/mount'
import { Anchor, Combobox, Listbox, Popover } from '@foldkit/ui'

/**
 * Crease themes may be scoped below the document root (all renderers). Foldkit's
 * default portal moves anchored content to `document.body`, where inherited
 * theme variables are unavailable. Keep overlays in the themed subtree
 * so inheritance remains deterministic.
 *
 * Overlays that must escape clipping use the theme-copying Mount below.
 * Components must not opt into the body portal without this boundary.
 */
export const THEMED_OVERLAY_PORTAL = false as const

export const themedAnchor = <
  const Anchor extends Readonly<Record<string, unknown>>,
>(
  anchor: Anchor,
): Anchor & Readonly<{ portal: false }> => ({
  ...anchor,
  portal: THEMED_OVERLAY_PORTAL,
})

/** Snapshot inherited custom properties before portaling, and keep them in
 * sync with theme changes on the original ancestors. Preserve direction and
 * the theme's font as well. Restore inline styles and observers on unmount. */
/* `@property { inherits: false }` variables (e.g. Tailwind's `--tw-shadow`)
   never inherit, so copying the parent's value would clobber the panel's own. */
const nonInheritedProperties = (document: Document): ReadonlySet<string> => {
  const names = new Set<string>()
  const visit = (rules: CSSRuleList) => {
    for (const rule of rules) {
      if (rule instanceof CSSPropertyRule) {
        if (!rule.inherits) names.add(rule.name)
      } else if ('cssRules' in rule && rule.cssRules instanceof CSSRuleList) {
        visit(rule.cssRules)
      }
    }
  }
  for (const sheet of document.styleSheets) {
    try {
      visit(sheet.cssRules)
    } catch {
      // Cross-origin sheets are unreadable and cannot register theme roles.
    }
  }
  return names
}

const inheritPortalTheme = (element: HTMLElement): (() => void) => {
  const source = element.parentElement
  if (!source) return () => {}
  const skipped = nonInheritedProperties(element.ownerDocument)
  const saved = new Map<string, { value: string; priority: string }>()
  let inherited = new Set<string>()
  const restore = (name: string) => {
    const previous = saved.get(name)
    if (previous?.value)
      element.style.setProperty(name, previous.value, previous.priority)
    else element.style.removeProperty(name)
  }
  const refresh = () => {
    const computed = element.ownerDocument.defaultView?.getComputedStyle(source)
    if (!computed) return
    const next = new Set<string>(['direction', 'font-family', 'color-scheme'])
    for (let index = 0; index < computed.length; index++) {
      const name = computed.item(index)
      if (name.startsWith('--') && !skipped.has(name)) next.add(name)
    }
    for (const name of next) {
      if (!saved.has(name))
        saved.set(name, {
          value: element.style.getPropertyValue(name),
          priority: element.style.getPropertyPriority(name),
        })
      element.style.setProperty(name, computed.getPropertyValue(name))
    }
    for (const name of inherited) if (!next.has(name)) restore(name)
    inherited = next
  }
  refresh()
  const observer = new MutationObserver(refresh)
  for (
    let ancestor: Element | null = source;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    observer.observe(ancestor, {
      attributes: true,
      attributeFilter: ['class', 'style', 'dir'],
    })
  }
  return () => {
    observer.disconnect()
    for (const name of saved.keys()) restore(name)
  }
}

/** Combobox anchoring with an explicit theme-preserving portal. The input
 * keeps focus on option presses, matching Foldkit's AnchorCombobox Mount. */
export const AnchorThemedCombobox = Mount.define('AnchorThemedCombobox', {
  args: { buttonId: S.String, anchor: Anchor.AnchorConfig },
  messages: [Combobox.Message.CompletedAnchorCombobox],
  execute: ({ element, buttonId, anchor }) =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          if (!(element instanceof HTMLElement)) return () => {}
          const releaseTheme = inheritPortalTheme(element)
          const preventBlur = (event: PointerEvent) => event.preventDefault()
          element.addEventListener('pointerdown', preventBlur, {
            capture: true,
          })
          const releaseAnchor = Anchor.anchorSetup(element, {
            buttonId,
            anchor: { ...anchor, portal: true },
            interceptTab: false,
          })
          return () => {
            releaseAnchor()
            element.removeEventListener('pointerdown', preventBlur, {
              capture: true,
            })
            releaseTheme()
          }
        }),
        release => Effect.sync(release),
      )
      return Combobox.Message.CompletedAnchorCombobox()
    }),
})

export const themedComboboxPanel = <Msg>(
  buttonId: string,
  anchor: Anchor.AnchorConfig,
  send: (message: Combobox.Message) => Msg,
) => Mount.mapMessage(AnchorThemedCombobox({ buttonId, anchor }), send)

/** Listbox anchoring with an explicit theme-preserving portal. Matches
 * Foldkit's AnchorListbox Mount, which focuses the list after positioning. */
export const AnchorThemedListbox = Mount.define('AnchorThemedListbox', {
  args: { buttonId: S.String, anchor: Anchor.AnchorConfig },
  messages: [Listbox.Message.CompletedAnchorListbox],
  execute: ({ element, buttonId, anchor }) =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          if (!(element instanceof HTMLElement)) return () => {}
          const releaseTheme = inheritPortalTheme(element)
          const releaseAnchor = Anchor.anchorSetup(element, {
            buttonId,
            anchor: { ...anchor, portal: true },
            focusAfterPosition: true,
          })
          return () => {
            releaseAnchor()
            releaseTheme()
          }
        }),
        release => Effect.sync(release),
      )
      return Listbox.Message.CompletedAnchorListbox()
    }),
})

export const themedListboxPanel = <Msg>(
  buttonId: string,
  anchor: Anchor.AnchorConfig,
  send: (message: Listbox.Message) => Msg,
) => Mount.mapMessage(AnchorThemedListbox({ buttonId, anchor }), send)

/** Popover anchoring with an explicit theme-preserving portal, for panels that
 * must escape a clipping (overflow) ancestor. */
export const AnchorThemedPopover = Mount.define('AnchorThemedPopover', {
  args: {
    buttonId: S.String,
    anchor: Anchor.AnchorConfig,
    focusSelector: S.optional(S.String),
    arrowId: S.optional(S.String),
  },
  messages: [Popover.Message.CompletedAnchorPopover],
  execute: ({ element, buttonId, anchor, focusSelector, arrowId }) =>
    Effect.gen(function* () {
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          if (!(element instanceof HTMLElement)) return () => {}
          const releaseTheme = inheritPortalTheme(element)
          const releaseAnchor = Anchor.anchorSetup(element, {
            buttonId,
            anchor: { ...anchor, portal: true },
            interceptTab: false,
            focusAfterPosition: true,
            ...(focusSelector === undefined ? {} : { focusSelector }),
            ...(arrowId === undefined ? {} : { arrowId }),
          })
          return () => {
            releaseAnchor()
            releaseTheme()
          }
        }),
        release => Effect.sync(release),
      )
      return Popover.Message.CompletedAnchorPopover()
    }),
})

export const themedPopoverPanel = <Msg>(
  buttonId: string,
  anchor: Anchor.AnchorConfig,
  send: (message: Popover.Message) => Msg,
  focusSelector?: string,
  arrowId?: string,
) =>
  Mount.mapMessage(
    AnchorThemedPopover({
      buttonId,
      anchor,
      ...(focusSelector === undefined ? {} : { focusSelector }),
      ...(arrowId === undefined ? {} : { arrowId }),
    }),
    send,
  )
