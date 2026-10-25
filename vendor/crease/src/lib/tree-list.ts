/* Ported from Meta Astryx TreeList (packages/core/src/TreeList/ + hooks/useTreeFocus.ts) —
   expansion overrides, roving tabindex, and the APG tree keyboard model
   (arrows, Home/End, Enter/Space activation, 500ms typeahead buffer) adapted
   to foldkit's model/update/command structure. */

import { Effect, Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import * as Command from 'foldkit/command'
import * as Dom from 'foldkit/dom'
import { defineMessageUnion } from 'foldkit/message'

export type TreeListDensity = 'compact' | 'balanced' | 'spacious'
export type TreeListVariant = 'lineGuides' | 'noGuides'

/** Recursive item configuration, mirroring astryx's `TreeListItemData`.
    `label` is `Html | string` at render time; typeahead matches on
    `typeaheadText` (default: `label` when it is a string).
    `onSelect: true` marks the row actionable (astryx `onClick`): activation
    reports `OutMessage.SelectedItem` for the parent to fold. */
export type TreeListItemData = Readonly<{
  id: string
  label: unknown
  typeaheadText?: string
  description?: string
  startContent?: unknown
  endContent?: unknown
  children?: ReadonlyArray<TreeListItemData>
  onSelect?: boolean
  href?: string
  target?: string
  isDisabled?: boolean
  isSelected?: boolean
  isExpanded?: boolean
}>

export const Model = S.Struct({
  id: S.String,
  /** Per-item expansion override, keyed by item id. Resolution:
      `expanded(item) = overrides[id] ?? item.isExpanded === true` — astryx's
      props-seed + override map. */
  expandedOverrides: S.Record(S.String, S.Boolean),
  /** The roving tab stop's item id. `none` falls back to the seeded tabbable
      item (first selected, else first enabled) — the same repair the DOM
      hook performs on mount. */
  focusedId: S.Option(S.String),
  typeahead: S.String,
  typeaheadVersion: S.Number,
})
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ToggledTreeListItem: { id: S.String, isExpanded: S.Boolean },
  FocusedTreeListItem: { id: S.String },
  MovedTreeListFocus: { id: S.String },
  PressedTreeListItemAction: { id: S.String },
  RequestedTreeListItemActivation: { id: S.String },
  AppliedTreeListTypeahead: {
    key: S.String,
    matchedId: S.Option(S.String),
  },
  CompletedFocusTreeListItem: {},
  CompletedClickTreeListItemAction: {},
  CompletedTreeListTypeaheadReset: { version: S.Number },
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  SelectedTreeListItem: { id: S.String },
})
export type OutMessage = typeof OutMessage.Type

export type InitConfig = Readonly<{
  id: string
  expandedIds?: ReadonlyArray<string>
}>

export const init = (config: InitConfig): Model => ({
  id: config.id,
  expandedOverrides: Object.fromEntries(
    (config.expandedIds ?? []).map(id => [id, true]),
  ),
  focusedId: Option.none(),
  typeahead: '',
  typeaheadVersion: 0,
})

// ---------------------------------------------------------------------------
// Pure helpers shared by view (resolving keydown intents) and tests.
// ---------------------------------------------------------------------------

export const isItemExpanded = (item: TreeListItemData, model: Model): boolean =>
  model.expandedOverrides[item.id] ?? item.isExpanded === true

export const hasChildren = (item: TreeListItemData): boolean =>
  item.children !== undefined && item.children.length > 0

export const isItemActionable = (item: TreeListItemData): boolean =>
  item.href !== undefined || item.onSelect === true

export type VisibleItem = Readonly<{
  id: string
  level: number
  isDisabled: boolean
  isExpanded: boolean
  hasChildren: boolean
  hasInnerAction: boolean
}>

/** Items in rendered (visible) order: a parent's children appear only while
    it is expanded — the same list the DOM hook queries via
    `[role="treeitem"]`. */
export const visibleItems = (
  items: ReadonlyArray<TreeListItemData>,
  model: Model,
): ReadonlyArray<VisibleItem> => {
  const out: Array<VisibleItem> = []
  const walk = (list: ReadonlyArray<TreeListItemData>, level: number): void => {
    for (const item of list) {
      const children = hasChildren(item)
      const expanded = children && isItemExpanded(item, model)
      out.push({
        id: item.id,
        level,
        isDisabled: item.isDisabled === true,
        isExpanded: expanded,
        hasChildren: children,
        hasInnerAction: isItemActionable(item),
      })
      if (expanded) {
        walk(item.children ?? [], level + 1)
      }
    }
  }
  walk(items, 1)
  return out
}

/** astryx's seed: first selected enabled item in document order, else first
    enabled, else first item. Children walk unconditionally — the seed is
    independent of expansion. */
export const findInitialTabbableId = (
  items: ReadonlyArray<TreeListItemData>,
): string | undefined => {
  let firstEnabled: string | undefined
  const walk = (list: ReadonlyArray<TreeListItemData>): string | undefined => {
    for (const item of list) {
      if (item.isSelected === true && item.isDisabled !== true) {
        return item.id
      }
      if (firstEnabled === undefined && item.isDisabled !== true) {
        firstEnabled = item.id
      }
      if (item.children !== undefined && item.children.length > 0) {
        const selected = walk(item.children)
        if (selected !== undefined) {
          return selected
        }
      }
    }
    return undefined
  }
  return walk(items) ?? firstEnabled ?? items[0]?.id
}

/** The id that carries tabindex=0 this render: the model's focus when it is
    still visible, else the seeded tabbable. */
export const tabbableId = (
  items: ReadonlyArray<TreeListItemData>,
  model: Model,
): string | undefined => {
  const visible = visibleItems(items, model)
  const focused = Option.getOrUndefined(model.focusedId)
  if (focused !== undefined && visible.some(item => item.id === focused)) {
    return focused
  }
  return (
    findInitialTabbableId(items) ?? visible.find(item => !item.isDisabled)?.id
  )
}

const NAVIGATION_KEYS: ReadonlySet<string> = new Set([
  'ArrowDown',
  'ArrowUp',
  'ArrowRight',
  'ArrowLeft',
  'Home',
  'End',
  'Enter',
  ' ',
])

export const isTypeaheadKey = (
  key: string,
  modifiers: Readonly<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }>,
): boolean =>
  key.length === 1 &&
  !modifiers.ctrlKey &&
  !modifiers.metaKey &&
  !modifiers.altKey &&
  !NAVIGATION_KEYS.has(key)

/** "aaa" collapses to a single-char query that cycles through matches. */
export const nextTypeaheadBuffer = (buffer: string, key: string): string => {
  const char = key.toLowerCase()
  const isRepeatSameChar =
    buffer.length > 0 && [...buffer].every(c => c === char)
  return isRepeatSameChar ? char : buffer + char
}

const findItem = (
  items: ReadonlyArray<TreeListItemData>,
  id: string,
): TreeListItemData | undefined => {
  for (const item of items) {
    if (item.id === id) {
      return item
    }
    const found = findItem(item.children ?? [], id)
    if (found !== undefined) {
      return found
    }
  }
  return undefined
}

const itemText = (
  items: ReadonlyArray<TreeListItemData>,
  id: string,
): string => {
  const item = findItem(items, id)
  return (
    item?.typeaheadText ?? (typeof item?.label === 'string' ? item.label : '')
  )
}

export const typeaheadMatch = (
  items: ReadonlyArray<TreeListItemData>,
  model: Model,
  query: string,
): string | undefined => {
  const visible = visibleItems(items, model)
  const focused = Option.getOrUndefined(model.focusedId)
  const currentIndex = visible.findIndex(item => item.id === focused)
  const hasCurrent = currentIndex >= 0
  const start = hasCurrent ? currentIndex : 0
  // A single-char query cycles to the next match; a longer one may re-match
  // the current item.
  const offset = hasCurrent && query.length === 1 ? 1 : 0
  const ordered = [
    ...visible.slice(start + offset),
    ...visible.slice(0, start + offset),
  ]
  return ordered.find(
    item =>
      !item.isDisabled &&
      itemText(items, item.id).trim().toLowerCase().startsWith(query),
  )?.id
}

export const itemDomId = (treeId: string, itemId: string): string =>
  `${treeId}-item-${encodeURIComponent(itemId)}`

export const itemActionDomId = (treeId: string, itemId: string): string =>
  `${itemDomId(treeId, itemId)}-action`

export const itemLabelDomId = (treeId: string, itemId: string): string =>
  `${itemDomId(treeId, itemId)}-label`

export const itemDescriptionDomId = (treeId: string, itemId: string): string =>
  `${itemDomId(treeId, itemId)}-description`

// ---------------------------------------------------------------------------
// Keyboard resolution — pure so the view only ships the resolved intent.
// ---------------------------------------------------------------------------

export type TreeKeyIntent =
  | Readonly<{ _tag: 'move'; id: string }>
  | Readonly<{ _tag: 'toggle'; id: string }>
  | Readonly<{ _tag: 'activate'; id: string }>
  | Readonly<{
      _tag: 'typeahead'
      key: string
      matchedId: Option.Option<string>
    }>
  | Readonly<{ _tag: 'none' }>

/** Next enabled item in `dir` order from `start` (clamp, no wrap). */
const enabledFrom = (
  visible: ReadonlyArray<VisibleItem>,
  start: number,
  dir: 1 | -1,
): string | undefined => {
  for (let i = start; i >= 0 && i < visible.length; i += dir) {
    const candidate = visible[i]
    if (candidate !== undefined && !candidate.isDisabled) {
      return candidate.id
    }
  }
  return undefined
}

/** Translates a physical keypress into the resolved intent — the same
    branches as astryx's `useTreeFocus` (clamp at ends, tree semantics on
    ArrowLeft/Right, Enter/Space activation, printable-key typeahead). */
export const resolveKey = (
  items: ReadonlyArray<TreeListItemData>,
  model: Model,
  key: string,
  modifiers: Readonly<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }>,
  direction: 'ltr' | 'rtl',
): TreeKeyIntent => {
  const visible = visibleItems(items, model)
  if (visible.length === 0) {
    return { _tag: 'none' }
  }
  const focused = Option.getOrUndefined(model.focusedId)
  const currentIndex = visible.findIndex(item => item.id === focused)
  const current = currentIndex >= 0 ? visible[currentIndex] : undefined

  if (isTypeaheadKey(key, modifiers)) {
    const query = nextTypeaheadBuffer(model.typeahead, key)
    const match = typeaheadMatch(items, model, query)
    return {
      _tag: 'typeahead',
      key,
      matchedId: match === undefined ? Option.none() : Option.some(match),
    }
  }
  if (!NAVIGATION_KEYS.has(key)) {
    return { _tag: 'none' }
  }

  const logicalKey =
    direction === 'rtl' && (key === 'ArrowLeft' || key === 'ArrowRight')
      ? key === 'ArrowLeft'
        ? 'ArrowRight'
        : 'ArrowLeft'
      : key

  switch (logicalKey) {
    case 'ArrowDown': {
      const target =
        enabledFrom(visible, currentIndex < 0 ? 0 : currentIndex + 1, 1) ??
        focused
      return target === undefined
        ? { _tag: 'none' }
        : { _tag: 'move', id: target }
    }
    case 'ArrowUp': {
      const target =
        enabledFrom(
          visible,
          currentIndex < 0 ? visible.length - 1 : currentIndex - 1,
          -1,
        ) ?? focused
      return target === undefined
        ? { _tag: 'none' }
        : { _tag: 'move', id: target }
    }
    case 'ArrowRight': {
      if (current === undefined) {
        return { _tag: 'none' }
      }
      if (current.hasChildren && !current.isExpanded) {
        return { _tag: 'toggle', id: current.id }
      }
      if (current.isExpanded) {
        const next = visible[currentIndex + 1]
        if (next !== undefined && next.level > current.level) {
          return { _tag: 'move', id: next.id }
        }
      }
      // Leaf: swallow the key like astryx's preventDefault.
      return { _tag: 'move', id: current.id }
    }
    case 'ArrowLeft': {
      if (current === undefined) {
        return { _tag: 'none' }
      }
      if (current.isExpanded) {
        return { _tag: 'toggle', id: current.id }
      }
      for (let i = currentIndex - 1; i >= 0; i--) {
        const candidate = visible[i]
        if (candidate !== undefined && candidate.level < current.level) {
          return { _tag: 'move', id: candidate.id }
        }
      }
      return { _tag: 'move', id: current.id }
    }
    case 'Home': {
      const target = enabledFrom(visible, 0, 1)
      return target === undefined
        ? { _tag: 'none' }
        : { _tag: 'move', id: target }
    }
    case 'End': {
      const target = enabledFrom(visible, visible.length - 1, -1)
      return target === undefined
        ? { _tag: 'none' }
        : { _tag: 'move', id: target }
    }
    case 'Enter':
    case ' ': {
      if (current === undefined || current.isDisabled) {
        // astryx does not preventDefault on a disabled row.
        return { _tag: 'none' }
      }
      if (current.hasInnerAction) {
        return { _tag: 'activate', id: current.id }
      }
      if (current.hasChildren) {
        return { _tag: 'toggle', id: current.id }
      }
      return { _tag: 'move', id: current.id }
    }
    default:
      return { _tag: 'none' }
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export const FocusTreeListItem = Command.define('FocusTreeListItem', {
  args: { domId: S.String },
  messages: [Message.CompletedFocusTreeListItem],
  execute: ({ domId }) =>
    Dom.focus(`[id="${domId}"]`).pipe(
      Effect.ignore,
      Effect.as(Message.CompletedFocusTreeListItem()),
    ),
})

export const ClickTreeListItemAction = Command.define(
  'ClickTreeListItemAction',
  {
    args: { domId: S.String },
    messages: [Message.CompletedClickTreeListItemAction],
    execute: ({ domId }) =>
      Dom.clickElement(`[id="${domId}"]`).pipe(
        Effect.ignore,
        Effect.as(Message.CompletedClickTreeListItemAction()),
      ),
  },
)

export const TYPEAHEAD_RESET_MS = 500

export const WaitBeforeResettingTypeahead = Command.define(
  'WaitBeforeResettingTreeListTypeahead',
  {
    args: { version: S.Number, delayMs: S.Number },
    messages: [Message.CompletedTreeListTypeaheadReset],
    execute: ({ version, delayMs }) =>
      Effect.sleep(`${delayMs} millis`).pipe(
        Effect.as(Message.CompletedTreeListTypeaheadReset({ version })),
      ),
  },
)

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

export type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage
>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'ToggledTreeListItem': {
      const next = { ...model.expandedOverrides }
      // `isExpanded` carries the resolved next value — the view computed it
      // against the item seed, so the model only records the override.
      next[message.id] = message.isExpanded
      return { model: { ...model, expandedOverrides: next } }
    }
    case 'FocusedTreeListItem':
      return {
        model: { ...model, focusedId: Option.some(message.id) },
      }
    case 'MovedTreeListFocus':
      return {
        model: { ...model, focusedId: Option.some(message.id) },
        commands: [
          FocusTreeListItem({ domId: itemDomId(model.id, message.id) }),
        ],
      }
    case 'PressedTreeListItemAction':
      return {
        model,
        outMessage: OutMessage.SelectedTreeListItem({ id: message.id }),
      }
    case 'RequestedTreeListItemActivation':
      // Forwards to the item's own inner action element — astryx's
      // `activateItem` clicks the row's `a[href]`/`button`; a selectable
      // row's inner button re-enters as PressedTreeListItemAction.
      return {
        model,
        commands: [
          ClickTreeListItemAction({
            domId: itemActionDomId(model.id, message.id),
          }),
        ],
      }
    case 'AppliedTreeListTypeahead': {
      const buffer = nextTypeaheadBuffer(model.typeahead, message.key)
      const version = model.typeaheadVersion + 1
      return {
        model: {
          ...model,
          typeahead: buffer,
          typeaheadVersion: version,
          focusedId: Option.match(message.matchedId, {
            onNone: () => model.focusedId,
            onSome: id => Option.some(id),
          }),
        },
        commands: [
          WaitBeforeResettingTypeahead({
            version,
            delayMs: TYPEAHEAD_RESET_MS,
          }),
          ...Option.match(message.matchedId, {
            onNone: (): Array<ReturnType<typeof FocusTreeListItem>> => [],
            onSome: id => [
              FocusTreeListItem({ domId: itemDomId(model.id, id) }),
            ],
          }),
        ],
      }
    }
    case 'CompletedTreeListTypeaheadReset':
      return message.version === model.typeaheadVersion
        ? { model: { ...model, typeahead: '' } }
        : { model }
    case 'CompletedFocusTreeListItem':
    case 'CompletedClickTreeListItemAction':
      return { model }
  }
}
