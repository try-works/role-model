import { reset } from '@/stylex/reset'
import { Checkbox as CheckboxPrimitive, VirtualList } from '@foldkit/ui'
import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  type Message,
  type Model,
  Message as VirtualDataTableStateMessages,
} from '@/lib/virtual-data-table-state'
import * as Icon from '@/lib/icon'
import type { ComponentLayoutStyle } from '../contracts'
import { className } from '../style'
import { styles } from './data-table.stylex'

export * from '@/lib/virtual-data-table-state'

export type VirtualDataTableColumn<Row, Msg> = Readonly<{
  id: string
  header: string
  value: (row: Row) => string | number
  cell?: (row: Row, h: HtmlBuilder<Msg>) => Html | string
  sortable?: boolean
  numeric?: boolean
}>

export type VirtualDataTableProps<Row, Msg> = Readonly<{
  ariaLabel: string
  columns: ReadonlyArray<VirtualDataTableColumn<Row, Msg>>
  filterPlaceholder?: string
  filterText: (row: Row) => string
  gridTemplateColumns: string
  layoutStyle?: ComponentLayoutStyle
  model: Model
  rowKey: (row: Row) => string
  rows: ReadonlyArray<Row>
  toParentMessage: (message: Message) => Msg
}>

const compare = (left: string | number, right: string | number): number =>
  typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left).localeCompare(String(right), undefined, {
        numeric: true,
        sensitivity: 'base',
      })

const selectionControl = <Msg>(
  props: Readonly<{
    id: string
    label: string
    isChecked: boolean
    isIndeterminate?: boolean
    onToggle: (isChecked: boolean) => Msg
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  CheckboxPrimitive.view(
    {
      id: props.id,
      isChecked: props.isChecked,
      isIndeterminate: props.isIndeterminate ?? false,
      isDisabled: false,
      onToggle: props.onToggle,
      toView: ({ checkbox }) =>
        h.button(
          [
            ...checkbox,
            h.Type('button'),
            h.AriaLabel(props.label),
            h.Class(className(reset.button, styles.selectionButton)),
          ],
          [
            h.span(
              [
                h.Class(
                  className(
                    styles.selectionBox,
                    (props.isChecked || props.isIndeterminate === true) &&
                      styles.selectionBoxChecked,
                  ),
                ),
              ],
              [
                ...(props.isChecked || props.isIndeterminate === true
                  ? [
                      Icon.check<Msg>(
                        { class: className(styles.selectionIcon) },
                        h,
                      ),
                    ]
                  : []),
              ],
            ),
          ],
        ),
    },
    h,
  )

export const virtualDataTable = <Row, Msg>(
  props: VirtualDataTableProps<Row, Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const query = props.model.filter.trim().toLocaleLowerCase()
  const filtered =
    query === ''
      ? [...props.rows]
      : props.rows.filter(row =>
          props.filterText(row).toLocaleLowerCase().includes(query),
        )
  const sortColumn = props.columns.find(
    column => column.id === props.model.sortKey,
  )
  const sorted =
    sortColumn === undefined
      ? filtered
      : [...filtered].sort(
          (left, right) =>
            compare(sortColumn.value(left), sortColumn.value(right)) *
            (props.model.sortDirection === 'ascending' ? 1 : -1),
        )
  const selected = new Set(props.model.selectedRowKeys)
  const filteredKeys = filtered.map(props.rowKey)
  const selectedVisibleCount = filteredKeys.filter(key =>
    selected.has(key),
  ).length
  const allSelected =
    filteredKeys.length > 0 && selectedVisibleCount === filteredKeys.length
  const someSelected = selectedVisibleCount > 0 && !allSelected
  const gridStyle = h.Style({ gridTemplateColumns: props.gridTemplateColumns })

  const rowView = (row: Row): Html => {
    const key = props.rowKey(row)
    const isSelected = selected.has(key)
    return h.div(
      [
        h.Role('row'),
        h.DataAttribute('selected', isSelected ? '' : 'false'),
        gridStyle,
        h.Class(className(styles.row, isSelected && styles.rowSelected)),
      ],
      [
        h.div(
          [h.Role('cell'), h.Class(className(styles.selectionCell))],
          [
            selectionControl(
              {
                id: `virtual-table-row-${key}`,
                label: `Select row ${key}`,
                isChecked: isSelected,
                onToggle: isChecked =>
                  props.toParentMessage(
                    VirtualDataTableStateMessages.VirtualDataTableToggledRow({
                      key,
                      isSelected: isChecked,
                    }),
                  ),
              },
              h,
            ),
          ],
        ),
        ...props.columns.map(column =>
          h.div(
            [
              h.Role('cell'),
              h.Class(
                className(
                  styles.cell,
                  column.numeric === true && styles.numeric,
                ),
              ),
              ...(column.numeric === true
                ? [h.Style({ textAlign: 'right' })]
                : []),
            ],
            [column.cell?.(row, h) ?? String(column.value(row))],
          ),
        ),
      ],
    )
  }

  return h.div(
    [
      h.DataAttribute('slot', 'virtual-data-table'),
      h.Class(className(styles.root, props.layoutStyle)),
    ],
    [
      h.div(
        [h.Class(className(styles.toolbar))],
        [
          h.input([
            h.Type('search'),
            h.Value(props.model.filter),
            h.OnInput(value =>
              props.toParentMessage(
                VirtualDataTableStateMessages.VirtualDataTableFiltered({
                  value,
                }),
              ),
            ),
            h.Placeholder(props.filterPlaceholder ?? 'Filter rows…'),
            h.AriaLabel(props.filterPlaceholder ?? 'Filter rows'),
            h.Class(className(reset.input, styles.filter)),
          ]),
          h.p(
            [h.Role('status'), h.Class(className(reset.text, styles.summary))],
            [
              `${selectedVisibleCount} selected · ${filtered.length.toLocaleString()} rows · virtualized`,
            ],
          ),
        ],
      ),
      h.div(
        [
          h.Role('table'),
          h.AriaLabel(props.ariaLabel),
          h.AriaRowcount(sorted.length + 1),
          h.Class(className(styles.shell)),
        ],
        [
          h.div(
            [h.Class(className(styles.horizontalScroll))],
            [
              h.div(
                [h.Class(className(styles.table))],
                [
                  h.div(
                    [
                      h.Role('row'),
                      gridStyle,
                      h.Class(className(styles.header)),
                    ],
                    [
                      h.div(
                        [
                          h.Role('columnheader'),
                          h.Class(className(styles.selectionCell)),
                        ],
                        [
                          selectionControl(
                            {
                              id: 'virtual-table-select-filtered',
                              label: allSelected
                                ? 'Deselect all filtered rows'
                                : 'Select all filtered rows',
                              isChecked: allSelected,
                              isIndeterminate: someSelected,
                              onToggle: isSelected =>
                                props.toParentMessage(
                                  VirtualDataTableStateMessages.VirtualDataTableToggledRows(
                                    { keys: filteredKeys, isSelected },
                                  ),
                                ),
                            },
                            h,
                          ),
                        ],
                      ),
                      ...props.columns.map(column =>
                        h.div(
                          [
                            h.Role('columnheader'),
                            h.AriaSort(
                              props.model.sortKey === column.id
                                ? props.model.sortDirection
                                : 'none',
                            ),
                            h.Class(className(styles.heading)),
                            ...(column.numeric === true
                              ? [h.Style({ justifyContent: 'flex-end' })]
                              : []),
                          ],
                          column.sortable === false
                            ? [column.header]
                            : [
                                h.button(
                                  [
                                    h.Type('button'),
                                    h.OnClick(
                                      props.toParentMessage(
                                        VirtualDataTableStateMessages.VirtualDataTableSorted(
                                          { key: column.id },
                                        ),
                                      ),
                                    ),
                                    h.Class(
                                      className(
                                        reset.button,
                                        styles.sortButton,
                                      ),
                                    ),
                                  ],
                                  [
                                    column.header,
                                    Icon.chevronsUpDown<Msg>(
                                      { class: className(styles.sortIcon) },
                                      h,
                                    ),
                                  ],
                                ),
                              ],
                        ),
                      ),
                    ],
                  ),
                  ...(sorted.length === 0
                    ? [
                        h.div(
                          [h.Class(className(styles.empty))],
                          ['No matching rows.'],
                        ),
                      ]
                    : [
                        h.submodel({
                          slotId: `${props.model.list.id}-viewport`,
                          model: props.model.list,
                          view: VirtualList.view<Row>(),
                          viewInputs: {
                            items: sorted,
                            itemToKey: props.rowKey,
                            itemToView: rowView,
                            overscan: 6,
                            containerClassName: className(styles.viewport),
                          },
                          toParentMessage: message =>
                            props.toParentMessage(
                              VirtualDataTableStateMessages.GotVirtualDataTableListMessage(
                                { message },
                              ),
                            ),
                        }),
                      ]),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
