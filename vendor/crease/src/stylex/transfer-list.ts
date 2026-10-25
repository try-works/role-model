import { reset } from '@/stylex/reset'
import { Command, type Update } from 'foldkit'
import { Effect, Option, Schema as S } from 'effect'
import { DragAndDrop as Dnd } from '@foldkit/ui'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import * as Icon from '@/lib/icon'
import { buttonVisualStyles } from './button'
import type { ComponentLayoutStyle } from './contracts'
import { input } from './input'
import { className } from './style'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { tokens } from './tokens.stylex'

/* Ported from Meta Astryx TransferList.tsx (packages/lab) — dual-panel
   collection input. Behavior logic mirrors ui/transfer-list.ts (reordering
   delegates to the foldkit DragAndDrop primitive); only the styling surface
   differs (stylex tokens + container queries). */

// =============================================================================
// Model
// =============================================================================

export type TransferListOption = Readonly<{
  /** Stable value written to the controlled value array. */
  value: string
  /** Visible option name and the basis of action labels. */
  label: string
  /** Optional searchable metadata. Not rendered in the default row. */
  description?: string
  /** Optional group heading on the available side. */
  group?: string
  /** Prevents moving the option between the selected and available lists. */
  isTransferDisabled?: boolean
  /** Prevents reordering the selected option and keeps its position fixed. */
  isReorderDisabled?: boolean
  /** Explains why a transfer or reorder action is unavailable. */
  disabledMessage?: string
}>

export const Model = S.Struct({
  id: S.String,
  /** Ordered selected values — the single source of truth (astryx `value`). */
  value: S.Array(S.String),
  query: S.String,
  /** Reorder session, delegated to the foldkit DragAndDrop primitive. */
  dnd: Dnd.Model,
  /** Latest text for the polite aria-live region (astryx useAnnounce). */
  announcement: S.String,
  /** Swallows the click that follows a pointer drag's pointerup. */
  suppressNextHandleClick: S.Boolean,
})
export type Model = typeof Model.Type

export const init = (config: {
  id: string
  value?: ReadonlyArray<string>
}): Model => ({
  id: config.id,
  value: [...(config.value ?? [])],
  query: '',
  dnd: Dnd.init({
    id: `${config.id}-reorder`,
    orientation: 'Vertical',
  }),
  announcement: '',
  suppressNextHandleClick: false,
})

export const Message = defineMessageUnion({
  SearchedTransferList: { query: S.String },
  ClickedTransferListAdd: {
    value: S.String,
    label: S.String,
    index: S.Number,
  },
  ClickedTransferListRemove: {
    value: S.String,
    label: S.String,
    index: S.Number,
  },
  ClickedTransferListAddAll: {},
  ClickedTransferListClear: {},
  ClickedReorderHandle: { value: S.String, label: S.String },
  /** Envelope for the DragAndDrop primitive's message universe — pointer
      presses, document-level pointer/key events, and command completions
      all arrive through this tag. */
  GotDndMessage: { message: Dnd.Message },
  CompletedFocusAfterTransfer: {},
})

export type Message = typeof Message.Type

/** Document-level subscriptions the host installs for reordering: pointer
    tracking, Escape, keyboard moves, and edge auto-scroll. Lift them onto
    the child's dnd model like the Slider drag subscriptions — see the
    transfer-list docs example. */
export const subscriptions = Dnd.subscriptions

export const OutMessage = defineMessageUnion({
  ChangedTransferList: { value: S.Array(S.String) },
})
export type OutMessage = typeof OutMessage.Type

/** Focuses the next enabled row action after a transfer (astryx rAF focus). */
const FocusAfterTransfer = Command.define('FocusAfterTransfer', {
  args: { rootId: S.String, side: S.String, index: S.Number },
  messages: [Message.CompletedFocusAfterTransfer],
  execute: ({ rootId, side, index }) =>
    Effect.sync(() => {
      const panel = document.getElementById(`${rootId}-panel-${side}`)
      const actions = panel?.querySelectorAll<HTMLButtonElement>(
        `[data-transfer-list-action="${side}"]:not(:disabled):not([aria-disabled="true"])`,
      )
      if (actions !== undefined && actions !== null && actions.length > 0) {
        actions[Math.min(index, actions.length - 1)]?.focus()
      } else {
        document.getElementById(`${rootId}-search`)?.focus()
      }
    }).pipe(Effect.as(Message.CompletedFocusAfterTransfer())),
})

type UpdateReturn = Update.ReturnWithOutMessage<Model, Message, OutMessage>

const commit = (
  model: Model,
  nextValue: ReadonlyArray<string>,
  announcement: string,
  commands: Update.Commands<Message> = [],
): UpdateReturn => ({
  model: { ...model, value: [...nextValue], announcement },
  commands,
  outMessage: OutMessage.ChangedTransferList({ value: [...nextValue] }),
})

const announceAdded = (label: string, count: number): string =>
  `${label} added. ${String(count)} selected.`
const announceRemoved = (label: string, count: number): string =>
  `${label} removed. ${String(count)} selected.`
const announceBulkAdded = (count: number): string =>
  `${String(count)} options added.`
const announceBulkRemoved = (count: number): string =>
  `${String(count)} options removed.`
const announceGrabbed = (
  label: string,
  position: number,
  total: number,
): string =>
  `${label} grabbed. Current position ${String(position)} of ${String(total)}. Use arrow keys to move, Enter or Space to drop, Escape to cancel.`
const announceDropped = (
  label: string,
  position: number,
  total: number,
): string =>
  `${label} dropped. Position ${String(position)} of ${String(total)}.`
const announceReturned = (label: string, position: number): string =>
  `${label} returned to position ${String(position)}.`
const announceMoveCancelled = (label: string): string =>
  `${label} move cancelled.`
const announceMovedToPosition = (
  label: string,
  position: number,
  total: number,
): string =>
  `${label} moved to position ${String(position)} of ${String(total)}.`
const announceSearchResults = (count: number): string =>
  `${String(count)} results.`

const movableRange = (
  optionValue: string,
  orderedValue: ReadonlyArray<string>,
  optionByValue: ReadonlyMap<string, TransferListOption>,
): { index: number; start: number; end: number } => {
  const index = orderedValue.indexOf(optionValue)
  let start = 0
  let end = orderedValue.length - 1
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const option = optionByValue.get(orderedValue[cursor] ?? '')
    if (option === undefined || option.isReorderDisabled === true) {
      start = cursor + 1
      break
    }
  }
  for (let cursor = index + 1; cursor < orderedValue.length; cursor += 1) {
    const option = optionByValue.get(orderedValue[cursor] ?? '')
    if (option === undefined || option.isReorderDisabled === true) {
      end = cursor - 1
      break
    }
  }
  return { index, start, end }
}

const moveItem = (
  value: ReadonlyArray<string>,
  fromIndex: number,
  toIndex: number,
): ReadonlyArray<string> => {
  const nextValue = [...value]
  const item = nextValue.splice(fromIndex, 1)[0]
  if (item === undefined) {
    return nextValue
  }
  nextValue.splice(toIndex, 0, item)
  return nextValue
}

/** The selected panel is the only sortable container — the primitive's
    insertion index counts every `[data-sortable-id]` row including the
    dragged one, so it converts to a final (post-move) index before the
    movable-range clamp + `moveItem`. */
const selectedContainerId = (model: Model): string => `${model.id}-selected`

const draggedItemId = (model: Model): string | null => {
  const dragState = model.dnd.dragState
  return dragState._tag === 'Idle' ? null : dragState.itemId
}

/** Resolves the dragged row's final index from the live drag state, or null
    when nothing is being dragged toward a real slot. Pointer drags report
    an insertion index into the DOM (dragged row still counted); keyboard
    drags report the target index directly. */
const finalDropIndex = (model: Model): number | null => {
  const dragState = model.dnd.dragState
  const containerId = selectedContainerId(model)
  if (
    dragState._tag === 'Dragging' &&
    Option.isSome(dragState.maybeDropTarget) &&
    dragState.maybeDropTarget.value.containerId === containerId
  ) {
    const insertionIndex = dragState.maybeDropTarget.value.index
    return insertionIndex > dragState.sourceIndex
      ? insertionIndex - 1
      : insertionIndex
  }
  if (
    dragState._tag === 'KeyboardDragging' &&
    dragState.targetContainerId === containerId
  ) {
    return dragState.targetIndex
  }
  return null
}

/** Runs one DragAndDrop primitive message through the child model and
    translates its outcome into crease announcements + the public
    ChangedTransferList out-message. */
const runDnd = (
  model: Model,
  optionByValue: ReadonlyMap<string, TransferListOption>,
  message: Dnd.Message,
  isReorderable: boolean,
): UpdateReturn => {
  if (!isReorderable) {
    return { model }
  }
  const containerId = selectedContainerId(model)
  const prevState = model.dnd.dragState
  if (
    message._tag === 'PressedDraggable' &&
    (message.containerId !== containerId ||
      !model.value.includes(message.itemId) ||
      optionByValue.get(message.itemId)?.isReorderDisabled === true)
  ) {
    return { model }
  }
  const result = Dnd.update(model.dnd, message)
  const dnd = result.model
  const dragState = dnd.dragState
  const commands = Command.mapMessages(result.commands ?? [], inner =>
    Message.GotDndMessage({ message: inner }),
  )
  const labelOf = (itemId: string): string =>
    optionByValue.get(itemId)?.label ?? itemId
  let announcement = model.announcement
  let value = model.value
  const suppressNextHandleClick =
    model.suppressNextHandleClick || message._tag === 'PressedDraggable'
  let outMessage: OutMessage | undefined

  if (
    dragState._tag === 'KeyboardDragging' &&
    prevState._tag !== 'KeyboardDragging'
  ) {
    announcement = announceGrabbed(
      labelOf(dragState.itemId),
      dragState.sourceIndex + 1,
      value.length,
    )
  }
  const targetNow = finalDropIndex({ ...model, dnd })
  const targetBefore = finalDropIndex(model)
  if (
    targetNow !== null &&
    (targetBefore === null
      ? targetNow !==
        (dragState._tag === 'Dragging' || dragState._tag === 'KeyboardDragging'
          ? dragState.sourceIndex
          : -1)
      : targetNow !== targetBefore) &&
    (dragState._tag === 'Dragging' || dragState._tag === 'KeyboardDragging')
  ) {
    announcement = announceMovedToPosition(
      labelOf(dragState.itemId),
      targetNow + 1,
      value.length,
    )
  }

  if (result.outMessage !== undefined) {
    switch (result.outMessage._tag) {
      case 'Cancelled': {
        if (
          prevState._tag === 'Dragging' ||
          prevState._tag === 'KeyboardDragging'
        ) {
          announcement = announceMoveCancelled(labelOf(prevState.itemId))
        }
        break
      }
      case 'Reordered': {
        const out = result.outMessage
        const label = labelOf(out.itemId)
        /* Drops on a foreign droppable (the available panel has none, but a
           sibling TransferList's selected panel does) leave value unchanged. */
        if (out.toContainerId !== containerId) {
          announcement = announceReturned(label, out.fromIndex + 1)
          break
        }
        const rawIndex =
          prevState._tag === 'Dragging' && out.toIndex > out.fromIndex
            ? out.toIndex - 1
            : out.toIndex
        const { start, end } = movableRange(out.itemId, value, optionByValue)
        const clamped = Math.max(start, Math.min(end, rawIndex))
        if (clamped === out.fromIndex) {
          announcement = announceReturned(label, out.fromIndex + 1)
          break
        }
        value = moveItem(value, out.fromIndex, clamped)
        announcement = announceDropped(label, clamped + 1, value.length)
        outMessage = OutMessage.ChangedTransferList({ value: [...value] })
        break
      }
    }
  }
  return {
    model: {
      ...model,
      value,
      dnd,
      announcement,
      suppressNextHandleClick,
    },
    commands,
    ...(outMessage === undefined ? {} : { outMessage }),
  }
}

/** update needs the option catalog for movableRange + isReorderable — the
    view supplies both through the messages that can start a gesture. */
export const update = (
  model: Model,
  message: Message,
  options: ReadonlyArray<TransferListOption> = [],
  isReorderable = true,
): UpdateReturn => {
  const optionByValue = new Map(options.map(option => [option.value, option]))
  switch (message._tag) {
    case 'SearchedTransferList': {
      const normalized = message.query.trim().toLowerCase()
      return {
        model: {
          ...model,
          query: message.query,
          announcement:
            normalized === ''
              ? ''
              : announceSearchResults(
                  options.filter(option => matchesQuery(option, normalized))
                    .length,
                ),
        },
      }
    }
    case 'ClickedTransferListAdd': {
      const option = optionByValue.get(message.value)
      if (
        option?.isTransferDisabled === true ||
        model.value.includes(message.value)
      ) {
        return { model }
      }
      const nextValue = [...model.value, message.value]
      return commit(
        model,
        nextValue,
        announceAdded(message.label, nextValue.length),
        [
          FocusAfterTransfer({
            rootId: model.id,
            side: 'available',
            index: message.index,
          }),
        ],
      )
    }
    case 'ClickedTransferListRemove': {
      const option = optionByValue.get(message.value)
      if (option?.isTransferDisabled === true) {
        return { model }
      }
      const nextValue = model.value.filter(item => item !== message.value)
      return commit(
        model,
        nextValue,
        announceRemoved(message.label, nextValue.length),
        [
          FocusAfterTransfer({
            rootId: model.id,
            side: 'selected',
            index: message.index,
          }),
        ],
      )
    }
    case 'ClickedTransferListAddAll': {
      const additions = options
        .filter(
          option =>
            option.isTransferDisabled !== true &&
            !model.value.includes(option.value),
        )
        .map(option => option.value)
      if (additions.length === 0) {
        return { model }
      }
      return commit(
        model,
        [...model.value, ...additions],
        announceBulkAdded(additions.length),
      )
    }
    case 'ClickedTransferListClear': {
      const nextValue = model.value.filter(optionValue => {
        const option = optionByValue.get(optionValue)
        return option === undefined || option.isTransferDisabled === true
      })
      const removed = model.value.length - nextValue.length
      if (removed === 0) {
        return { model }
      }
      return commit(model, nextValue, announceBulkRemoved(removed))
    }
    case 'ClickedReorderHandle': {
      /* The handle's button click arrives after a pointer press — drags set
         suppressNextHandleClick so the trailing click is swallowed, and a
         plain click toggles the keyboard drag like astryx. Enter/Space reach
         the same handler through the click they fire on a focused button. */
      if (model.suppressNextHandleClick) {
        return { model: { ...model, suppressNextHandleClick: false } }
      }
      const index = model.value.indexOf(message.value)
      const dragState = model.dnd.dragState
      if (
        index < 0 ||
        !isReorderable ||
        optionByValue.get(message.value)?.isReorderDisabled === true
      ) {
        return { model }
      }
      if (
        dragState._tag === 'KeyboardDragging' &&
        dragState.itemId === message.value
      ) {
        return runDnd(
          model,
          optionByValue,
          Dnd.Message.ConfirmedKeyboardDrop(),
          isReorderable,
        )
      }
      if (dragState._tag !== 'Idle') {
        return { model }
      }
      return runDnd(
        model,
        optionByValue,
        Dnd.Message.ActivatedKeyboardDrag({
          itemId: message.value,
          containerId: selectedContainerId(model),
          index,
        }),
        isReorderable,
      )
    }
    case 'GotDndMessage':
      return runDnd(model, optionByValue, message.message, isReorderable)
    case 'CompletedFocusAfterTransfer':
      return { model }
  }
}

// =============================================================================
// View
// =============================================================================

const matchesQuery = (option: TransferListOption, query: string): boolean => {
  if (query === '') {
    return true
  }
  return [option.label, option.description ?? '', option.group ?? ''].some(
    part => part.toLowerCase().includes(query),
  )
}

const CONTAINER_DOWN = '@container (max-width: 40rem)'
const CONTAINER_UP = '@container (min-width: 40rem)'

const styles = stylex.create({
  root: {
    gap: 0,
    containerType: 'inline-size',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    /* A size container's auto inline size is zero — give the root a definite
       width or it collapses inside shrink-to-fit parents. */
    width: '100%',
  },
  heading: {
    gap: '0.25rem',
    paddingInline: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
  description: {
    color: tokens.mutedForeground,
    display: 'block',
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
  },
  controls: {
    padding: '0.75rem',
    gap: '0.5rem',
    alignItems: 'flex-end',
    display: 'flex',
  },
  searchWrap: {
    flex: '1',
    position: 'relative',
    minWidth: 0,
  },
  searchIcon: {
    color: tokens.mutedForeground,
    pointerEvents: 'none',
    position: 'absolute',
    transform: 'translateY(-50%)',
    left: '0.625rem',
    top: '50%',
  },
  searchInput: {
    height: '2.25rem',
    paddingLeft: '2rem',
    paddingRight: '2rem',
  },
  clearSearch: {
    color: tokens.mutedForeground,
    position: 'absolute',
    transform: 'translateY(-50%)',
    right: '0.375rem',
    top: '50%',
  },
  srOnly: {
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
  panels: {
    gap: 0,
    display: 'grid',
    gridTemplateColumns: {
      [CONTAINER_DOWN]: 'minmax(0, 1fr)',
      default: 'minmax(0, 1fr) minmax(0, 1fr)',
    },
    minWidth: 0,
  },
  panel: {
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    outlineOffset: { default: '0px', ':focus-visible': '-2px' },
    minWidth: 0,
  },
  panelDivider: {
    borderBlockStartColor: tokens.border,
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: { [CONTAINER_DOWN]: 1, default: 0 },
    borderInlineStartColor: tokens.border,
    borderInlineStartStyle: 'solid',
    borderInlineStartWidth: { [CONTAINER_DOWN]: 0, default: 1 },
  },
  panelHeader: {
    gap: '0.5rem',
    paddingBlock: '0.5rem',
    paddingInline: '0.75rem',
    alignItems: 'center',
    backgroundColor: {
      [CONTAINER_DOWN]: tokens.background,
      default: 'transparent',
    },
    borderBlockEndColor: tokens.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: 1,
    display: 'flex',
    justifyContent: 'space-between',
  },
  panelHeading: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
  headerAction: {
    paddingBlock: 0,
    paddingInline: 0,
    fontWeight: 400,
    minBlockSize: '1.5rem',
    height: 'auto',
  },
  panelBody: {
    scrollbarGutter: { [CONTAINER_DOWN]: 'auto', default: 'stable' },
    padding: 0,
    overscrollBehavior: { [CONTAINER_DOWN]: 'auto', default: 'contain' },
    maxBlockSize: { [CONTAINER_DOWN]: 'none', default: '20rem' },
    minBlockSize: { [CONTAINER_DOWN]: 0, default: '12rem' },
    overflowY: { [CONTAINER_DOWN]: 'visible', default: 'auto' },
  },
  list: {
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    listStyleType: 'none',
  },
  groupHeading: {
    paddingBlock: '0.25rem',
    paddingInline: '0.75rem',
    marginBlockStart: { default: '0.25rem', ':first-child': 0 },
  },
  groupHeadingText: {
    color: tokens.foreground,
    fontSize: '0.875rem',
    fontWeight: 700,
    lineHeight: '1.25rem',
  },
  item: {
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.75rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    minWidth: 0,
  },
  itemDragging: {
    backgroundColor: tokens.accent,
  },
  itemPointerSource: {
    opacity: 0.5,
    userSelect: 'none',
  },
  itemDropBefore: {
    position: 'relative',
    '::before': {
      borderRadius: '50%',
      insetInline: 0,
      backgroundColor: tokens.primary,
      content: '""',
      pointerEvents: 'none',
      position: 'absolute',
      zIndex: 2,
      height: '0.125rem',
      top: '-0.125rem',
    },
  },
  itemDropAfter: {
    position: 'relative',
    '::after': {
      borderRadius: '50%',
      insetInline: 0,
      backgroundColor: tokens.primary,
      content: '""',
      pointerEvents: 'none',
      position: 'absolute',
      zIndex: 2,
      bottom: '-0.125rem',
      height: '0.125rem',
    },
  },
  itemLabel: {
    flex: '1',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    minWidth: 0,
  },
  iconButton: {
    color: tokens.mutedForeground,
  },
  /* PORT-NOTE: astryx uses grab/grabbing cursors; no interaction token exists
     for them so the stylex port falls back to the action cursor. */
  reorderHandle: {
    marginInlineStart: '-0.375rem',
    touchAction: 'none',
  },
  reorderHandleActive: {},
  empty: {
    padding: '1rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    minBlockSize: { [CONTAINER_DOWN]: 0, default: '12rem' },
    textAlign: 'center',
  },
  emptyText: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
  },
})

export type TransferListProps<Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  /** Accessible name for the complete control. */
  label: string
  /** Visually hides the label while retaining its accessible name. */
  isLabelHidden?: boolean
  /** Supporting guidance shown below the label. */
  description?: string
  /** Complete option catalog. Option values must be unique. */
  options: ReadonlyArray<TransferListOption>
  /** Heading for the selected panel. @default 'Selected' */
  selectedLabel?: string
  /** Heading for the available panel. @default 'Available' */
  availableLabel?: string
  /** Shows one search field that filters both panels. @default false */
  hasSearch?: boolean
  /** Accessible label for search. Defaults to `Search ${label}`. */
  searchLabel?: string
  /** Search input placeholder. @default 'Search…' */
  searchPlaceholder?: string
  /** Enables pointer and keyboard ordering on selected options. @default true */
  isReorderable?: boolean
  /** Shows an Add all action. @default false */
  hasSelectAll?: boolean
  /** Shows a Clear action. Transfer-disabled selected options are retained. */
  hasClear?: boolean
  /** Customizes primary row content without changing built-in behavior. */
  renderOption?: (option: TransferListOption) => Html | string
  /** Empty copy for the selected panel. */
  selectedEmptyText?: string
  /** Empty copy for the available panel. */
  availableEmptyText?: string
  /** Empty copy while a search query is active. */
  noResultsText?: string
  /** Parent-layout positioning only. */
  layoutStyle?: ComponentLayoutStyle
}>

export const REORDER_INSTRUCTIONS =
  'To move an item, press Space or Enter to grab it, use the arrow keys to position it, and press Space or Enter to drop. Press Escape to cancel.'

export const transferList = <Msg>(
  props: TransferListProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const isReorderable = props.isReorderable ?? true
  const optionByValue = new Map(
    props.options.map(option => [option.value, option]),
  )
  const selectedValues = new Set(model.value)
  const normalizedQuery = model.query.trim().toLowerCase()
  const selectedOptions = model.value
    .map(optionValue => optionByValue.get(optionValue))
    .filter(
      (option): option is TransferListOption =>
        option !== undefined && matchesQuery(option, normalizedQuery),
    )
  const availableOptions = props.options.filter(
    option =>
      !selectedValues.has(option.value) &&
      matchesQuery(option, normalizedQuery),
  )
  const groupedAvailable: ReadonlyArray<
    readonly [string, ReadonlyArray<TransferListOption>]
  > = (() => {
    const groups = new Map<string, Array<TransferListOption>>()
    availableOptions.forEach(option => {
      const group = option.group ?? ''
      const items = groups.get(group)
      if (items !== undefined) {
        items.push(option)
      } else {
        groups.set(group, [option])
      }
    })
    return Array.from(groups.entries())
  })()

  const containerId = selectedContainerId(model)
  const dragState = model.dnd.dragState
  const draggedValue = draggedItemId(model)
  const sourceIndex =
    dragState._tag === 'Dragging' || dragState._tag === 'KeyboardDragging'
      ? dragState.sourceIndex
      : -1
  /* The drop marker sits where the dragged row would land: before the row
     occupying the target slot when moving up, after it when moving down. */
  const dropMarker = (() => {
    const target = finalDropIndex(model)
    if (target === null || target === sourceIndex || sourceIndex < 0) {
      return null
    }
    const markerValue = model.value[target]
    if (markerValue === undefined) {
      return null
    }
    return {
      value: markerValue,
      position: (target < sourceIndex ? 'before' : 'after') as
        | 'before'
        | 'after',
    }
  })()

  const selectedLabel = props.selectedLabel ?? 'Selected'
  const availableLabel = props.availableLabel ?? 'Available'
  const selectedEmptyText = props.selectedEmptyText ?? 'No items selected.'
  const availableEmptyText =
    props.availableEmptyText ?? 'All items are selected.'
  const noResultsText = props.noResultsText ?? 'No results found.'
  const labelId = `${model.id}-label`
  const descriptionId = `${model.id}-description`
  const selectedHeadingId = `${model.id}-selected-heading`
  const availableHeadingId = `${model.id}-available-heading`
  const reorderInstructionsId = `${model.id}-reorder-instructions`

  const iconButton = (config: {
    ariaLabel: string
    isDisabled: boolean
    title?: string
    onClick: Msg
    icon: Html
    dataAction?: string
  }): Html =>
    h.button(
      [
        h.Type('button'),
        h.AriaLabel(config.ariaLabel),
        h.Disabled(config.isDisabled),
        ...(config.title === undefined ? [] : [h.Title(config.title)]),
        h.OnClick(config.onClick),
        ...(config.dataAction === undefined
          ? []
          : [h.DataAttribute('transfer-list-action', config.dataAction)]),
        h.Class(
          className(
            reset.button,
            ...buttonVisualStyles({ variant: 'ghost', size: 'icon-xs' }),
            styles.iconButton,
          ),
        ),
      ],
      [config.icon],
    )

  const reorderHandle = (
    option: TransferListOption,
    orderedIndex: number,
  ): Html | null => {
    if (!isReorderable) {
      return null
    }
    const active = draggedValue === option.value
    const isReorderDisabled = option.isReorderDisabled === true
    const disabledReason =
      option.disabledMessage ?? `${option.label} cannot be reordered.`
    /* The handle carries data-draggable-id (FocusItem's focus target) and
       hand-rolls the primitive's draggable() handlers so the row's other
       buttons never start a drag. Space/Enter activate keyboard drag;
       during a drag the document subscription routes arrows, drop, and
       Escape — nothing is dispatched from here while one is in flight. */
    return h.button(
      [
        h.Type('button'),
        h.DataAttribute('draggable-id', option.value),
        h.AriaLabel(`Reorder ${option.label}`),
        h.AriaDescribedBy(reorderInstructionsId),
        h.AriaRoleDescription('draggable'),
        h.AriaPressed(active ? 'true' : 'false'),
        h.Disabled(isReorderDisabled),
        ...(isReorderDisabled ? [h.Title(disabledReason)] : []),
        h.OnClick(
          props.toParentMessage(
            Message.ClickedReorderHandle({
              value: option.value,
              label: option.label,
            }),
          ),
        ),
        h.OnKeyDownPreventDefault(key =>
          (key === ' ' || key === 'Enter') &&
          model.dnd.dragState._tag === 'Idle' &&
          !isReorderDisabled
            ? Option.some(
                props.toParentMessage(
                  Message.GotDndMessage({
                    message: Dnd.Message.ActivatedKeyboardDrag({
                      itemId: option.value,
                      containerId,
                      index: orderedIndex,
                    }),
                  }),
                ),
              )
            : Option.none(),
        ),
        h.OnPointerDown(
          (
            _pointerType,
            button,
            screenX,
            screenY,
            _timeStamp,
            _clientX,
            _clientY,
            _pointerId,
          ) =>
            button === 0 && !isReorderDisabled
              ? Option.some(
                  props.toParentMessage(
                    Message.GotDndMessage({
                      message: Dnd.Message.PressedDraggable({
                        itemId: option.value,
                        containerId,
                        index: orderedIndex,
                        screenX,
                        screenY,
                      }),
                    }),
                  ),
                )
              : Option.none(),
        ),
        h.Class(
          className(
            reset.button,
            ...buttonVisualStyles({ variant: 'ghost', size: 'icon-xs' }),
            styles.iconButton,
            styles.reorderHandle,
            active && styles.reorderHandleActive,
          ),
        ),
      ],
      [Icon.gripVertical<Msg>({ class: 'size-4' }, h)],
    )
  }

  const optionAction = (
    option: TransferListOption,
    side: 'selected' | 'available',
    index: number,
  ): Html => {
    const isTransferDisabled = option.isTransferDisabled === true
    const disabledReason =
      option.disabledMessage ?? `${option.label} cannot be moved.`
    if (side === 'available') {
      return iconButton({
        ariaLabel: `Add ${option.label}`,
        isDisabled: isTransferDisabled,
        ...(isTransferDisabled ? { title: disabledReason } : {}),
        dataAction: 'available',
        onClick: props.toParentMessage(
          Message.ClickedTransferListAdd({
            value: option.value,
            label: option.label,
            index,
          }),
        ),
        icon: Icon.icon('plus', { class: 'size-4' }, h),
      })
    }
    return iconButton({
      ariaLabel: `Remove ${option.label}`,
      isDisabled: isTransferDisabled,
      ...(isTransferDisabled ? { title: disabledReason } : {}),
      dataAction: 'selected',
      onClick: props.toParentMessage(
        Message.ClickedTransferListRemove({
          value: option.value,
          label: option.label,
          index,
        }),
      ),
      icon: Icon.icon('x', { class: 'size-4' }, h),
    })
  }

  const transferItem = (
    option: TransferListOption,
    side: 'selected' | 'available',
    index: number,
  ): Html => {
    const active = draggedValue === option.value
    const isPointerSource = active && dragState._tag === 'Dragging'
    const dropPosition =
      dropMarker?.value === option.value ? dropMarker.position : null
    const orderedIndex = model.value.indexOf(option.value)
    const state =
      option.isTransferDisabled === true || option.isReorderDisabled === true
        ? 'disabled'
        : active
          ? 'reordering'
          : 'enabled'
    return h.li(
      [
        h.Role('listitem'),
        h.Key(option.value),
        h.DataAttribute('slot', 'transfer-list-item'),
        h.DataAttribute('side', side),
        h.DataAttribute('state', state),
        /* Every selected row keeps data-sortable-id — locked rows stay in
           the primitive's index space so insertion indices map onto the
           real list, and the movable-range clamp in update keeps the drop
           legal. */
        ...(side === 'selected' && isReorderable
          ? Dnd.sortable(option.value)
          : []),
        ...(side === 'selected'
          ? [
              h.DataAttribute('transfer-list-row', option.value),
              h.DataAttribute('transfer-list-index', String(orderedIndex)),
            ]
          : []),
        ...(isPointerSource
          ? [h.DataAttribute('transfer-list-reorder-source', 'true')]
          : []),
        ...(dropPosition === null
          ? []
          : [h.DataAttribute('transfer-list-drop-target', dropPosition)]),
        h.Class(
          className(
            styles.item,
            active &&
              dragState._tag === 'KeyboardDragging' &&
              styles.itemDragging,
            isPointerSource && styles.itemPointerSource,
            dropPosition === 'before' && styles.itemDropBefore,
            dropPosition === 'after' && styles.itemDropAfter,
          ),
        ),
      ],
      [
        ...(side === 'selected'
          ? (() => {
              const handle = reorderHandle(option, orderedIndex)
              return handle === null ? [] : [handle]
            })()
          : []),
        h.span(
          [h.Class(className(styles.itemLabel))],
          [
            props.renderOption === undefined
              ? option.label
              : props.renderOption(option),
          ],
        ),
        optionAction(option, side, index),
      ],
    )
  }

  const panelBody = (
    side: 'selected' | 'available',
    content: ReadonlyArray<Html>,
    emptyText: string,
  ): Html =>
    h.div(
      [
        h.Id(`${model.id}-panel-body-${side}`),
        h.DataAttribute('transfer-list-panel-body', side),
        h.Class(className(styles.panelBody)),
      ],
      [
        content.length > 0
          ? h.ul(
              [
                h.Role('list'),
                h.Class(className(reset.list, styles.list)),
                ...(side === 'selected' && isReorderable
                  ? [h.DataAttribute('droppable-id', containerId)]
                  : []),
              ],
              [...content],
            )
          : h.div(
              [
                h.DataAttribute('transfer-list-empty', side),
                h.Class(className(styles.empty)),
              ],
              [
                h.span(
                  [h.Class(className(styles.emptyText))],
                  [normalizedQuery === '' ? emptyText : noResultsText],
                ),
              ],
            ),
      ],
    )

  const selectedPanelContent = selectedOptions.map((option, index) =>
    transferItem(option, 'selected', index),
  )
  const availablePanelContent = groupedAvailable.flatMap(
    ([group, groupOptions]) => [
      ...(group !== '' || groupedAvailable.length > 1
        ? [
            h.li(
              [
                h.Role('presentation'),
                h.Key(`group-${group === '' ? 'ungrouped' : group}`),
                h.Class(className(styles.groupHeading)),
              ],
              [
                h.span(
                  [h.Class(className(styles.groupHeadingText))],
                  [group === '' ? 'Other' : group],
                ),
              ],
            ),
          ]
        : []),
      ...groupOptions.map(option =>
        transferItem(option, 'available', availableOptions.indexOf(option)),
      ),
    ],
  )

  const headerAction = (
    text: string,
    isDisabled: boolean,
    message: Msg,
  ): Html =>
    h.button(
      [
        h.Type('button'),
        h.Disabled(isDisabled),
        h.OnClick(message),
        h.DataAttribute('transfer-list-header-action', 'true'),
        h.Class(
          className(
            reset.button,
            ...buttonVisualStyles({ variant: 'link' }),
            styles.headerAction,
          ),
        ),
      ],
      [text],
    )

  return h.div(
    [
      h.DataAttribute('slot', 'transfer-list'),
      h.Role('group'),
      h.AriaLabelledBy(labelId),
      ...(props.description === undefined
        ? []
        : [h.AriaDescribedBy(descriptionId)]),
      h.Class(className(styles.root, props.layoutStyle)),
    ],
    [
      h.div(
        [h.Class(className(styles.heading))],
        [
          props.isLabelHidden === true
            ? h.span(
                [h.Id(labelId), h.Class(className(styles.srOnly))],
                [props.label],
              )
            : h.span(
                [h.Id(labelId), h.Class(className(styles.label))],
                [props.label],
              ),
          ...(props.description === undefined
            ? []
            : [
                h.span(
                  [h.Id(descriptionId), h.Class(className(styles.description))],
                  [props.description],
                ),
              ]),
        ],
      ),
      ...(props.hasSearch === true
        ? [
            h.div(
              [h.Class(className(styles.controls))],
              [
                h.div(
                  [h.Class(className(styles.searchWrap))],
                  [
                    h.span(
                      [h.Class(className(styles.searchIcon))],
                      [Icon.icon('search', { class: 'size-4' }, h)],
                    ),
                    input(
                      {
                        id: `${model.id}-search`,
                        type: 'text',
                        role: 'searchbox',
                        ariaLabel: props.searchLabel ?? `Search ${props.label}`,
                        placeholder: props.searchPlaceholder ?? 'Search…',
                        value: model.query,
                        onInput: value =>
                          props.toParentMessage(
                            Message.SearchedTransferList({ query: value }),
                          ),
                        inputStyle: styles.searchInput,
                      },
                      h,
                    ),
                    ...(model.query === ''
                      ? []
                      : [
                          h.button(
                            [
                              h.Type('button'),
                              h.AriaLabel('Clear search'),
                              h.Class(
                                className(
                                  reset.button,
                                  ...buttonVisualStyles({
                                    variant: 'ghost',
                                    size: 'icon-xs',
                                  }),
                                  styles.clearSearch,
                                ),
                              ),
                              h.OnClick(
                                props.toParentMessage(
                                  Message.SearchedTransferList({ query: '' }),
                                ),
                              ),
                            ],
                            [Icon.icon('x', { class: 'size-3.5' }, h)],
                          ),
                        ]),
                  ],
                ),
              ],
            ),
          ]
        : []),
      h.span(
        [h.Id(reorderInstructionsId), h.Class(className(styles.srOnly))],
        [REORDER_INSTRUCTIONS],
      ),
      h.div(
        [
          h.DataAttribute('slot', 'transfer-list-collection'),
          h.Class(className(styles.panels)),
        ],
        [
          h.div(
            [
              h.Id(`${model.id}-panel-selected`),
              h.Role('group'),
              h.AriaLabelledBy(selectedHeadingId),
              h.Tabindex(-1),
              h.Class(className(styles.panel)),
            ],
            [
              h.div(
                [h.Class(className(styles.panelHeader))],
                [
                  h.span(
                    [
                      h.Id(selectedHeadingId),
                      h.Class(className(styles.panelHeading)),
                    ],
                    [selectedLabel],
                  ),
                  ...(props.hasClear === true
                    ? [
                        headerAction(
                          'Clear',
                          !model.value.some(
                            optionValue =>
                              optionByValue.get(optionValue)
                                ?.isTransferDisabled !== true,
                          ),
                          props.toParentMessage(
                            Message.ClickedTransferListClear(),
                          ),
                        ),
                      ]
                    : []),
                ],
              ),
              panelBody('selected', selectedPanelContent, selectedEmptyText),
            ],
          ),
          h.div(
            [
              h.Id(`${model.id}-panel-available`),
              h.Role('group'),
              h.AriaLabelledBy(availableHeadingId),
              h.Tabindex(-1),
              h.Class(className(styles.panel, styles.panelDivider)),
            ],
            [
              h.div(
                [h.Class(className(styles.panelHeader))],
                [
                  h.span(
                    [
                      h.Id(availableHeadingId),
                      h.Class(className(styles.panelHeading)),
                    ],
                    [availableLabel],
                  ),
                  ...(props.hasSelectAll === true
                    ? [
                        headerAction(
                          'Add all',
                          !props.options.some(
                            option =>
                              option.isTransferDisabled !== true &&
                              !model.value.includes(option.value),
                          ),
                          props.toParentMessage(
                            Message.ClickedTransferListAddAll(),
                          ),
                        ),
                      ]
                    : []),
                ],
              ),
              panelBody('available', availablePanelContent, availableEmptyText),
            ],
          ),
        ],
      ),
      h.div(
        [
          h.AriaLive('polite'),
          h.Class(className(styles.srOnly)),
          h.DataAttribute('slot', 'transfer-list-announcer'),
        ],
        [model.announcement],
      ),
    ],
  )
}
