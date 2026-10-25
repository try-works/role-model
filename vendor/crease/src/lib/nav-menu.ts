/* Ported from Meta Astryx useMenuHover (packages/core/src/hooks/useMenuHover.ts) — examples and visual spec adapted to Crease UI tokens. */

import { Command, Dom, type Update } from 'foldkit'
import { Effect, Option, Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

/** Shared open/close state machine for nav flyouts (TopNavMenu, TopNavMegaMenu,
    SideNav collapsed-item flyouts, SideNav/TopNav heading menus). Mirrors
    astryx's useMenuHover: hover opens after a delay and leaves the menu
    unpinned, a click pins or dismisses, a click within `clickGuardMs` of a
    hover-open confirms instead of closing, and a deliberate close suppresses
    hover re-open for REOPEN_SUPPRESS_MS (the panel can cover the trigger). */
export const Model = S.Struct({
  id: S.String,
  openMode: S.Literals(['closed', 'hover', 'pinned']),
  hoverOpenedAtMs: S.Number,
  isTriggerHovered: S.Boolean,
  lastClosedAtMs: S.Option(S.Number),
  showDelayMs: S.Number,
  closeDelayMs: S.Number,
  clickGuardMs: S.Number,
  ownsFocus: S.Boolean,
  showVersion: S.Number,
  closeVersion: S.Number,
})
export type Model = typeof Model.Type

export const REOPEN_SUPPRESS_MS = 300

export const Message = defineMessageUnion({
  EnteredNavMenuTrigger: {},
  RecordedNavMenuEnter: { atMs: S.Number },
  LeftNavMenuTrigger: {},
  EnteredNavMenuPanel: {},
  LeftNavMenuPanel: {},
  /** Pointer activation (OnPointerDown supplies the event timestamp). */
  PressedNavMenuTrigger: { atMs: S.Number },
  /** Keyboard activation (Enter/Space) — always opens and focuses the menu. */
  ActivatedNavMenuTrigger: {},
  PressedNavMenuBackdrop: {},
  PressedEscapeNavMenu: {},
  /** In-panel close affordance (popover heading / close button). */
  ClosedNavMenu: {},
  SelectedNavMenuItem: {},
  RecordedNavMenuClose: { atMs: S.Number },
  CompletedNavMenuFocusTrigger: {},
  CompletedNavMenuFocusFirstItem: {},
  CompletedWaitBeforeShowingNavMenu: { version: S.Number, atMs: S.Number },
  CompletedWaitBeforeClosingNavMenu: { version: S.Number, atMs: S.Number },
})
export type Message = typeof Message.Type

export type InitConfig = Readonly<{
  id: string
  showDelayMs?: number
  closeDelayMs?: number
  clickGuardMs?: number
  /** When true, deliberate opens move focus to the first menu item. */
  ownsFocus?: boolean
}>

export const init = (config: InitConfig): Model => ({
  id: config.id,
  openMode: 'closed',
  hoverOpenedAtMs: 0,
  isTriggerHovered: false,
  lastClosedAtMs: Option.none(),
  showDelayMs: config.showDelayMs ?? 150,
  closeDelayMs: config.closeDelayMs ?? 200,
  clickGuardMs: config.clickGuardMs ?? 500,
  ownsFocus: config.ownsFocus ?? true,
  showVersion: 0,
  closeVersion: 0,
})

export const isOpen = (model: Model): boolean => model.openMode !== 'closed'

export const triggerDomId = (menuId: string): string => `${menuId}-trigger`
export const panelDomId = (menuId: string): string => `${menuId}-panel`

const FIRST_ITEM_SELECTOR = (panelId: string): string =>
  `[id="${panelId}"] :is(a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"]))`

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/** Timestamps come from the runtime — messages never carry a clock. */
export const StampNavMenuEnter = Command.define('StampNavMenuEnter', {
  args: {},
  messages: [Message.RecordedNavMenuEnter],
  execute: () =>
    Effect.sync(() => Date.now()).pipe(
      Effect.map(atMs => Message.RecordedNavMenuEnter({ atMs })),
    ),
})

export const StampNavMenuClose = Command.define('StampNavMenuClose', {
  args: {},
  messages: [Message.RecordedNavMenuClose],
  execute: () =>
    Effect.sync(() => Date.now()).pipe(
      Effect.map(atMs => Message.RecordedNavMenuClose({ atMs })),
    ),
})

export const WaitBeforeShowingNavMenu = Command.define(
  'WaitBeforeShowingNavMenu',
  {
    args: { version: S.Number, delayMs: S.Number },
    messages: [Message.CompletedWaitBeforeShowingNavMenu],
    execute: ({ version, delayMs }) =>
      Effect.sleep(`${delayMs} millis`).pipe(
        Effect.map(() => Date.now()),
        Effect.map(atMs =>
          Message.CompletedWaitBeforeShowingNavMenu({ version, atMs }),
        ),
      ),
  },
)

export const WaitBeforeClosingNavMenu = Command.define(
  'WaitBeforeClosingNavMenu',
  {
    args: { version: S.Number, delayMs: S.Number },
    messages: [Message.CompletedWaitBeforeClosingNavMenu],
    execute: ({ version, delayMs }) =>
      Effect.sleep(`${delayMs} millis`).pipe(
        Effect.map(() => Date.now()),
        Effect.map(atMs =>
          Message.CompletedWaitBeforeClosingNavMenu({ version, atMs }),
        ),
      ),
  },
)

export const FocusNavMenuTrigger = Command.define('FocusNavMenuTrigger', {
  args: { domId: S.String },
  messages: [Message.CompletedNavMenuFocusTrigger],
  execute: ({ domId }) =>
    Dom.focus(`[id="${domId}"]`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedNavMenuFocusTrigger()),
    ),
})

export const FocusFirstNavMenuItem = Command.define('FocusFirstNavMenuItem', {
  args: { domId: S.String },
  messages: [Message.CompletedNavMenuFocusFirstItem],
  execute: ({ domId }) =>
    Dom.focus(FIRST_ITEM_SELECTOR(domId)).pipe(
      Effect.catch(() => Dom.focus(`[id="${domId}"]`, { makeFocusable: true })),
      Effect.ignore,
      Effect.as(Message.CompletedNavMenuFocusFirstItem()),
    ),
})

type UpdateReturn = Update.Return<Model, Message>

const close = (model: Model): Model => ({
  ...model,
  openMode: 'closed',
  hoverOpenedAtMs: 0,
  isTriggerHovered: false,
  showVersion: model.showVersion + 1,
  closeVersion: model.closeVersion + 1,
})

const openPinned = (model: Model): Model => ({
  ...model,
  openMode: 'pinned',
  hoverOpenedAtMs: 0,
  showVersion: model.showVersion + 1,
  closeVersion: model.closeVersion + 1,
})

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'EnteredNavMenuTrigger': {
      const next = {
        ...model,
        isTriggerHovered: true,
        showVersion: model.showVersion + 1,
        closeVersion: model.closeVersion + 1,
      }
      // Re-entering an open trigger must not un-pin it; the recorded enter
      // applies the reopen-suppression check before arming the show timer.
      return isOpen(model)
        ? { model: next }
        : { model: next, commands: [StampNavMenuEnter({})] }
    }
    case 'RecordedNavMenuEnter': {
      const suppressed = Option.match(model.lastClosedAtMs, {
        onNone: () => false,
        onSome: closedAt => message.atMs - closedAt < REOPEN_SUPPRESS_MS,
      })
      if (suppressed || isOpen(model) || !model.isTriggerHovered) {
        return { model }
      }
      const showVersion = model.showVersion + 1
      return {
        model: { ...model, showVersion },
        commands: [
          WaitBeforeShowingNavMenu({
            version: showVersion,
            delayMs: model.showDelayMs,
          }),
        ],
      }
    }
    case 'LeftNavMenuTrigger': {
      const next = {
        ...model,
        isTriggerHovered: false,
        showVersion: model.showVersion + 1,
      }
      if (model.openMode !== 'hover') {
        return { model: next }
      }
      const closeVersion = model.closeVersion + 1
      return {
        model: { ...next, closeVersion },
        commands: [
          WaitBeforeClosingNavMenu({
            version: closeVersion,
            delayMs: model.closeDelayMs,
          }),
        ],
      }
    }
    case 'EnteredNavMenuPanel':
      // Cancel a pending close — the pointer crossed from the trigger.
      return {
        model: { ...model, closeVersion: model.closeVersion + 1 },
      }
    case 'LeftNavMenuPanel': {
      if (model.openMode !== 'hover') {
        return { model }
      }
      const closeVersion = model.closeVersion + 1
      return {
        model: { ...model, closeVersion },
        commands: [
          WaitBeforeClosingNavMenu({
            version: closeVersion,
            delayMs: model.closeDelayMs,
          }),
        ],
      }
    }
    case 'PressedNavMenuTrigger': {
      if (!isOpen(model)) {
        const next = openPinned(model)
        return {
          model: next,
          commands: model.ownsFocus
            ? [FocusFirstNavMenuItem({ domId: panelDomId(model.id) })]
            : [],
        }
      }
      const withinGuard =
        model.openMode === 'hover' &&
        model.clickGuardMs > 0 &&
        message.atMs - model.hoverOpenedAtMs < model.clickGuardMs
      if (withinGuard) {
        // Confirm the hover-open into a pinned one.
        const next = {
          ...model,
          openMode: 'pinned' as const,
          hoverOpenedAtMs: 0,
        }
        return {
          model: next,
          commands: model.ownsFocus
            ? [FocusFirstNavMenuItem({ domId: panelDomId(model.id) })]
            : [],
        }
      }
      // Deliberate click on an open trigger dismisses; the click itself keeps
      // focus on the trigger so no restore is needed.
      return {
        model: close(model),
        commands: [StampNavMenuClose({})],
      }
    }
    case 'ActivatedNavMenuTrigger': {
      // Keyboard activation always opens (or refocuses) — never dismisses.
      if (isOpen(model)) {
        return {
          model: model,
          commands: model.ownsFocus
            ? [FocusFirstNavMenuItem({ domId: panelDomId(model.id) })]
            : [],
        }
      }
      return {
        model: openPinned(model),
        commands: model.ownsFocus
          ? [FocusFirstNavMenuItem({ domId: panelDomId(model.id) })]
          : [],
      }
    }
    case 'PressedNavMenuBackdrop':
      return { model: close(model), commands: [StampNavMenuClose({})] }
    case 'PressedEscapeNavMenu':
    case 'ClosedNavMenu':
      return {
        model: close(model),
        commands: [
          StampNavMenuClose({}),
          FocusNavMenuTrigger({ domId: triggerDomId(model.id) }),
        ],
      }
    case 'SelectedNavMenuItem':
      return { model: close(model), commands: [StampNavMenuClose({})] }
    case 'RecordedNavMenuClose':
      return {
        model: { ...model, lastClosedAtMs: Option.some(message.atMs) },
      }
    case 'CompletedWaitBeforeShowingNavMenu':
      return message.version === model.showVersion &&
        model.isTriggerHovered &&
        model.openMode === 'closed'
        ? {
            model: {
              ...model,
              openMode: 'hover',
              hoverOpenedAtMs: message.atMs,
            },
          }
        : { model }
    case 'CompletedWaitBeforeClosingNavMenu':
      return message.version === model.closeVersion &&
        model.openMode === 'hover'
        ? {
            model: {
              ...model,
              openMode: 'closed',
              hoverOpenedAtMs: 0,
              isTriggerHovered: false,
            },
          }
        : { model }
    case 'CompletedNavMenuFocusTrigger':
    case 'CompletedNavMenuFocusFirstItem':
      return { model }
  }
}
