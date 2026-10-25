/* Ported from Meta Astryx ListInput (packages/lab/src/ListInput) —
   examples and visual spec adapted to Crease UI tokens.

   PORT-NOTE: astryx's pointer-drag reordering (grab handle + live drag
   preview layer) is dropped — foldkit's pointer handlers don't expose the
   geometry/pointer-capture stream it needs. Keyboard reorder is complete:
   Arrow keys move one position, Space/Enter grabs for extended reorder,
   Escape/blur cancels. Container-query row stacking is kept via
   @container/@max-[640px]. */

import { Option } from 'effect'
import { defineView } from 'foldkit/submodel'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '@/ui/button'
import * as Icon from '@/lib/icon'
import {
  renderAttachedStatus,
  renderDetachedStatus,
  statusIconName,
  type InputStatus,
} from '@/lib/input-status'
import {
  Message,
  moveItem,
  resolveColumnTrack,
  type ListInputChange,
  type ListInputColumn,
  type ListInputRenderContext,
  type Model,
} from '@/lib/list-input'
import { cn } from '@/lib/utils'

export {
  init,
  Model,
  Message,
  moveItem,
  OutMessage,
  resolveColumnTrack,
  update,
} from '@/lib/list-input'
export type {
  ListInputChange,
  ListInputColumn,
  ListInputRenderContext,
  ListInputValueContext,
} from '@/lib/list-input'
export type { InputStatus } from '@/lib/input-status'

export type ListInputProps<T, Msg> = Readonly<{
  model: Model
  /** Lifts this submodel's messages into the parent message type. */
  toParentMessage: (message: Message) => Msg
  id: string
  label: Html | string
  /** Controlled records owned by the parent. */
  value: ReadonlyArray<T>
  description?: Html | string
  /** Stable key for focus preservation and reorder matching. */
  getItemKey: (item: T) => string | number
  /** Creates a new record when the Add action is used. */
  createItem: () => T
  columns: ReadonlyArray<ListInputColumn<T, Msg>>
  /** Singular name used in action labels and announcements. @default 'item' */
  itemName?: string
  status?: InputStatus
  getItemStatus?: (item: T, index: number) => InputStatus | undefined
  getFieldStatus?: (
    item: T,
    columnKey: string,
    index: number,
  ) => InputStatus | undefined
  isReorderable?: boolean
  isDisabled?: boolean
  isLoading?: boolean
  /** Reaching it disables, but does not remove, Add. */
  maxItems?: number
  isLabelHidden?: boolean
  isOptional?: boolean
  isRequired?: boolean
  class?: string
}>

/* Internal viewInputs shape: every function is top-level so the submodel
   boundary auto-wraps it into the parent frame. Column renderInput fields
   (nested) are lifted into a single top-level renderInput by the wrapper. */
type CellContext = Readonly<{
  item: unknown
  index: number
  columnKey: string
  label: string
  isLabelHidden: boolean
  status?: InputStatus | undefined
  statusVariant: 'tooltip'
  isDisabled: boolean
  isLoading: boolean
  updateItem: (nextItem: unknown, columnKey?: string) => never
}>

type ViewInputs = Readonly<{
  id: string
  label: Html | string
  value: ReadonlyArray<unknown>
  columns: ReadonlyArray<{
    key: string
    header: string
    width?:
      | Readonly<{ type: 'pixel' | 'proportional'; value: number }>
      | undefined
  }>
  renderInput: (context: CellContext) => Html
  toParentMessage: (message: Message) => unknown
  getItemKey: (item: unknown) => string | number
  createItem: () => unknown
  getItemStatus?:
    | ((item: unknown, index: number) => InputStatus | undefined)
    | undefined
  getFieldStatus?:
    | ((
        item: unknown,
        columnKey: string,
        index: number,
      ) => InputStatus | undefined)
    | undefined
  itemName?: string | undefined
  description?: Html | string | undefined
  status?: InputStatus | undefined
  isReorderable?: boolean | undefined
  isDisabled?: boolean | undefined
  isLoading?: boolean | undefined
  maxItems?: number | undefined
  isLabelHidden?: boolean | undefined
  isOptional?: boolean | undefined
  isRequired?: boolean | undefined
  class?: string | undefined
}>

const ids = (id: string) => ({
  label: `${id}-label`,
  description: `${id}-description`,
  status: `${id}-status`,
  instructions: `${id}-reorder-instructions`,
  announcement: `${id}-announcement`,
})

const iconButtonClass =
  'inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50'

const view = defineView<Model, Message, ViewInputs>((model, props, h) => {
  const fieldIds = ids(props.id)
  const itemName = props.itemName ?? 'item'
  const total = props.value.length
  const mutationsDisabled =
    props.isDisabled === true || props.isLoading === true
  const showReorderColumn = props.isReorderable === true
  const showRemoveColumn = true
  const columnTracks = props.columns
    .map(column => resolveColumnTrack(column.width))
    .join(' ')

  const rowColumns = showReorderColumn
    ? showRemoveColumn
      ? 'minmax(0, 1fr) 2rem 2rem'
      : 'minmax(0, 1fr) 2rem'
    : showRemoveColumn
      ? 'minmax(0, 1fr) 2rem'
      : 'minmax(0, 1fr)'
  const contentColumn = showReorderColumn
    ? '1 / -3'
    : showRemoveColumn
      ? '1 / -2'
      : '1 / -1'

  const reorder = Option.getOrUndefined(model.reorder)

  const statusVisual = {
    root: (type: InputStatus['type']) => [
      h.Class(
        cn(
          'mt-1 flex items-start gap-1 rounded-lg p-2 text-xs leading-5',
          type === 'error' && 'bg-destructive/10 text-destructive',
          type === 'warning' && 'bg-warning/15 text-warning',
          type === 'success' && 'bg-success/15 text-success',
        ),
      ),
    ],
    icon: [h.Class('flex h-5 shrink-0 items-center')],
    text: [h.Class('flex-1')],
  }

  const fieldLabel = h.span(
    [
      h.Id(fieldIds.label),
      h.DataAttribute('slot', 'list-input-label'),
      h.Class(
        cn(
          'text-sm leading-5 font-medium text-muted-foreground',
          props.isLabelHidden === true && 'sr-only',
          props.isDisabled === true && 'opacity-50',
        ),
      ),
    ],
    [
      props.label,
      ...(props.isOptional === true
        ? [
            h.span(
              [
                h.Attribute('aria-hidden', 'true'),
                h.Class('text-xs font-normal'),
              ],
              [' ∙ Optional'],
            ),
          ]
        : []),
      ...(props.isRequired === true && props.isOptional !== true
        ? [
            h.span(
              [
                h.Attribute('aria-hidden', 'true'),
                h.Class('text-xs font-normal'),
              ],
              [' ∙ Required'],
            ),
          ]
        : []),
    ],
  )

  const handleKeyDown = (itemKey: string, index: number) =>
    h.OnKeyDownPreventDefault((key, modifiers) => {
      if (modifiers.altKey || modifiers.ctrlKey || modifiers.metaKey) {
        return Option.none()
      }
      const isGrabbed = reorder !== undefined && reorder.key === itemKey
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        const delta = key === 'ArrowUp' ? -1 : 1
        if (!isGrabbed) {
          const toIndex = Math.max(0, Math.min(index + delta, total - 1))
          return Option.some(
            toIndex === index
              ? Message.AlreadyAtBoundary({
                  itemName,
                  boundary: delta < 0 ? 'first' : 'last',
                })
              : Message.MoveRequested({
                  fromIndex: index,
                  toIndex,
                  itemName,
                  total,
                }),
          )
        }
        if (reorder === undefined) return Option.none()
        const toIndex = Math.max(
          0,
          Math.min(reorder.previewIndex + delta, total - 1),
        )
        if (toIndex === reorder.previewIndex) return Option.none()
        return Option.some(Message.GrabPreviewed({ toIndex, itemName, total }))
      }
      if (key === ' ' || key === 'Enter') {
        return Option.some(
          isGrabbed
            ? Message.GrabCommitted({ itemName, total })
            : Message.GrabStarted({
                index,
                key: itemKey,
                itemName,
                position: index + 1,
              }),
        )
      }
      if (isGrabbed && key === 'Escape') {
        return Option.some(Message.GrabCancelled())
      }
      if (isGrabbed && reorder !== undefined && key === 'Home') {
        return reorder.previewIndex === 0
          ? Option.none()
          : Option.some(Message.GrabPreviewed({ toIndex: 0, itemName, total }))
      }
      if (isGrabbed && reorder !== undefined && key === 'End') {
        return reorder.previewIndex === total - 1
          ? Option.none()
          : Option.some(
              Message.GrabPreviewed({ toIndex: total - 1, itemName, total }),
            )
      }
      return Option.none()
    })

  const rows = props.value.map((item, index) => {
    const itemKey = String(props.getItemKey(item))
    const isActiveReorder = reorder !== undefined && reorder.key === itemKey
    const itemStatus = props.getItemStatus?.(item, index)
    const itemStatusId =
      itemStatus?.message !== undefined
        ? `${props.id}-item-${index}-status`
        : undefined

    const cells = props.columns.map((column, columnIndex) => {
      const fieldStatus = props.getFieldStatus?.(item, column.key, index)
      const isRepeatedLabel = index !== 0
      const cellLabel = isRepeatedLabel
        ? `${column.header}, ${itemName} ${index + 1} of ${total}`
        : column.header
      const ctx: CellContext = {
        item,
        index,
        columnKey: column.key,
        label: cellLabel,
        isLabelHidden: true,
        status: fieldStatus,
        statusVariant: 'tooltip',
        isDisabled: mutationsDisabled,
        isLoading: props.isLoading === true,
        updateItem: (nextItem, columnKey) =>
          props.toParentMessage(
            Message.FieldEdited({
              index,
              nextItem,
              columnKey: columnKey ?? column.key,
            }),
          ) as never,
      }
      return h.div(
        [
          h.DataAttribute('list-input-cell', String(columnIndex)),
          h.Class(cn('min-w-0 @max-[640px]:col-[1]')),
        ],
        [
          h.span(
            [
              h.Attribute('aria-hidden', 'true'),
              h.DataAttribute(
                'list-input-column-label',
                isRepeatedLabel ? 'responsive' : 'primary',
              ),
              h.Class(
                cn(
                  'mb-0.5 @max-[640px]:mb-1 block text-xs font-medium leading-5 text-foreground',
                  isRepeatedLabel && 'hidden @max-[640px]:block',
                ),
              ),
            ],
            [column.header],
          ),
          h.div([h.Class('min-w-0')], [props.renderInput(ctx)]),
        ],
      )
    })

    const removeCell = h.div(
      [
        h.Class(
          'flex min-h-8 items-center justify-center self-end @max-[640px]:col-[2] @max-[640px]:row-[1]',
        ),
      ],
      [
        h.button(
          [
            h.Type('button'),
            h.AriaLabel(`Remove ${itemName} ${index + 1}`),
            h.Title(
              mutationsDisabled
                ? 'Remove is unavailable while the list is disabled'
                : `Remove ${itemName} ${index + 1}`,
            ),
            h.Disabled(mutationsDisabled),
            h.OnClick(
              Message.RemoveRequested({
                index,
                itemName,
                position: index + 1,
              }),
            ),
            h.DataAttribute('list-input-remove', ''),
            h.Class(iconButtonClass),
          ],
          [Icon.x({ class: 'size-4' }, h)],
        ),
      ],
    )

    const reorderCell = showReorderColumn
      ? h.div(
          [
            h.Class(
              'flex min-h-8 items-center justify-center self-end @max-[640px]:col-[3] @max-[640px]:row-[1]',
            ),
          ],
          [
            h.button(
              [
                h.Type('button'),
                h.AriaLabel(`Reorder ${itemName} ${index + 1}`),
                h.AriaDescribedBy(fieldIds.instructions),
                h.AriaPressed(isActiveReorder ? 'true' : 'false'),
                h.Disabled(mutationsDisabled),
                h.DataAttribute('list-input-reorder', ''),
                h.Class(
                  cn(
                    iconButtonClass,
                    isActiveReorder && 'bg-muted text-foreground',
                  ),
                ),
                handleKeyDown(itemKey, index),
                ...(isActiveReorder ? [h.OnBlur(Message.GrabCancelled())] : []),
              ],
              [Icon.gripVertical({ class: 'size-4' }, h)],
            ),
          ],
        )
      : undefined

    return h.li(
      [
        h.AriaPosinset(index + 1),
        h.AriaSetsize(total),
        h.AriaInvalid(itemStatus?.type === 'error'),
        ...(itemStatusId === undefined
          ? []
          : [h.AriaDescribedBy(itemStatusId)]),
        h.DataAttribute('slot', 'list-input-item'),
        h.DataAttribute('list-input-motion-key', `item:${itemKey}`),
        h.Class('relative flex min-w-0 flex-col'),
      ],
      [
        h.div(
          [
            h.DataAttribute('list-input-row', itemKey),
            ...(isActiveReorder
              ? [h.DataAttribute('list-input-reorder-source', 'true')]
              : []),
            h.Class('grid min-w-0 items-end gap-x-1 @max-[640px]:gap-y-2'),
            h.Style({ 'grid-template-columns': rowColumns }),
          ],
          [
            h.div(
              [
                h.DataAttribute('slot', 'list-input-fields'),
                h.Class(
                  'min-w-0 items-end gap-x-1 gap-y-2 grid @max-[640px]:contents',
                ),
                h.Style({
                  'grid-column': contentColumn,
                  'grid-template-columns': columnTracks,
                }),
              ],
              cells,
            ),
            ...(removeCell === undefined ? [] : [removeCell]),
            ...(reorderCell === undefined ? [] : [reorderCell]),
          ],
        ),
        ...(itemStatus?.message === undefined || itemStatus === undefined
          ? []
          : [
              h.div(
                [
                  h.DataAttribute('list-input-item-status', ''),
                  h.Class('@max-[640px]:mt-0 mt-1 min-w-0'),
                  h.Style({
                    'grid-row': 'auto',
                  }),
                ],
                [
                  renderDetachedStatus(
                    itemStatus,
                    statusVisual,
                    Icon.icon(
                      statusIconName(itemStatus.type),
                      { class: 'size-3' },
                      h,
                    ),
                    h,
                    itemStatusId,
                  ),
                ],
              ),
            ]),
      ],
    )
  })

  const emptyItem = h.li(
    [h.Class('w-full'), h.DataAttribute('slot', 'list-input-empty')],
    [
      h.div(
        [
          h.Class(
            'flex w-full flex-col items-center justify-center rounded-md border border-dashed border-input py-6 text-center',
          ),
        ],
        [
          h.div(
            [h.Class('text-sm font-medium text-foreground')],
            [`No ${itemName}s yet`],
          ),
          h.div(
            [h.Class('mt-1 text-sm text-muted-foreground')],
            [`Add a ${itemName} to get started.`],
          ),
        ],
      ),
    ],
  )

  const hasReachedMax = props.maxItems !== undefined && total >= props.maxItems
  const addRow = h.div(
    [
      h.Class('mt-2 grid items-center gap-x-1'),
      h.Style({ 'grid-template-columns': rowColumns }),
    ],
    [
      h.div(
        [
          h.DataAttribute('list-input-add-content', ''),
          h.Class('min-w-0'),
          h.Style({ 'grid-column': contentColumn }),
        ],
        [
          button(
            {
              children: [`Add ${itemName}`],
              onClick: Message.AddRequested({
                item: props.createItem(),
                itemName,
                position: total + 1,
              }),
              isDisabled: props.isDisabled === true || hasReachedMax,
              isLoading: props.isLoading === true,
              variant: 'secondary',
              size: 'default',
              class: 'w-full',
            },
            h,
          ),
        ],
      ),
    ],
  )

  const statusLayer =
    props.status?.message === undefined || props.status === undefined
      ? []
      : [
          renderAttachedStatus(
            props.status,
            {
              root: type => [
                h.Class(
                  cn(
                    'pointer-events-none -mt-1 rounded-b-md px-2 pb-2 pt-5 text-xs leading-5',
                    type === 'error' && 'bg-destructive/10 text-destructive',
                    type === 'warning' && 'bg-warning/15 text-warning',
                    type === 'success' && 'bg-success/15 text-success',
                  ),
                ),
              ],
              icon: [],
              text: [h.Class('flex-1')],
            },
            h,
            fieldIds.status,
          ),
        ]

  return h.div(
    [
      h.DataAttribute('slot', 'list-input'),
      h.Class(cn('flex w-full flex-col gap-1', props.class)),
    ],
    [
      fieldLabel,
      ...(props.description === undefined
        ? []
        : [
            h.p(
              [
                h.Id(fieldIds.description),
                h.DataAttribute('slot', 'list-input-description'),
                h.Class('text-xs leading-5 text-muted-foreground'),
              ],
              [props.description],
            ),
          ]),
      h.div(
        [
          h.Id(props.id),
          h.Role('group'),
          h.AriaLabelledBy(fieldIds.label),
          h.AriaDisabled(props.isDisabled === true),
          h.AriaBusy(props.isLoading === true),
          h.DataAttribute('slot', 'list-input-group'),
          h.Class(
            'flex min-w-0 w-full flex-col [overflow-anchor:none] [container-type:inline-size]',
          ),
        ],
        [
          h.ol(
            [
              h.Attribute('role', 'list'),
              h.AriaLabelledBy(fieldIds.label),
              h.DataAttribute('slot', 'list-input-list'),
              h.Class(
                'm-0 flex list-none flex-col gap-2 p-0 @max-[640px]:gap-8',
              ),
            ],
            total === 0 ? [emptyItem] : rows,
          ),
          addRow,
          ...(showReorderColumn
            ? [
                h.div(
                  [h.Id(fieldIds.instructions), h.Class('sr-only')],
                  [
                    'Use Arrow Up or Arrow Down to move this item one position. Press Space or Enter to pick it up for extended keyboard reordering.',
                  ],
                ),
              ]
            : []),
          ...statusLayer,
        ],
      ),
      h.div(
        [
          h.Id(fieldIds.announcement),
          h.Class('sr-only'),
          h.AriaLive('polite'),
          h.Attribute('role', 'status'),
        ],
        [Option.getOrElse(model.announcement, () => '')],
      ),
    ],
  )
})

export const listInput = <T, Msg>(
  props: ListInputProps<T, Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.submodel({
    slotId: props.model.id,
    model: props.model,
    view,
    viewInputs: {
      id: props.id,
      label: props.label,
      value: props.value,
      columns: props.columns.map(column => ({
        key: column.key,
        header: column.header,
        width: column.width,
      })),
      renderInput: context =>
        props.columns
          .find(column => column.key === context.columnKey)
          ?.renderInput(context as ListInputRenderContext<T, Msg>) ?? h.empty,
      toParentMessage: props.toParentMessage,
      getItemKey: props.getItemKey as (item: unknown) => string | number,
      createItem: props.createItem as () => unknown,
      ...(props.getItemStatus === undefined
        ? {}
        : {
            getItemStatus: props.getItemStatus as (
              item: unknown,
              index: number,
            ) => InputStatus | undefined,
          }),
      ...(props.getFieldStatus === undefined
        ? {}
        : {
            getFieldStatus: props.getFieldStatus as (
              item: unknown,
              columnKey: string,
              index: number,
            ) => InputStatus | undefined,
          }),
      itemName: props.itemName,
      description: props.description,
      status: props.status,
      isReorderable: props.isReorderable,
      isDisabled: props.isDisabled,
      isLoading: props.isLoading,
      maxItems: props.maxItems,
      isLabelHidden: props.isLabelHidden,
      isOptional: props.isOptional,
      isRequired: props.isRequired,
      class: props.class,
    },
    toParentMessage: props.toParentMessage,
  })
