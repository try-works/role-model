import { Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import type { Html } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

/* Ported from Meta Astryx ListInput (packages/lab/src/ListInput) — column
   definitions, mutation intents, keyboard reorder state, and live-region
   announcements. Item values stay consumer-owned (`S.Any` payloads); the
   submodel tracks only reorder progress and the last announcement. */

export type ListInputColumn<T, Msg> = Readonly<{
  /** Stable column identifier, forwarded to getFieldStatus. */
  key: string
  /** Field label shown on the first record and repeated when rows stack. */
  header: string
  /** Track width: `{type:'pixel',value}` → `Npx`; `{type:'proportional',value}` → `minmax(140px, Nfr)`. */
  width?: Readonly<{ type: 'pixel' | 'proportional'; value: number }>
  /** Renders the editable control for one cell (parent-boundary). */
  renderInput: (context: ListInputRenderContext<T, Msg>) => Html
}>

export type ListInputValueContext<T> = Readonly<{
  /** Current record. */
  item: T
  /** Current visual position. */
  index: number
  /** Accessible cell label, including the record position. */
  label: string
  /** True because the list row owns the visible column label. */
  isLabelHidden: boolean
}>

export type ListInputRenderContext<T, Msg> = ListInputValueContext<T> &
  Readonly<{
    /** The column's `key` for this cell. */
    columnKey: string
    /** Complete validation status scoped to this field. */
    status?: { type: 'warning' | 'error' | 'success'; message?: string }
    /** Forward to the rendered control so status uses its native tooltip. */
    statusVariant: 'tooltip'
    isDisabled: boolean
    isLoading: boolean
    /** Message factory replacing this record: `(nextItem, columnKey?) => Msg`. */
    updateItem: (nextItem: T, columnKey?: string) => Msg
  }>

export type ListInputChange =
  | Readonly<{ type: 'add'; index: number }>
  | Readonly<{ type: 'update'; index: number; columnKey?: string }>
  | Readonly<{ type: 'remove'; index: number }>
  | Readonly<{ type: 'reorder'; fromIndex: number; toIndex: number }>

export const resolveColumnTrack = (
  width?: Readonly<{ type: 'pixel' | 'proportional'; value: number }>,
): string => {
  if (width?.type === 'pixel') return `${width.value}px`
  const proportion = width?.value ?? 1
  return `minmax(140px, ${proportion}fr)`
}

/** Moves `fromIndex` to `toIndex`, used by the parent's reorder fold. */
export const moveItem = <T>(
  items: ReadonlyArray<T>,
  fromIndex: number,
  toIndex: number,
): ReadonlyArray<T> => {
  const next = [...items]
  const [item] = next.splice(fromIndex, 1)
  if (item === undefined) return items
  next.splice(toIndex, 0, item)
  return next
}

/* --- Submodel ----------------------------------------------------------- */

export const ReorderState = S.Struct({
  /* getItemKey of the grabbed row — survives row insertion/removal. */
  key: S.String,
  fromIndex: S.Number,
  previewIndex: S.Number,
})
export type ReorderState = typeof ReorderState.Type

export const Model = S.Struct({
  id: S.String,
  reorder: S.Option(ReorderState),
  announcement: S.Option(S.String),
})
export type Model = typeof Model.Type

export type InitConfig = Readonly<{ id: string }>
export const init = (config: InitConfig): Model => ({
  id: config.id,
  reorder: Option.none(),
  announcement: Option.none(),
})

export const Message = defineMessageUnion({
  /* The new item rides the message: messages must be data because previews
     route them through JSON.stringify, which drops function payloads
     (astryx invokes createItem() inside the click handler; the view samples
     it when it builds the Add intent). */
  AddRequested: {
    item: S.Unknown,
    itemName: S.String,
    position: S.Number,
  },
  RemoveRequested: { index: S.Number, itemName: S.String, position: S.Number },
  FieldEdited: { index: S.Number, nextItem: S.Unknown, columnKey: S.String },
  /* Arrow keys on the handle while not grabbed: immediate one-position move. */
  MoveRequested: {
    fromIndex: S.Number,
    toIndex: S.Number,
    itemName: S.String,
    total: S.Number,
  },
  AlreadyAtBoundary: { itemName: S.String, boundary: S.String },
  GrabStarted: {
    index: S.Number,
    key: S.String,
    itemName: S.String,
    position: S.Number,
  },
  GrabPreviewed: { toIndex: S.Number, itemName: S.String, total: S.Number },
  GrabCommitted: { itemName: S.String, total: S.Number },
  GrabCancelled: {},
})
export type Message = typeof Message.Type

export const OutMessage = defineMessageUnion({
  ItemAdded: { item: S.Unknown },
  ItemRemoved: { index: S.Number },
  ItemUpdated: { index: S.Number, nextItem: S.Unknown, columnKey: S.String },
  ItemReordered: { fromIndex: S.Number, toIndex: S.Number },
})
export type OutMessage = typeof OutMessage.Type

export type UpdateReturn = Update.ReturnWithOutMessage<
  Model,
  Message,
  OutMessage
>

export const update = (model: Model, message: Message): UpdateReturn => {
  switch (message._tag) {
    case 'AddRequested':
      return {
        model: {
          ...model,
          announcement: Option.some(
            `Added ${message.itemName} ${message.position}.`,
          ),
        },
        outMessage: OutMessage.ItemAdded({ item: message.item }),
      }
    case 'RemoveRequested':
      return {
        model: {
          ...model,
          announcement: Option.some(
            `Removed ${message.itemName} ${message.position}.`,
          ),
        },
        outMessage: OutMessage.ItemRemoved({ index: message.index }),
      }
    case 'FieldEdited':
      return {
        model,
        outMessage: OutMessage.ItemUpdated({
          index: message.index,
          nextItem: message.nextItem,
          columnKey: message.columnKey,
        }),
      }
    case 'MoveRequested':
      return {
        model: {
          ...model,
          announcement: Option.some(
            `${message.itemName} moved to position ${message.toIndex + 1} of ${message.total}.`,
          ),
        },
        outMessage: OutMessage.ItemReordered({
          fromIndex: message.fromIndex,
          toIndex: message.toIndex,
        }),
      }
    case 'AlreadyAtBoundary':
      return {
        model: {
          ...model,
          announcement: Option.some(
            `This ${message.itemName} is already ${message.boundary}.`,
          ),
        },
      }
    case 'GrabStarted':
      return {
        model: {
          ...model,
          reorder: Option.some({
            key: message.key,
            fromIndex: message.index,
            previewIndex: message.index,
          }),
          announcement: Option.some(
            `${message.itemName} ${message.position} grabbed. Use arrow keys to move, Space or Enter to drop, and Escape to cancel.`,
          ),
        },
      }
    case 'GrabPreviewed':
      return Option.match(model.reorder, {
        onNone: () => ({ model }),
        onSome: reorder => ({
          model: {
            ...model,
            reorder: Option.some({ ...reorder, previewIndex: message.toIndex }),
            announcement: Option.some(
              `${message.itemName} moved to position ${message.toIndex + 1} of ${message.total}.`,
            ),
          },
        }),
      })
    case 'GrabCommitted': {
      const reorder = Option.getOrUndefined(model.reorder)
      if (reorder === undefined) return { model }
      const didMove = reorder.fromIndex !== reorder.previewIndex
      return {
        model: {
          ...model,
          reorder: Option.none(),
          announcement: Option.some(
            didMove
              ? `${message.itemName} dropped at position ${reorder.previewIndex + 1} of ${message.total}.`
              : `${message.itemName} returned to position ${reorder.fromIndex + 1}.`,
          ),
        },
        ...(didMove
          ? {
              outMessage: OutMessage.ItemReordered({
                fromIndex: reorder.fromIndex,
                toIndex: reorder.previewIndex,
              }),
            }
          : {}),
      }
    }
    case 'GrabCancelled':
      return {
        model: {
          ...model,
          reorder: Option.none(),
          announcement: Option.some('Reordering cancelled.'),
        },
      }
  }
}
