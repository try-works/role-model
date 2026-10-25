import { reset } from '@/stylex/reset'
/* Ported from Meta Astryx ListInput (packages/lab/src/ListInput) —
   examples and visual spec adapted to Crease UI tokens.

   PORT-NOTE: astryx's pointer-drag reordering (grab handle + live drag
   preview layer) is dropped — foldkit's pointer handlers don't expose the
   geometry/pointer-capture stream it needs. Keyboard reorder is complete:
   Arrow keys move one position, Space/Enter grabs for extended reorder,
   Escape/blur cancels. Container-query row stacking is kept via
   @container list-input (max-width: 640px). */

import * as stylex from '@stylexjs/stylex'
import { Option } from 'effect'
import { defineView } from 'foldkit/submodel'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '@/stylex/button'
import * as Icon from '@/lib/icon'
import {
  renderAttachedStatus,
  renderDetachedStatus,
  statusIconName,
  type InputStatus,
} from '@/lib/input-status'
import {
  Message,
  resolveColumnTrack,
  type ListInputColumn,
  type ListInputRenderContext,
  type Model,
} from '@/lib/list-input'

import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { className } from './style'
import { tokens } from './tokens.stylex'

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

const containerQuery = '@container list-input (max-width: 640px)'

const styles = stylex.create({
  field: {
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  label: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
  labelDisabled: {
    opacity: 0.5,
  },
  srOnly: {
    margin: -1,
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
  labelIndicator: {
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: '1rem',
  },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
  },
  group: {
    containerName: 'list-input',
    containerType: 'inline-size',
    display: 'flex',
    flexDirection: 'column',
    overflowAnchor: 'none',
    minWidth: 0,
    width: '100%',
  },
  list: {
    margin: 0,
    padding: 0,
    gap: {
      [containerQuery]: '2rem',
      default: '0.5rem',
    },
    display: 'flex',
    flexDirection: 'column',
    listStyleType: 'none',
  },
  item: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    minWidth: 0,
  },
  row: {
    alignItems: 'end',
    columnGap: '0.25rem',
    display: 'grid',
    rowGap: {
      [containerQuery]: '0.5rem',
      default: null,
    },
    minWidth: 0,
  },
  fields: {
    alignItems: 'end',
    columnGap: '0.25rem',
    display: {
      [containerQuery]: 'contents',
      default: 'grid',
    },
    rowGap: '0.5rem',
    minWidth: 0,
  },
  fieldCell: {
    gridColumn: {
      [containerQuery]: '1',
      default: 'auto',
    },
    minWidth: 0,
  },
  columnLabel: {
    color: tokens.foreground,
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    marginBlockEnd: {
      [containerQuery]: '0.25rem',
      default: '0.125rem',
    },
  },
  repeatedColumnLabel: {
    display: {
      [containerQuery]: 'block',
      default: 'none',
    },
  },
  cellContent: {
    minWidth: 0,
  },
  controlCell: {
    alignItems: 'center',
    alignSelf: 'end',
    display: 'flex',
    justifyContent: 'center',
    minHeight: '2rem',
  },
  removeControlCell: {
    gridColumn: {
      [containerQuery]: '2',
      default: 'auto',
    },
    gridRow: {
      [containerQuery]: '1',
      default: 'auto',
    },
  },
  reorderControlCell: {
    gridColumn: {
      [containerQuery]: '3',
      default: 'auto',
    },
    gridRow: {
      [containerQuery]: '1',
      default: 'auto',
    },
  },
  iconButton: {
    borderRadius: foundationTokens.radiusMd,
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': tokens.muted,
    },
    color: {
      default: tokens.mutedForeground,
      ':hover': tokens.foreground,
    },
    cursor: {
      default: interactionTokens.cursorAction,
      ':disabled': interactionTokens.cursorDefault,
    },
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    outlineStyle: 'none',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'background-color, color',
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '2rem',
    width: '2rem',
  },
  iconButtonDisabled: {
    opacity: 0.5,
    pointerEvents: 'none',
  },
  reorderPressed: {
    backgroundColor: tokens.muted,
    color: tokens.foreground,
  },
  iconMd: {
    height: '1rem',
    width: '1rem',
  },
  iconSm: {
    height: '0.75rem',
    width: '0.75rem',
  },
  itemStatus: {
    marginBlockStart: {
      [containerQuery]: 0,
      default: '0.25rem',
    },
    minWidth: 0,
  },
  actionRow: {
    alignItems: 'center',
    columnGap: '0.25rem',
    display: 'grid',
    marginBlockStart: '0.5rem',
  },
  actionContent: {
    minWidth: 0,
  },
  emptyItem: {
    width: '100%',
  },
  emptyContainer: {
    borderColor: tokens.input,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'dashed',
    borderWidth: 1,
    paddingBlock: '1.5rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    textAlign: 'center',
    width: '100%',
  },
  emptyTitle: {
    color: tokens.foreground,
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
  emptyDescription: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    marginBlockStart: '0.25rem',
  },
  statusDetached: {
    padding: '0.5rem',
    borderRadius: foundationTokens.radiusLg,
    gap: '0.25rem',
    alignItems: 'flex-start',
    display: 'flex',
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
    marginBlockStart: '0.25rem',
  },
  statusAttached: {
    paddingInline: '0.5rem',
    borderEndEndRadius: foundationTokens.radiusMd,
    borderEndStartRadius: foundationTokens.radiusMd,
    fontSize: '0.75rem',
    lineHeight: '1.25rem',
    marginBlockStart: '-0.25rem',
    paddingBlockEnd: '0.5rem',
    paddingBlockStart: '1.25rem',
    pointerEvents: 'none',
  },
  statusError: {
    backgroundColor: `color-mix(in oklab, ${tokens.destructive} 10%, transparent)`,
    color: tokens.destructive,
  },
  statusWarning: {
    backgroundColor: `color-mix(in oklab, ${tokens.alertWarning} 15%, transparent)`,
    color: tokens.alertWarning,
  },
  statusSuccess: {
    backgroundColor: `color-mix(in oklab, ${tokens.alertSuccess} 15%, transparent)`,
    color: tokens.alertSuccess,
  },
  statusText: {
    flexGrow: 1,
  },
  statusIconRow: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    height: '1.25rem',
  },
  addButtonFill: {
    width: '100%',
  },
})

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
  layoutStyle?: ComponentLayoutStyle
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
  layoutStyle?: ComponentLayoutStyle | undefined
}>

const ids = (id: string) => ({
  label: `${id}-label`,
  description: `${id}-description`,
  status: `${id}-status`,
  instructions: `${id}-reorder-instructions`,
  announcement: `${id}-announcement`,
})

const view = defineView<Model, Message, ViewInputs>((model, props, h) => {
  const fieldIds = ids(props.id)
  const itemName = props.itemName ?? 'item'
  const total = props.value.length
  const mutationsDisabled =
    props.isDisabled === true || props.isLoading === true
  const showReorderColumn = props.isReorderable === true
  const columnTracks = props.columns
    .map(column => resolveColumnTrack(column.width))
    .join(' ')

  const rowColumns = showReorderColumn
    ? 'minmax(0, 1fr) 2rem 2rem'
    : 'minmax(0, 1fr) 2rem'
  const contentColumn = showReorderColumn ? '1 / -3' : '1 / -2'

  const reorder = Option.getOrUndefined(model.reorder)

  const fieldLabel = h.span(
    [
      h.Id(fieldIds.label),
      h.DataAttribute('slot', 'list-input-label'),
      h.Class(
        className(
          styles.label,
          props.isLabelHidden === true && styles.srOnly,
          props.isDisabled === true && styles.labelDisabled,
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
                h.Class(className(styles.labelIndicator)),
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
                h.Class(className(styles.labelIndicator)),
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
          h.Class(className(styles.fieldCell)),
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
                className(
                  styles.columnLabel,
                  isRepeatedLabel && styles.repeatedColumnLabel,
                ),
              ),
            ],
            [column.header],
          ),
          h.div(
            [h.Class(className(styles.cellContent))],
            [props.renderInput(ctx)],
          ),
        ],
      )
    })

    const removeCell = h.div(
      [h.Class(className(styles.controlCell, styles.removeControlCell))],
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
            h.Class(
              className(
                reset.button,
                styles.iconButton,
                mutationsDisabled && styles.iconButtonDisabled,
              ),
            ),
          ],
          [Icon.x({ class: className(styles.iconMd) }, h)],
        ),
      ],
    )

    const reorderCell = showReorderColumn
      ? h.div(
          [h.Class(className(styles.controlCell, styles.reorderControlCell))],
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
                  className(
                    reset.button,
                    styles.iconButton,
                    mutationsDisabled && styles.iconButtonDisabled,
                    isActiveReorder && styles.reorderPressed,
                  ),
                ),
                handleKeyDown(itemKey, index),
                ...(isActiveReorder ? [h.OnBlur(Message.GrabCancelled())] : []),
              ],
              [Icon.gripVertical({ class: className(styles.iconMd) }, h)],
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
        h.Class(className(styles.item)),
      ],
      [
        h.div(
          [
            h.DataAttribute('list-input-row', itemKey),
            ...(isActiveReorder
              ? [h.DataAttribute('list-input-reorder-source', 'true')]
              : []),
            h.Class(className(styles.row)),
            h.Style({ 'grid-template-columns': rowColumns }),
          ],
          [
            h.div(
              [
                h.DataAttribute('slot', 'list-input-fields'),
                h.Class(className(styles.fields)),
                h.Style({
                  'grid-column': contentColumn,
                  'grid-template-columns': columnTracks,
                }),
              ],
              cells,
            ),
            removeCell,
            ...(reorderCell === undefined ? [] : [reorderCell]),
          ],
        ),
        ...(itemStatus?.message === undefined || itemStatus === undefined
          ? []
          : [
              h.div(
                [
                  h.DataAttribute('list-input-item-status', ''),
                  h.Class(className(styles.itemStatus)),
                ],
                [
                  renderDetachedStatus(
                    itemStatus,
                    {
                      root: type => [
                        h.Class(
                          className(
                            styles.statusDetached,
                            type === 'error' && styles.statusError,
                            type === 'warning' && styles.statusWarning,
                            type === 'success' && styles.statusSuccess,
                          ),
                        ),
                      ],
                      icon: [h.Class(className(styles.statusIconRow))],
                      text: [h.Class(className(styles.statusText))],
                    },
                    Icon.icon(
                      statusIconName(itemStatus.type),
                      { class: className(styles.iconSm) },
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
    [
      h.Class(className(styles.emptyItem)),
      h.DataAttribute('slot', 'list-input-empty'),
    ],
    [
      h.div(
        [h.Class(className(styles.emptyContainer))],
        [
          h.div(
            [h.Class(className(styles.emptyTitle))],
            [`No ${itemName}s yet`],
          ),
          h.div(
            [h.Class(className(styles.emptyDescription))],
            [`Add a ${itemName} to get started.`],
          ),
        ],
      ),
    ],
  )

  const hasReachedMax = props.maxItems !== undefined && total >= props.maxItems
  const addRow = h.div(
    [
      h.Class(className(styles.actionRow)),
      h.Style({ 'grid-template-columns': rowColumns }),
    ],
    [
      h.div(
        [
          h.DataAttribute('list-input-add-content', ''),
          h.Class(className(styles.actionContent)),
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
              layoutStyle: styles.addButtonFill,
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
                  className(
                    styles.statusAttached,
                    type === 'error' && styles.statusError,
                    type === 'warning' && styles.statusWarning,
                    type === 'success' && styles.statusSuccess,
                  ),
                ),
              ],
              icon: [],
              text: [h.Class(className(styles.statusText))],
            },
            h,
            fieldIds.status,
          ),
        ]

  return h.div(
    [
      h.DataAttribute('slot', 'list-input'),
      h.Class(className(styles.field, props.layoutStyle)),
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
                h.Class(className(reset.text, styles.description)),
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
          h.Class(className(styles.group)),
        ],
        [
          h.ol(
            [
              h.Role('list'),
              h.AriaLabelledBy(fieldIds.label),
              h.DataAttribute('slot', 'list-input-list'),
              h.Class(className(reset.list, styles.list)),
            ],
            total === 0 ? [emptyItem] : rows,
          ),
          addRow,
          ...(showReorderColumn
            ? [
                h.div(
                  [
                    h.Id(fieldIds.instructions),
                    h.Class(className(styles.srOnly)),
                  ],
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
          h.Class(className(styles.srOnly)),
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
      layoutStyle: props.layoutStyle,
    },
    toParentMessage: props.toParentMessage,
  })
