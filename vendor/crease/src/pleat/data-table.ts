import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { Checkbox as CheckboxPrimitive } from '@foldkit/ui'

import {
  type FilterVariant,
  type Message,
  type Model,
  Message as DataTableStateMessages,
  filterCount,
  pageRows,
  rangeBounds,
  filteredRows,
  sortedRows,
  visibleSelectedCount,
} from '@/lib/data-table-state'
import type { DataTableConfig, SortEntry } from '@/lib/data-table-state'
import * as DateRangeInput from '@/lib/date-range-input'
import { projectDataTable, type DataTableMode } from '@/lib/data-table-adapter'
import * as Icon from '@/lib/icon'
import { button, buttonVisualStyles } from './button'
import { checkbox } from './checkbox'
import { icon } from './composition/icon'
import * as Calendar from './calendar'
import * as Select from './select'
import * as Slider from './slider'
import { interactionTokens } from './interaction-tokens'
import { type ComponentLayoutStyle, layoutStyle } from './contracts'
import { input } from './input'
import * as Pagination from './pagination'
import { className } from './style'
import { complexTokens } from './complex-tokens'
import { foundationTokens } from './foundations-tokens'
import { tokens } from './tokens'
import * as Table from './table'

export * from '@/lib/data-table-state'

export type DataTableColumn<Row> = Readonly<{
  key: string
  header: string
  cell: (row: Row) => Html | string
  sortValue?: (row: Row) => string | number
  isHideable?: boolean
  align?: 'left' | 'center' | 'right'
  layoutStyle?: ComponentLayoutStyle | undefined
  /** Faceted variant: lucide icon rendered in the header menu trigger. */
  iconName?: string
  /** Faceted variant: text accessor for search, option filters, and CSV. */
  get?: (row: Row) => string
  /** Faceted variant: which filter control the column gets in the toolbar. */
  filterVariant?: FilterVariant
  /** Faceted variant: options for an 'options' filter or a value menu. */
  options?: ReadonlyArray<
    Readonly<{ value: string; label: string; iconName?: string }>
  >
  /** Faceted variant: numeric accessor for 'range' filters. */
  getNumber?: (row: Row) => number
  /** Faceted variant: epoch-ms accessor for 'date' filters. */
  getDate?: (row: Row) => number
  rangeMin?: number
  rangeMax?: number
  rangeStep?: number
  /** Faceted variant: apply a menu/bulk-edit value to a row (page-side). */
  set?: (row: Row, value: string) => Row
  /** Faceted variant: show the header's sort/hide menu. Default true. */
  sortable?: boolean
}>
export type DataTableProps<Row, Msg> = Readonly<{
  model: Model
  toParentMessage: (message: Message) => Msg
  rows: ReadonlyArray<Row>
  columns: ReadonlyArray<DataTableColumn<Row>>
  rowKey: (row: Row) => string
  filterText?: (row: Row) => string
  filterPlaceholder?: string
  emptyText?: string
  ariaLabel?: string
  id?: string
  enableRowSelection?: boolean
  enableColumnVisibility?: boolean
  isRowSelectable?: (row: Row) => boolean
  rowSelectionLabel?: (row: Row) => string
  pageSizeOptions?: ReadonlyArray<number>
  mode?: DataTableMode
  rowCount?: number
  /** Additional filters or bulk actions, between search and column visibility. */
  toolbarContent?: ReadonlyArray<Html | string>
  layoutStyle?: ComponentLayoutStyle | undefined
  /** 'faceted' renders the tablecn-style chrome: faceted filter buttons,
      sort menu, view panel, header menus, row menus, floating action bar
      slot, and the full pagination row. */
  variant?: 'faceted'
  /** Faceted variant: search input placeholder + which column it searches. */
  searchPlaceholder?: string
  searchAriaLabel?: string
  searchColumnKey?: string
  /** Faceted variant: pseudo-column whose options populate the row
      menu's radio submenu (e.g. a label that isn't a display column). */
  valueMenu?: Readonly<{
    key: string
    header: string
    options: ReadonlyArray<Readonly<{ value: string; label: string }>>
    get: (row: Row) => string
  }>
  /** Faceted variant: render the per-row actions column. Default true. */
  rowMenu?: boolean
  /** Faceted variant: content rendered inside the floating action bar. */
  actionBar?: ReadonlyArray<Html | string>
  /** Faceted variant: noun used in the delete dialog. */
  deleteItemLabel?: string
  directionLabel?: string
}>

// The Tailwind `shadow-md` serializes with the theme's base ring/border
// shadows — overriding tokens.shadowCard verbatim so both renderers produce
// the identical box-shadow on the open column chooser.
const SHADOW_MD =
  'rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px'

const styles = {
  alignLeft: Style.make({ textAlign: 'left' }),
  alignCenter: Style.make({ textAlign: 'center' }),
  alignRight: Style.make({ textAlign: 'right' }),
  cell: Style.make({
    paddingBlock: '0.75rem',
    paddingInline: '0.75rem',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
  }),
  chooser: Style.make({ position: 'relative', marginLeft: 'auto' }),
  chooserOption: Style.make({
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    minHeight: '2.5rem',
  }),
  chooserPanel: Style.make({
    padding: '0.375rem',
    borderColor: tokens.border,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    backgroundColor: tokens.card,
    boxShadow: tokens.shadowCard,
    position: 'absolute',
    zIndex: 20,
    minWidth: '12rem',
    right: 0,
    top: 'calc(100% + 0.375rem)',
  }),
  chooserSummary: Style.make({
    gap: '0.5rem',
    paddingInline: '0.75rem',
    display: 'flex',
    height: '2.5rem',
  }),
  count: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  empty: Style.make({
    color: tokens.mutedForeground,
    textAlign: 'center',
    height: '6rem',
  }),
  filter: Style.make({
    paddingInline: '0.75rem',
    height: '2.5rem',
    maxWidth: '24rem',
  }),
  footer: Style.make({
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  }),
  head: Style.make({
    paddingInline: '0.5rem',
    color: tokens.foreground,
    fontWeight: 500,
    textAlign: 'start',
    verticalAlign: 'middle',
    height: '2.5rem',
  }),
  headerRow: Style.make({
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  }),
  pageLabel: Style.make({
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    fontWeight: 500,
    lineHeight: '1.25rem',
    whiteSpace: 'nowrap',
  }),
  root: Style.make({ width: '100%' }),
  row: Style.make({
    backgroundColor: tokens.transparent,
    transitionProperty: 'color, background-color',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
  }).pipe(
    Style.when(When.hover, { backgroundColor: complexTokens.mutedSurface }),
    Style.when(When.lastChild, { borderBottomWidth: 0 }),
  ),
  rowSelected: Style.make({ backgroundColor: complexTokens.mutedSurface }),
  select: Style.make({
    borderColor: tokens.border,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    paddingInline: '0.5rem',
    backgroundColor: tokens.background,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    height: '2.5rem',
  }),
  selectionBox: Style.make({
    borderColor: tokens.input,
    borderStyle: 'solid',
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: tokens.background,
    color: tokens.primaryForeground,
    display: 'flex',
    justifyContent: 'center',
    height: '1rem',
    width: '1rem',
  }),
  selectionBoxChecked: Style.make({
    borderColor: tokens.primary,
    backgroundColor: tokens.primary,
  }),
  selectionButton: Style.make({
    padding: 0,
    borderWidth: 0,
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    display: 'inline-flex',
    justifyContent: 'center',
    opacity: 1,
    height: '2.5rem',
    width: '2.5rem',
  }).pipe(Style.when(When.disabled, { opacity: 0.5 })),
  selectionCell: Style.make({ padding: 0, textAlign: 'center', width: '3rem' }),
  selectionIcon: Style.make({ height: '0.75rem', width: '0.75rem' }),
  sort: Style.make({
    borderRadius: foundationTokens.radiusSm,
    gap: '0.25rem',
    alignItems: 'center',
    display: 'inline-flex',
    outlineColor: tokens.transparent,
    outlineStyle: 'none',
    outlineWidth: 0,
  }).pipe(
    Style.when(When.focusVisible, {
      outlineColor: tokens.ring,
      outlineStyle: 'solid',
      outlineWidth: 2,
    }),
  ),
  sortIcon: Style.make({
    color: tokens.mutedForeground,
    flexShrink: 0,
    height: '0.875rem',
    width: '0.875rem',
  }),
  sortArrowActive: Style.make({ color: tokens.primary }),
  tableShell: Style.make({
    borderColor: tokens.border,
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: '1rem',
  }),
  controls: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
  }),
  toolbar: Style.make({
    gap: '0.75rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  }),
}

const selectionControl = <Msg>(
  props: Readonly<{
    id: string
    label: string
    isChecked: boolean
    isIndeterminate?: boolean
    isDisabled?: boolean
    onToggle: (isChecked: boolean) => Msg
  }>,
  h: HtmlBuilder<Msg>,
): Html =>
  CheckboxPrimitive.view(
    {
      id: props.id,
      isChecked: props.isChecked,
      isIndeterminate: props.isIndeterminate ?? false,
      isDisabled: props.isDisabled ?? false,
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
                h.Style({ borderRadius: '4px' }),
              ],
              [
                props.isChecked || props.isIndeterminate === true
                  ? Icon.check<Msg>(
                      { class: className(styles.selectionIcon) },
                      h,
                    )
                  : '',
              ],
            ),
          ],
        ),
    },
    h,
  )

const columnAlignStyle = (align: DataTableColumn<unknown>['align']) =>
  align === 'right'
    ? styles.alignRight
    : align === 'center'
      ? styles.alignCenter
      : align === 'left'
        ? styles.alignLeft
        : undefined

export const dataTable = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  if (props.variant === 'faceted') return facetedDataTable(props, h)
  const instanceId =
    props.id ??
    `data-table-${(props.ariaLabel ?? 'rows').toLocaleLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`
  const projection = projectDataTable({
    columns: props.columns,
    ...(props.filterText === undefined ? {} : { filterText: props.filterText }),
    ...(props.isRowSelectable === undefined
      ? {}
      : { isRowSelectable: props.isRowSelectable }),
    ...(props.mode === undefined ? {} : { mode: props.mode }),
    model: props.model,
    ...(props.rowCount === undefined ? {} : { rowCount: props.rowCount }),
    rowKey: props.rowKey,
    rows: props.rows,
  })
  const {
    filteredRowCount,
    page,
    pageCount,
    rows: visible,
    selectableRowKeys: selectableKeys,
    selectedRowCount: selectedCount,
  } = projection
  const hiddenKeys = new Set(props.model.hiddenColumnKeys)
  const visibleColumns = props.columns.filter(
    column => !hiddenKeys.has(column.key),
  )
  const selectedKeys = new Set(props.model.selectedRowKeys)
  const selectedOnPage = selectableKeys.filter(key => selectedKeys.has(key))
  const allOnPageSelected =
    selectableKeys.length > 0 && selectedOnPage.length === selectableKeys.length
  const someOnPageSelected = selectedOnPage.length > 0 && !allOnPageSelected
  const columnCount =
    visibleColumns.length + (props.enableRowSelection === true ? 1 : 0)
  const headings = visibleColumns.map(column =>
    h.th(
      [
        h.Scope('col'),
        ...(column.sortValue === undefined
          ? []
          : [
              h.AriaSort(
                props.model.sortKey === column.key
                  ? props.model.sortDirection
                  : 'none',
              ),
            ]),
        h.Class(
          className(
            reset.tableHeading,
            styles.head,
            columnAlignStyle(column.align),
            column.layoutStyle,
          ),
        ),
      ],
      column.sortValue === undefined
        ? [column.header]
        : [
            h.button(
              [
                h.Type('button'),
                h.OnClick(
                  props.toParentMessage(
                    DataTableStateMessages.Sorted({ key: column.key }),
                  ),
                ),
                h.Class(className(reset.button, styles.sort)),
              ],
              [
                column.header,
                h.svg(
                  [
                    h.ViewBox('0 0 24 24'),
                    h.Fill('none'),
                    h.Stroke('currentColor'),
                    h.StrokeWidth('2'),
                    h.StrokeLinecap('round'),
                    h.StrokeLinejoin('round'),
                    h.AriaHidden(true),
                    h.Class(className(styles.sortIcon)),
                  ],
                  [
                    h.path(
                      [
                        h.D('m7 15 5 5 5-5'),
                        h.Class(
                          className(
                            props.model.sortKey === column.key &&
                              props.model.sortDirection === 'descending' &&
                              styles.sortArrowActive,
                          ),
                        ),
                      ],
                      [],
                    ),
                    h.path(
                      [
                        h.D('m7 9 5-5 5 5'),
                        h.Class(
                          className(
                            props.model.sortKey === column.key &&
                              props.model.sortDirection === 'ascending' &&
                              styles.sortArrowActive,
                          ),
                        ),
                      ],
                      [],
                    ),
                  ],
                ),
              ],
            ),
          ],
    ),
  )
  const bodyRows =
    visible.length === 0
      ? [
          h.tr(
            [],
            [
              h.td(
                [h.Colspan(columnCount), h.Class(className(styles.empty))],
                [props.emptyText ?? 'No results.'],
              ),
            ],
          ),
        ]
      : visible.map(row => {
          const key = props.rowKey(row)
          const isSelected = selectedKeys.has(key)
          const isSelectable = props.isRowSelectable?.(row) ?? true
          return h.tr(
            [
              h.Key(key),
              ...(isSelected ? [h.DataAttribute('selected', '')] : []),
              h.Class(className(styles.row, isSelected && styles.rowSelected)),
            ],
            [
              ...(props.enableRowSelection === true
                ? [
                    h.td(
                      [h.Class(className(styles.selectionCell))],
                      [
                        selectionControl(
                          {
                            id: `${instanceId}-row-${key}`,
                            label:
                              props.rowSelectionLabel?.(row) ??
                              `Select row ${key}`,
                            isChecked: isSelected,
                            isDisabled: !isSelectable,
                            onToggle: isChecked =>
                              props.toParentMessage(
                                DataTableStateMessages.ToggledRow({
                                  key,
                                  isSelected: isChecked,
                                }),
                              ),
                          },
                          h,
                        ),
                      ],
                    ),
                  ]
                : []),
              ...visibleColumns.map(column =>
                h.td(
                  [
                    h.Class(
                      className(
                        styles.cell,
                        columnAlignStyle(column.align),
                        column.layoutStyle,
                      ),
                    ),
                  ],
                  [column.cell(row)],
                ),
              ),
            ],
          )
        })
  const pageSizes = [
    ...new Set(
      [...(props.pageSizeOptions ?? [10, 20, 50]), props.model.pageSize].filter(
        size => size > 0,
      ),
    ),
  ].sort((left, right) => left - right)
  return h.div(
    [
      h.DataAttribute('slot', 'data-table'),
      h.Class(className(styles.root, props.layoutStyle)),
    ],
    [
      h.div(
        [
          h.DataAttribute('slot', 'data-table-toolbar'),
          h.Class(className(styles.toolbar)),
        ],
        [
          ...(props.filterText === undefined
            ? []
            : [
                input(
                  {
                    id: `${instanceId}-filter`,
                    type: 'search',
                    value: props.model.filter,
                    onInput: value =>
                      props.toParentMessage(
                        DataTableStateMessages.Filtered({ value }),
                      ),
                    placeholder: props.filterPlaceholder ?? 'Filter rows…',
                    ariaLabel: props.filterPlaceholder ?? 'Filter rows',
                    inputStyle: styles.filter,
                  },
                  h,
                ),
              ]),
          ...(props.toolbarContent ?? []),
          ...(props.enableColumnVisibility === true
            ? [
                h.div(
                  [
                    h.Class(className(styles.chooser)),
                    h.OnKeyDownPreventDefault(key =>
                      key === 'Escape' && props.model.columnsMenuOpen
                        ? Option.some(
                            props.toParentMessage(
                              DataTableStateMessages.ClosedColumnsMenu(),
                            ),
                          )
                        : Option.none(),
                    ),
                  ],
                  [
                    h.button(
                      [
                        h.Type('button'),
                        h.AriaExpanded(props.model.columnsMenuOpen),
                        h.AriaHasPopup('menu'),
                        h.OnClick(
                          props.toParentMessage(
                            DataTableStateMessages.ToggledColumnsMenu(),
                          ),
                        ),
                        h.Class(
                          className(
                            reset.button,
                            ...buttonVisualStyles({ variant: 'outline' }),
                            styles.chooserSummary,
                          ),
                        ),
                      ],
                      [
                        'Columns',
                        Icon.chevronDown<Msg>(
                          { class: className(styles.sortIcon) },
                          h,
                        ),
                      ],
                    ),
                    ...(props.model.columnsMenuOpen
                      ? [
                          h.button(
                            [
                              h.Class(className(reset.button)),
                              h.Type('button'),
                              h.Tabindex(-1),
                              h.AriaHidden(true),
                              h.Style({
                                position: 'fixed',
                                inset: '0',
                                zIndex: '10',
                                cursor: 'default',
                                border: 'none',
                                background: 'transparent',
                              }),
                              h.OnClick(
                                props.toParentMessage(
                                  DataTableStateMessages.ClosedColumnsMenu(),
                                ),
                              ),
                            ],
                            [],
                          ),
                          h.div(
                            [
                              h.Class(className(styles.chooserPanel)),
                              h.Style({ boxShadow: SHADOW_MD }),
                            ],
                            props.columns
                              .filter(
                                column =>
                                  column.isHideable !== false &&
                                  column.header.trim() !== '',
                              )
                              .map(column => {
                                const isVisible = !hiddenKeys.has(column.key)
                                return h.div(
                                  [h.Class(className(styles.chooserOption))],
                                  [
                                    selectionControl(
                                      {
                                        id: `data-table-column-${column.key}`,
                                        label: `${isVisible ? 'Hide' : 'Show'} ${column.header} column`,
                                        isChecked: isVisible,
                                        isDisabled:
                                          isVisible &&
                                          visibleColumns.length === 1,
                                        onToggle: nextVisible =>
                                          props.toParentMessage(
                                            DataTableStateMessages.ToggledColumn(
                                              {
                                                key: column.key,
                                                isVisible: nextVisible,
                                              },
                                            ),
                                          ),
                                      },
                                      h,
                                    ),
                                    column.header,
                                  ],
                                )
                              }),
                          ),
                        ]
                      : []),
                  ],
                ),
              ]
            : []),
        ],
      ),
      h.div(
        [h.Class(className(styles.tableShell))],
        [
          Table.table(
            {
              ariaLabel: props.ariaLabel,
              children: [
                h.thead(
                  [],
                  [
                    h.tr(
                      [h.Class(className(styles.headerRow))],
                      [
                        ...(props.enableRowSelection === true
                          ? [
                              h.th(
                                [
                                  h.Scope('col'),
                                  h.Class(
                                    className(
                                      reset.tableHeading,
                                      styles.selectionCell,
                                    ),
                                  ),
                                ],
                                [
                                  selectionControl(
                                    {
                                      id: `${instanceId}-select-page`,
                                      label: allOnPageSelected
                                        ? 'Deselect all rows on this page'
                                        : 'Select all rows on this page',
                                      isChecked: allOnPageSelected,
                                      isIndeterminate: someOnPageSelected,
                                      isDisabled: selectableKeys.length === 0,
                                      onToggle: isSelected =>
                                        props.toParentMessage(
                                          DataTableStateMessages.ToggledRows({
                                            keys: selectableKeys,
                                            isSelected,
                                          }),
                                        ),
                                    },
                                    h,
                                  ),
                                ],
                              ),
                            ]
                          : []),
                        ...headings,
                      ],
                    ),
                  ],
                ),
                h.tbody([], bodyRows),
              ],
            },
            h,
          ),
        ],
      ),
      h.div(
        [h.Class(className(styles.footer))],
        [
          h.p(
            [h.Class(className(reset.text, styles.count))],
            [
              props.enableRowSelection === true
                ? `${selectedCount} of ${filteredRowCount} row${filteredRowCount === 1 ? '' : 's'} selected.`
                : `${filteredRowCount} row${filteredRowCount === 1 ? '' : 's'}`,
            ],
          ),
          h.div(
            [h.Class(className(styles.controls))],
            [
              h.label(
                [
                  h.Class(className(styles.count)),
                  h.For(`${instanceId}-page-size`),
                ],
                ['Rows per page'],
              ),
              h.select(
                [
                  h.Id(`${instanceId}-page-size`),
                  h.Value(String(props.model.pageSize)),
                  h.OnChange(value =>
                    props.toParentMessage(
                      DataTableStateMessages.ChangedPageSize({
                        pageSize: Number(value),
                      }),
                    ),
                  ),
                  h.Class(className(reset.input, styles.select)),
                ],
                pageSizes.map(size =>
                  h.option(
                    [
                      h.Value(String(size)),
                      h.Class(className(fst.pageSizeOption)),
                    ],
                    [String(size)],
                  ),
                ),
              ),
              h.span(
                [h.Class(className(styles.pageLabel))],
                [`Page ${page + 1} of ${pageCount}`],
              ),
              h.div(
                [],
                [
                  Pagination.paginationPages(
                    {
                      page: page + 1,
                      totalPages: pageCount,
                      siblingCount: 0,
                      ariaLabel: `${props.ariaLabel ?? 'Rows'} pagination`,
                      navigation: {
                        kind: 'action',
                        onNavigate: page =>
                          props.toParentMessage(
                            DataTableStateMessages.ChangedPage({
                              page: page - 1,
                            }),
                          ),
                      },
                    },
                    h,
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

/* ---------- faceted variant (tablecn-style chrome) ---------- */

const fst = {
  lgOnly: Style.make({ display: 'none' }).pipe(
    Style.when(When.minWidth('1024px'), { display: 'flex' }),
  ),
  badge2: Style.make({
    borderColor: 'transparent',
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    overflow: 'hidden',
    paddingBlock: '0.125rem',
    paddingInline: '0.25rem',
    alignItems: 'center',
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 400,
    justifyContent: 'center',
    lineHeight: '1rem',
    transitionProperty: 'all',
    whiteSpace: 'nowrap',
    height: '1.25rem',
    width: 'fit-content',
  }),
  badge3: Style.make({
    borderColor: 'transparent',
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    overflow: 'hidden',
    paddingBlock: '0.125rem',
    paddingInline: '0.25rem',
    alignItems: 'center',
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 400,
    justifyContent: 'center',
    lineHeight: '1rem',
    transitionProperty: 'all',
    whiteSpace: 'nowrap',
    height: '1.25rem',
    width: 'fit-content',
  }),
  badge4: Style.make({
    borderColor: 'transparent',
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    overflow: 'hidden',
    paddingBlock: '0.125rem',
    paddingInline: '0.25rem',
    alignItems: 'center',
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 400,
    justifyContent: 'center',
    lineHeight: '1rem',
    transitionProperty: 'all',
    whiteSpace: 'nowrap',
    height: '1.25rem',
    width: 'fit-content',
  }),
  badge5: Style.make({
    borderColor: 'transparent',
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    overflow: 'hidden',
    paddingBlock: '0.125rem',
    paddingInline: '0.25rem',
    alignItems: 'center',
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 400,
    justifyContent: 'center',
    lineHeight: '1rem',
    transitionProperty: 'all',
    whiteSpace: 'nowrap',
    height: '1.25rem',
    width: 'fit-content',
  }),
  badge6: Style.make({
    borderColor: 'transparent',
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    overflow: 'hidden',
    paddingBlock: '0.125rem',
    paddingInline: '0.25rem',
    alignItems: 'center',
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.75rem',
    fontWeight: 400,
    justifyContent: 'center',
    lineHeight: '1rem',
    transitionProperty: 'all',
    whiteSpace: 'nowrap',
    height: '1.25rem',
    width: 'fit-content',
  }),
  badge7: Style.make({
    borderColor: 'transparent',
    borderRadius: foundationTokens.radiusFull,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    overflow: 'hidden',
    paddingBlock: '0.125rem',
    paddingInline: '0.375rem',
    alignItems: 'center',
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    display: 'inline-flex',
    flexShrink: 0,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '0.75rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1rem',
    transitionProperty: 'all',
    whiteSpace: 'nowrap',
    height: '1.25rem',
    width: 'fit-content',
  }),
  cbWrap8: Style.make({
    display: 'inline-flex',
    transform: 'translateY(0.125rem)',
  }),
  cbWrap9: Style.make({
    display: 'inline-flex',
    transform: 'translateY(0.125rem)',
  }),
  c0: Style.make({
    padding: '0.25rem',
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: foundationTokens.popover,
    boxShadow: foundationTokens.shadowMd,
    color: foundationTokens.popoverForeground,
    outlineStyle: 'none',
    position: 'absolute',
    zIndex: 50,
    marginTop: '0.25rem',
    top: '100%',
    width: '12rem',
  }),
  c1: Style.make({
    borderRadius: foundationTokens.radiusSm,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    alignItems: 'center',
    backgroundColor: 'transparent',
    cursor: interactionTokens.cursorDefault,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    paddingInlineEnd: '0.5rem',
    paddingInlineStart: '2rem',
    position: 'relative',
    userSelect: 'none',
    width: '100%',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
    Style.when(When.focus, {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
  ),
  c2: Style.make({
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
  }),
  c3: Style.make({
    marginBlock: '0.25rem',
    marginInline: '-0.25rem',
    backgroundColor: tokens.border,
    height: '1px',
  }),
  c6: Style.make({ position: 'relative' }),
  c7: Style.make({
    inset: '0',
    backgroundColor: 'transparent',
    cursor: interactionTokens.cursorDefault,
    position: 'fixed',
    zIndex: 40,
  }),
  c8: Style.make({
    alignItems: 'center',
    display: 'flex',
    insetInlineStart: '0.5rem',
    justifyContent: 'center',
    position: 'absolute',
    height: '0.875rem',
    width: '0.875rem',
  }),
  pageSizeOption: Style.make({ paddingBlock: '0' }),
  c10: Style.make({
    paddingInline: '0.5rem',
    paddingBlock: '0',
    color: tokens.foreground,
    fontWeight: 500,
    textAlign: 'left',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    height: '2.5rem',
    width: '2.5rem',
  }),
  c12: Style.make({
    paddingInline: '0.5rem',
    paddingBlock: '0',
    color: tokens.foreground,
    fontWeight: 500,
    textAlign: 'left',
    verticalAlign: 'middle',
    whiteSpace: 'nowrap',
    height: '2.5rem',
  }),
  c13: Style.make({
    borderRadius: foundationTokens.radiusMd,
    gap: '0.375rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: 'transparent',
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    fontWeight: 500,
    marginInlineStart: '-0.375rem',
    textAlign: 'left',
    height: '2rem',
    width: 'auto',
  }).pipe(
    Style.when(When.hover, { backgroundColor: tokens.accent }),
    Style.when(When.focus, { boxShadow: `inset 0 0 0 1px ${tokens.ring}` }),
  ),
  c14: Style.make({ insetInlineStart: '0rem', width: '7rem' }),
  c15: Style.make({ paddingInlineStart: '2rem' }),
  c17: Style.make({ gap: '0.5rem', alignItems: 'center', display: 'flex' }),
  c22: Style.make({ display: 'flex', justifyContent: 'flex-end' }),
  c23: Style.make({
    borderRadius: foundationTokens.radiusMd,
    alignItems: 'center',
    backgroundColor: 'transparent',
    display: 'inline-flex',
    justifyContent: 'center',
    height: '2rem',
    width: '2rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
  ),
  c24: Style.make({ insetInlineEnd: '0rem', width: '10rem' }),
  c26: layoutStyle({ marginInlineStart: 'auto' }),
  subPanel: Style.make({
    insetInlineEnd: '100%',
    marginInlineEnd: '0.25rem',
    marginTop: '0rem',
    top: '0rem',
    width: '10rem',
  }),
  radioDot: Style.make({
    fill: 'currentColor',
    height: '0.5rem',
    width: '0.5rem',
  }),
  c27: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.375rem',
    paddingInline: '0.625rem',
    alignItems: 'center',
    backgroundColor: 'transparent',
    boxShadow: foundationTokens.shadowXs,
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color, border-color, box-shadow',
    whiteSpace: 'nowrap',
    height: '2rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
  ),
  c28: Style.make({ borderStyle: 'dashed' }),
  c29: Style.make({
    marginInline: '0.25rem',
    backgroundColor: tokens.border,
    height: '1rem',
    width: '1px',
  }),
  c32: Style.make({
    padding: '0rem',
    insetInlineStart: '0rem',
    width: '12.5rem',
  }),
  c33: Style.make({
    padding: '0.25rem',
    maxHeight: '18rem',
    overflowY: 'auto',
  }),
  c37: Style.make({
    color: tokens.mutedForeground,
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    marginInlineStart: 'auto',
  }),
  c38: Style.make({
    justifyContent: 'center',
    paddingInlineStart: '2rem',
    textAlign: 'center',
  }),
  c39: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.375rem',
    paddingInline: '0.625rem',
    alignItems: 'center',
    backgroundColor: 'transparent',
    boxShadow: foundationTokens.shadowXs,
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color, border-color, box-shadow',
    whiteSpace: 'nowrap',
    height: '2rem',
  }).pipe(Style.when(When.hover, { backgroundColor: tokens.accent })),
  c41: Style.make({
    padding: '0.75rem',
    insetInlineStart: '0rem',
    width: '14rem',
  }),
  c42: Style.make({
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    marginBottom: '0.5rem',
  }),
  c43: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    paddingInline: '0.5rem',
    backgroundColor: 'transparent',
    boxShadow: foundationTokens.shadowXs,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    height: '2rem',
    width: '100%',
  }).pipe(
    Style.when(When.focusVisible, {
      boxShadow: `inset 0 0 0 1px ${tokens.ring}`,
    }),
  ),
  pl2: Style.make({ paddingInlineStart: '0.5rem' }),
  panelAuto: Style.make({
    padding: '0rem',
    insetInlineStart: '0rem',
    width: 'auto',
  }),
  rowSel: Style.make({ backgroundColor: tokens.muted }),
  col3: Style.make({
    gap: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  footerTop: Style.make({
    borderTopColor: tokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
  }),
  footerPad: Style.make({
    padding: '0.75rem',
    borderTopColor: tokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
  }),
  clearBtn: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    paddingInline: '0.625rem',
    alignItems: 'center',
    backgroundColor: 'transparent',
    boxShadow: foundationTokens.shadowXs,
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color, border-color, box-shadow',
    whiteSpace: 'nowrap',
    height: '2rem',
    width: '100%',
  }).pipe(Style.when(When.hover, { backgroundColor: tokens.accent })),
  c45: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.375rem',
    paddingInline: '0.625rem',
    alignItems: 'center',
    backgroundColor: 'transparent',
    boxShadow: foundationTokens.shadowXs,
    display: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    marginInlineStart: 'auto',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color, border-color, box-shadow',
    height: '2rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
    Style.when(When.minWidth('1024px'), { display: 'flex' }),
  ),
  c46: Style.make({ insetInlineEnd: '0rem', width: '11rem' }),
  c47: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.375rem',
    paddingInline: '0.625rem',
    alignItems: 'center',
    backgroundColor: 'transparent',
    boxShadow: foundationTokens.shadowXs,
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color, border-color, box-shadow',
    height: '2rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    }),
  ),
  c49: Style.make({
    padding: '1rem',
    gap: '0.875rem',
    flexDirection: 'column',
    insetInlineEnd: '0rem',
    minWidth: '23.75rem',
    width: 'auto',
  }),
  c50: Style.make({ gap: '0.25rem', display: 'flex', flexDirection: 'column' }),
  c51: Style.make({ fontWeight: 500, lineHeight: 1 }),
  c52: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  c53: Style.make({
    padding: '0.25rem',
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: '300px',
    overflowY: 'auto',
  }),
  c54: Style.make({
    padding: '0.25rem',
    borderRadius: foundationTokens.radiusMd,
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    width: '100%',
  }),
  c55: Style.make({
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    width: '11rem',
  }),
  c56: Style.make({
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    marginInlineStart: 'auto',
  }),
  c57: Style.make({
    borderRadius: foundationTokens.radiusSm,
    paddingInline: '0.5rem',
    fontSize: '0.75rem',
    lineHeight: '1rem',
    height: '1.75rem',
  }),
  c58: Style.make({
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  }),
  c59: Style.make({
    backgroundColor: 'transparent',
    color: tokens.mutedForeground,
  }).pipe(Style.when(When.hover, { backgroundColor: tokens.accent })),
  c60: Style.make({
    borderRadius: foundationTokens.radiusSm,
    alignItems: 'center',
    backgroundColor: 'transparent',
    color: tokens.mutedForeground,
    display: 'inline-flex',
    justifyContent: 'center',
    height: '1.75rem',
    width: '1.75rem',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: `color-mix(in srgb, ${tokens.destructive} 10%, transparent)`,
      color: tokens.destructive,
    }),
  ),
  c61: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    width: '100%',
  }),
  c62: Style.make({ gap: '0.375rem' }),
  c73: Style.make({
    inset: '0',
    backgroundColor: tokens.backdrop,
    position: 'fixed',
    zIndex: 50,
  }),
  c77: Style.make({
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: '1.75rem',
  }),
  c80: Style.make({
    padding: '1.5rem',
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusLg,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '1rem',
    backgroundColor: tokens.background,
    boxShadow: foundationTokens.shadowXl,
    display: 'grid',
    position: 'fixed',
    transform: 'translateY(-50.0%)',
    zIndex: 50,
    left: '50%',
    maxWidth: 'calc(100%-2rem)',
    top: '50.0%',
    width: '100%',
  }).pipe(Style.when(When.minWidth('640px'), { maxWidth: '32rem' })),
  c81: Style.make({
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
  }).pipe(Style.when(When.minWidth('640px'), { textAlign: 'left' })),
  c82: Style.make({
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column-reverse',
  }).pipe(
    Style.when(When.minWidth('640px'), {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    }),
  ),
  c85: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    alignItems: 'center',
    backgroundColor: 'transparent',
    boxShadow: foundationTokens.shadowXs,
    display: 'inline-flex',
    justifyContent: 'center',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color, border-color, box-shadow',
    height: '2rem',
    width: '2rem',
  }).pipe(Style.when(When.hover, { backgroundColor: tokens.accent })),
  c86: Style.make({
    padding: '0.25rem',
    gap: '1rem',
    overflow: 'auto',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column-reverse',
    justifyContent: 'space-between',
    width: '100%',
  }).pipe(
    Style.when(When.minWidth('640px'), { gap: '2rem', flexDirection: 'row' }),
  ),
  c87: Style.make({
    flex: '1',
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    whiteSpace: 'nowrap',
  }),
  c88: Style.make({
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column-reverse',
  }).pipe(
    Style.when(When.minWidth('640px'), { gap: '1.5rem', flexDirection: 'row' }),
  ),
  c89: Style.make({
    marginBlock: '0',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    whiteSpace: 'nowrap',
  }),
  c91: Style.make({
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'center',
    lineHeight: '1.25rem',
    whiteSpace: 'nowrap',
  }),
  c92: Style.make({
    padding: '0.25rem',
    gap: '0.625rem',
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    width: '100%',
  }),
  c95: Style.make({
    padding: '0.25rem',
    gap: '0.5rem',
    alignItems: 'flex-start',
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  }),
  c96: Style.make({
    flex: '1',
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
  }),
  c97: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    paddingInline: '0.625rem',
    backgroundColor: 'transparent',
    boxShadow: foundationTokens.shadowXs,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    height: '2rem',
    width: '10rem',
  }).pipe(
    Style.when(When.focusVisible, {
      borderColor: tokens.ring,
      boxShadow: `inset 0 0 0 1px ${tokens.ring}`,
    }),
    Style.when(When.placeholder, { color: tokens.mutedForeground }),
    Style.when(When.minWidth('1024px'), { width: '14rem' }),
  ),
  c98: Style.make({
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    flex: '1',
    overflow: 'auto',
    isolation: 'isolate',
    minHeight: '0',
  }),
  c99: Style.make({
    borderCollapse: 'collapse',
    captionSide: 'bottom',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    tableLayout: 'fixed',
    width: '100%',
  }),
  c100: Style.make({ opacity: '1' }),
  c101: Style.make({
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color, border-color, box-shadow',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  }),
  c102: Style.make({ opacity: '1' }),
  c103: Style.make({
    backgroundColor: 'transparent',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color, border-color, box-shadow',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: `color-mix(in srgb, ${tokens.muted} 50%, transparent)`,
    }),
    Style.when(When.lastChild, { borderBottomWidth: '0px' }),
  ),
  c104: Style.make({ padding: '0.5rem', verticalAlign: 'middle' }),
  c106: Style.make({
    gap: '0.625rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  icon0: Style.make({ display: 'inline-flex', fontSize: '1rem' }),
  icon1: Style.make({ display: 'inline-flex' }),
  icon2: Style.make({ display: 'inline-flex' }),
  icon3: Style.make({ display: 'inline-flex' }),
  icon6: Style.make({ display: 'inline-flex' }),
  icon7: Style.make({ display: 'inline-flex' }),
  icon8: Style.make({ display: 'inline-flex' }),
  icon10: Style.make({ display: 'inline-flex' }),
  icon11: Style.make({ display: 'inline-flex' }),
  icon12: Style.make({ display: 'inline-flex' }),
  icon13: Style.make({ display: 'inline-flex' }),
  icon14: Style.make({ display: 'inline-flex' }),
  icon15: Style.make({ display: 'inline-flex' }),
  icon17: Style.make({ display: 'inline-flex' }),
  icon18: Style.make({ display: 'inline-flex' }),
  icon19: Style.make({ display: 'inline-flex' }),
  icon20: Style.make({ display: 'inline-flex' }),
  icon21: Style.make({ display: 'inline-flex' }),
  icon22: Style.make({
    color: tokens.mutedForeground,
    display: 'inline-flex',
    fontSize: '1rem',
  }),
  icon23: Style.make({
    color: tokens.mutedForeground,
    display: 'inline-flex',
    fontSize: '1rem',
  }),
  icon24: Style.make({ display: 'inline-flex' }),
  icon33: Style.make({ display: 'inline-flex' }),
  icon34: Style.make({ display: 'inline-flex', fontSize: '1rem' }),
}

const FACETED_PANEL_CLASS = fst.c0
const FACETED_MENU_ITEM_CLASS = fst.c1
const FACETED_MENU_LABEL_CLASS = fst.c2
const FACETED_MENU_SEPARATOR_CLASS = fst.c3

const facetedTablecnStyles = {
  pageSizeTrigger: layoutStyle({ width: '4.5rem' }),
}

const facetedConfig = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
): DataTableConfig<Row> => ({
  columns: props.columns.map(column => ({
    id: column.key,
    header: column.header,
    ...(column.iconName === undefined ? {} : { iconName: column.iconName }),
    ...(column.filterVariant === undefined
      ? {}
      : { filterVariant: column.filterVariant }),
    ...(column.options === undefined ? {} : { options: column.options }),
    get:
      column.get ??
      (row => {
        const rendered = column.cell(row)
        return typeof rendered === 'string' ? rendered : ''
      }),
    ...(column.getNumber === undefined ? {} : { getNumber: column.getNumber }),
    ...(column.getDate === undefined ? {} : { getDate: column.getDate }),
    ...(column.rangeMin === undefined ? {} : { rangeMin: column.rangeMin }),
    ...(column.rangeMax === undefined ? {} : { rangeMax: column.rangeMax }),
    ...(column.rangeStep === undefined ? {} : { rangeStep: column.rangeStep }),
    ...(column.sortValue === undefined ? {} : { sortValue: column.sortValue }),
    ...(column.set === undefined ? {} : { set: column.set }),
  })),
  rowKey: props.rowKey,
  ...(props.searchColumnKey === undefined
    ? {}
    : { searchColumnId: props.searchColumnKey }),
})

const facetedTriggerPanel = <Msg>(
  isOpen: boolean,
  trigger: Html,
  onClose: Msg,
  panel: Html,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class(className(fst.c6))],
    [
      trigger,
      ...(isOpen
        ? [
            h.button([
              h.Type('button'),
              h.AriaHidden(true),
              h.Tabindex(-1),
              h.Class(className(reset.button, fst.c7)),
              h.OnClick(onClose),
            ]),
            h.div(
              [
                h.OnKeyDownPreventDefault(key =>
                  key === 'Escape' ? Option.some(onClose) : Option.none(),
                ),
              ],
              [panel],
            ),
          ]
        : []),
    ],
  )

const facetedCheckItem = <Msg>(
  label: string,
  isChecked: boolean,
  onSelect: Msg,
  iconNode: Html | undefined,
  h: HtmlBuilder<Msg>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.Role('menuitemcheckbox'),
      h.AriaChecked(isChecked),
      h.OnClick(onSelect),
      h.Class(className(reset.button, FACETED_MENU_ITEM_CLASS)),
    ],
    [
      h.span(
        [h.Class(className(fst.c8))],
        [
          isChecked
            ? h.span(
                [h.Class(className(fst.icon0))],
                [icon({ name: 'check', size: 'sm' }, h)],
              )
            : h.empty,
        ],
      ),
      ...(iconNode === undefined ? [] : [iconNode]),
      h.span([], [label]),
    ],
  )

const facetedSortIcon = <Msg>(
  model: Model,
  columnKey: string,
  h: HtmlBuilder<Msg>,
): Html => {
  const entry = model.sorting.find(e => e.id === columnKey)
  if (entry === undefined)
    return h.span(
      [h.Class(className(fst.icon1))],
      [icon({ name: 'chevrons-up-down', size: 'sm' }, h)],
    )
  return entry.desc
    ? h.span(
        [h.Class(className(fst.icon2))],
        [icon({ name: 'chevron-down', size: 'sm' }, h)],
      )
    : h.span(
        [h.Class(className(fst.icon3))],
        [icon({ name: 'chevron-up', size: 'sm' }, h)],
      )
}

const facetedSelectHeaderCell = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  config: DataTableConfig<Row>,
  emit: (message: Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const { rows } = pageRows(model, config, props.rows)
  const keys = rows.map(row => props.rowKey(row))
  const selected = new Set(model.selectedRowKeys)
  const allSelected = keys.length > 0 && keys.every(key => selected.has(key))
  const someSelected = keys.some(key => selected.has(key)) && !allSelected
  return h.th(
    [h.DataAttribute('slot', 'table-head'), h.Class(className(fst.c10))],
    [
      h.span(
        [h.Class(className(fst.cbWrap9))],
        [
          checkbox(
            {
              id: 'data-table-select-all',
              isChecked: allSelected,
              isIndeterminate: someSelected,
              onToggle: checked =>
                emit(DataTableStateMessages.ToggledAllRows({ checked, keys })),
            },
            h,
          ),
        ],
      ),
    ],
  )
}

const facetedHeaderCell = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  column: DataTableColumn<Row>,
  emit: (message: Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const isOpen = model.headerMenuKey === column.key
  const close = emit(DataTableStateMessages.SetHeaderMenu({ columnId: '' }))
  const sortable = column.sortable ?? true
  if (!sortable) {
    return h.th(
      [h.DataAttribute('slot', 'table-head'), h.Class(className(fst.c12))],
      [column.header],
    )
  }
  const ascChecked = model.sorting.some(e => e.id === column.key && !e.desc)
  const descChecked = model.sorting.some(e => e.id === column.key && e.desc)
  const hideable = column.isHideable !== false
  return h.th(
    [h.DataAttribute('slot', 'table-head'), h.Class(className(fst.c12))],
    [
      facetedTriggerPanel(
        isOpen,
        h.button(
          [
            h.Type('button'),
            h.AriaHasPopup('menu'),
            h.AriaExpanded(isOpen),
            h.OnClick(
              emit(
                DataTableStateMessages.SetHeaderMenu({ columnId: column.key }),
              ),
            ),
            h.Class(className(reset.button, fst.c13)),
            h.DataAttribute('state', isOpen ? 'open' : 'closed'),
          ],
          [column.header, facetedSortIcon(model, column.key, h)],
        ),
        close,
        h.div(
          [
            h.Role('menu'),
            h.DataAttribute('slot', 'dropdown-menu-content'),
            h.Class(className(FACETED_PANEL_CLASS, fst.c14)),
          ],
          [
            facetedCheckItem(
              'Asc',
              ascChecked,
              emit(
                DataTableStateMessages.ToggledSort({
                  columnId: column.key,
                  desc: false,
                }),
              ),
              h.span(
                [h.Class(className(fst.icon6))],
                [icon({ name: 'chevron-up', size: 'sm' }, h)],
              ),
              h,
            ),
            facetedCheckItem(
              'Desc',
              descChecked,
              emit(
                DataTableStateMessages.ToggledSort({
                  columnId: column.key,
                  desc: true,
                }),
              ),
              h.span(
                [h.Class(className(fst.icon7))],
                [icon({ name: 'chevron-down', size: 'sm' }, h)],
              ),
              h,
            ),
            ...(hideable
              ? [
                  h.div([h.Class(className(FACETED_MENU_SEPARATOR_CLASS))], []),
                  h.button(
                    [
                      h.Type('button'),
                      h.Role('menuitem'),
                      h.OnClick(
                        emit(
                          DataTableStateMessages.ToggledColumnHidden({
                            columnId: column.key,
                          }),
                        ),
                      ),
                      h.Class(
                        className(
                          reset.button,
                          FACETED_MENU_ITEM_CLASS,
                          fst.c15,
                        ),
                      ),
                    ],
                    [
                      h.span(
                        [h.Class(className(fst.icon8))],
                        [icon({ name: 'eye-off', size: 'sm' }, h)],
                      ),
                      'Hide',
                    ],
                  ),
                ]
              : []),
          ],
        ),
        h,
      ),
    ],
  )
}

const facetedRowMenuCell = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  row: Row,
  emit: (message: Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const key = props.rowKey(row)
  const isOpen = model.rowMenuKey === key
  const close = emit(DataTableStateMessages.SetRowMenu({ rowKey: '' }))
  const valueColumn = props.valueMenu
  const valueOpen = model.valueMenuKey === key
  const currentValue = valueColumn?.get?.(row) ?? ''
  return h.div(
    [h.Class(className(fst.c22))],
    [
      facetedTriggerPanel(
        isOpen,
        h.button(
          [
            h.Type('button'),
            h.AriaLabel(`Open actions for ${key}`),
            h.AriaHasPopup('menu'),
            h.AriaExpanded(isOpen),
            h.OnClick(emit(DataTableStateMessages.SetRowMenu({ rowKey: key }))),
            h.Class(className(reset.button, fst.c23)),
            h.DataAttribute('state', isOpen ? 'open' : 'closed'),
          ],
          [
            h.span(
              [h.Class(className(fst.icon10))],
              [icon({ name: 'ellipsis', size: 'sm' }, h)],
            ),
          ],
        ),
        close,
        h.div(
          [
            h.Role('menu'),
            h.DataAttribute('slot', 'dropdown-menu-content'),
            h.Class(className(FACETED_PANEL_CLASS, fst.c24)),
          ],
          [
            h.div([h.Class(className(FACETED_MENU_LABEL_CLASS))], ['Actions']),
            h.div([h.Class(className(FACETED_MENU_SEPARATOR_CLASS))], []),
            h.button(
              [
                h.Type('button'),
                h.Role('menuitem'),
                h.OnClick(
                  emit(
                    DataTableStateMessages.OpenedUpdateSheet({ rowKey: key }),
                  ),
                ),
                h.Class(
                  className(reset.button, FACETED_MENU_ITEM_CLASS, fst.c15),
                ),
              ],
              [
                h.span(
                  [h.Class(className(fst.icon11))],
                  [icon({ name: 'pencil', size: 'sm' }, h)],
                ),
                'Edit',
              ],
            ),
            ...(valueColumn !== undefined && valueColumn.options !== undefined
              ? [
                  h.button(
                    [
                      h.Type('button'),
                      h.Role('menuitem'),
                      h.AriaHasPopup('menu'),
                      h.AriaExpanded(valueOpen),
                      h.OnClick(
                        emit(
                          DataTableStateMessages.SetValueMenu({ rowKey: key }),
                        ),
                      ),
                      h.Class(
                        className(
                          reset.button,
                          FACETED_MENU_ITEM_CLASS,
                          fst.c15,
                        ),
                      ),
                    ],
                    [
                      h.span(
                        [h.Class(className(fst.icon12))],
                        [icon({ name: 'tag', size: 'sm' }, h)],
                      ),
                      valueColumn.header,
                      h.span(
                        [h.Class(className(fst.c26))],
                        [
                          h.span(
                            [h.Class(className(fst.icon13))],
                            [icon({ name: 'chevron-right', size: 'sm' }, h)],
                          ),
                        ],
                      ),
                    ],
                  ),
                  ...(valueOpen
                    ? [
                        h.div(
                          [
                            h.Role('menu'),
                            h.DataAttribute(
                              'slot',
                              'dropdown-menu-sub-content',
                            ),
                            h.Class(
                              className(FACETED_PANEL_CLASS, fst.subPanel),
                            ),
                          ],
                          valueColumn.options.map(option =>
                            h.button(
                              [
                                h.Type('button'),
                                h.Role('menuitemradio'),
                                h.AriaChecked(option.value === currentValue),
                                h.OnClick(
                                  emit(
                                    DataTableStateMessages.AppliedColumnValue({
                                      rowKey: key,
                                      columnId: valueColumn.key,
                                      value: option.value,
                                    }),
                                  ),
                                ),
                                h.Class(
                                  className(
                                    reset.button,
                                    FACETED_MENU_ITEM_CLASS,
                                    fst.c15,
                                  ),
                                ),
                              ],
                              [
                                h.span(
                                  [h.Class(className(fst.c8))],
                                  option.value === currentValue
                                    ? [
                                        Icon.icon(
                                          'circle',
                                          {
                                            class: className(fst.radioDot),
                                          },
                                          h,
                                        ),
                                      ]
                                    : [],
                                ),
                                option.label,
                              ],
                            ),
                          ),
                        ),
                      ]
                    : []),
                ]
              : []),
            h.div([h.Class(className(FACETED_MENU_SEPARATOR_CLASS))], []),
            h.button(
              [
                h.Type('button'),
                h.Role('menuitem'),
                h.DataAttribute('variant', 'destructive'),
                h.OnClick(
                  emit(
                    DataTableStateMessages.OpenedDeleteDialog({ ids: [key] }),
                  ),
                ),
                h.Class(
                  className(reset.button, FACETED_MENU_ITEM_CLASS, fst.c15),
                ),
              ],
              [
                h.span(
                  [h.Class(className(fst.icon14))],
                  [icon({ name: 'trash-2', size: 'sm' }, h)],
                ),
                'Delete',
              ],
            ),
          ],
        ),
        h,
      ),
    ],
  )
}

const facetedOptionFilter = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  config: DataTableConfig<Row>,
  column: DataTableColumn<Row>,
  emit: (message: Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const options = column.options ?? []
  const selected = model.optionFilters[column.key] ?? []
  const panelId = `filter-${column.key}`
  const isOpen = model.openPanel === panelId
  const counts = new Map<string, number>()
  for (const row of filteredRows(
    { ...model, optionFilters: { ...model.optionFilters, [column.key]: [] } },
    config,
    props.rows,
  )) {
    const value = column.get?.(row) ?? ''
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  const selectedBadge = (label: string, compact: boolean): Html =>
    h.span([h.Class(className(compact ? fst.badge2 : fst.badge3))], [label])
  const trigger = h.button(
    [
      h.Type('button'),
      h.AriaHasPopup('menu'),
      h.AriaExpanded(isOpen),
      h.OnClick(emit(DataTableStateMessages.SetPanel({ panel: panelId }))),
      h.Class(
        className(reset.button, fst.c27, selected.length === 0 && fst.c28),
      ),
    ],
    [
      h.span(
        [h.Class(className(fst.icon15))],
        [icon({ name: 'circle-plus', size: 'sm' }, h)],
      ),
      column.header,
      ...(selected.length > 0
        ? [
            h.span([h.Class(className(fst.c29))], []),
            ...(selected.length > 2
              ? [
                  selectedBadge(`${String(selected.length)} selected`, true),
                  ...selected.slice(0, 2).map(value => {
                    const option = options.find(o => o.value === value)
                    return selectedBadge(option?.label ?? value, false)
                  }),
                ]
              : selected.map(value => {
                  const option = options.find(o => o.value === value)
                  return h.span(
                    [h.Class(className(fst.badge4))],
                    [option?.label ?? value],
                  ) as Html
                })),
          ]
        : []),
    ],
  )
  return facetedTriggerPanel(
    isOpen,
    trigger,
    emit(DataTableStateMessages.SetPanel({ panel: 'none' })),
    h.div(
      [
        h.Role('menu'),
        h.DataAttribute('slot', 'popover-content'),
        h.Class(className(FACETED_PANEL_CLASS, fst.c32)),
      ],
      [
        h.div(
          [h.Class(className(fst.c33))],
          [
            ...options.map(option =>
              h.button(
                [
                  h.Type('button'),
                  h.Role('menuitemcheckbox'),
                  h.AriaChecked(selected.includes(option.value)),
                  h.OnClick(
                    emit(
                      DataTableStateMessages.ToggledFilterValue({
                        columnId: column.key,
                        value: option.value,
                      }),
                    ),
                  ),
                  h.Class(
                    className(reset.button, FACETED_MENU_ITEM_CLASS, fst.pl2),
                  ),
                ],
                [
                  ...(option.iconName === undefined
                    ? []
                    : [
                        h.span(
                          [h.Class(className(fst.icon17))],
                          [icon({ name: option.iconName, size: 'sm' }, h)],
                        ),
                      ]),
                  h.span([], [option.label]),
                  h.span(
                    [h.Class(className(fst.c37))],
                    [
                      selected.includes(option.value)
                        ? icon({ name: 'check', size: 'sm' }, h)
                        : String(counts.get(option.value) ?? 0),
                    ],
                  ),
                ],
              ),
            ),
            ...(selected.length > 0
              ? [
                  h.div([h.Class(className(FACETED_MENU_SEPARATOR_CLASS))], []),
                  h.button(
                    [
                      h.Type('button'),
                      h.Role('menuitem'),
                      h.OnClick(
                        emit(DataTableStateMessages.ClearedFilters({})),
                      ),
                      h.Class(
                        className(
                          reset.button,
                          FACETED_MENU_ITEM_CLASS,
                          fst.c38,
                        ),
                      ),
                    ],
                    ['Clear filters'],
                  ),
                ]
              : []),
          ],
        ),
      ],
    ),
    h,
  )
}

const facetedRangeFilter = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  config: DataTableConfig<Row>,
  column: DataTableColumn<Row>,
  emit: (message: Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const panelId = `filter-${column.key}`
  const isOpen = model.openPanel === panelId
  const range = model.rangeFilters[column.key]
  const active = range?.active === true
  const bounds = rangeBounds(config, props.rows, column.key)
  const sliderValues: readonly [number, number] = [
    active && (range?.min ?? 0) > 0 ? range!.min : bounds.min,
    active && (range?.max ?? 0) > 0 ? range!.max : bounds.max,
  ]
  const sliderModel = model.sliders[column.key]
  const trigger = h.button(
    [
      h.Type('button'),
      h.AriaHasPopup('menu'),
      h.AriaExpanded(isOpen),
      h.OnClick(emit(DataTableStateMessages.SetPanel({ panel: panelId }))),
      h.Class(className(reset.button, fst.c39, !active && fst.c28)),
    ],
    [
      h.span(
        [h.Class(className(fst.icon18))],
        [icon({ name: 'circle-plus', size: 'sm' }, h)],
      ),
      column.header,
      ...(active
        ? [
            h.span([h.Class(className(fst.c29))], []),
            h.span(
              [h.Class(className(fst.badge5))],
              [
                (range?.max ?? 0) > 0
                  ? `${String(range?.min ?? 0)}-${String(range?.max ?? 0)}`
                  : `${String(range?.min ?? 0)}+`,
              ],
            ),
          ]
        : []),
    ],
  )
  return facetedTriggerPanel(
    isOpen,
    trigger,
    emit(DataTableStateMessages.SetPanel({ panel: 'none' })),
    h.div(
      [
        h.DataAttribute('slot', 'popover-content'),
        h.Class(className(FACETED_PANEL_CLASS, fst.c41)),
      ],
      [
        h.div(
          [h.Class(className(fst.col3))],
          [
            h.div([h.Class(className(fst.c42))], [column.header]),
            h.div(
              [h.Class(className(fst.c17))],
              [
                h.input([
                  h.Type('number'),
                  h.Placeholder(String(bounds.min)),
                  h.Min(String(bounds.min)),
                  h.Max(String(bounds.max)),
                  h.Class(className(reset.input, fst.c43)),
                  h.Value(String(sliderValues[0])),
                  h.OnInput(value =>
                    emit(
                      DataTableStateMessages.ChangedRangeBound({
                        columnId: column.key,
                        bound: 'min',
                        value,
                      }),
                    ),
                  ),
                ]),
                h.input([
                  h.Type('number'),
                  h.Placeholder(String(bounds.max)),
                  h.Min(String(bounds.min)),
                  h.Max(String(bounds.max)),
                  h.Class(className(reset.input, fst.c43)),
                  h.Value(String(sliderValues[1])),
                  h.OnInput(value =>
                    emit(
                      DataTableStateMessages.ChangedRangeBound({
                        columnId: column.key,
                        bound: 'max',
                        value,
                      }),
                    ),
                  ),
                ]),
              ],
            ),
            ...(sliderModel === undefined
              ? []
              : [
                  Slider.rangeSlider(
                    {
                      model: sliderModel as Parameters<
                        typeof Slider.rangeSlider
                      >[0]['model'],
                      values: sliderValues,
                      toParentMessage: message =>
                        emit(
                          DataTableStateMessages.GotRangeSliderMessage({
                            columnId: column.key,
                            message,
                          }),
                        ),
                      direction: model.direction,
                      ariaLabels: [
                        `Minimum ${column.header}`,
                        `Maximum ${column.header}`,
                      ],
                    },
                    h,
                  ),
                ]),
          ],
        ),
        ...(active
          ? [
              h.div(
                [h.Class(className(fst.footerTop))],
                [
                  h.button(
                    [
                      h.Type('button'),
                      h.OnClick(
                        emit(
                          DataTableStateMessages.ClearedRangeFilter({
                            columnId: column.key,
                          }),
                        ),
                      ),
                      h.Class(className(reset.button, fst.clearBtn)),
                    ],
                    ['Clear'],
                  ),
                ],
              ),
            ]
          : []),
      ],
    ),
    h,
  )
}

const facetedDateFilter = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  column: DataTableColumn<Row>,
  emit: (message: Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const panelId = `filter-${column.key}`
  const isOpen = model.openPanel === panelId
  const range = model.dateFilters[column.key] ?? { from: '', to: '' }
  const hasRange = range.from !== '' || range.to !== ''
  const label =
    range.from !== '' && range.to !== ''
      ? `${range.from.slice(5)} – ${range.to.slice(5)}`
      : range.from !== ''
        ? `After ${range.from.slice(5)}`
        : range.to !== ''
          ? `Before ${range.to.slice(5)}`
          : ''
  const rangeModel = model.dateRanges[column.key] as
    | DateRangeInput.Model
    | undefined
  const displayRange = Option.match(rangeModel?.pendingStart ?? Option.none(), {
    onNone: () => rangeModel?.value ?? Option.none(),
    onSome: start => Option.some({ start, end: start }),
  })
  const trigger = h.button(
    [
      h.Type('button'),
      h.AriaHasPopup('menu'),
      h.AriaExpanded(isOpen),
      h.OnClick(emit(DataTableStateMessages.SetPanel({ panel: panelId }))),
      h.Class(className(reset.button, fst.c39, !hasRange && fst.c28)),
    ],
    [
      h.span(
        [h.Class(className(fst.icon19))],
        [icon({ name: 'circle-plus', size: 'sm' }, h)],
      ),
      column.header,
      ...(hasRange
        ? [
            h.span([h.Class(className(fst.c29))], []),
            h.span([h.Class(className(fst.badge6))], [label]),
          ]
        : []),
    ],
  )
  return facetedTriggerPanel(
    isOpen,
    trigger,
    emit(DataTableStateMessages.SetPanel({ panel: 'none' })),
    h.div(
      [
        h.DataAttribute('slot', 'popover-content'),
        h.Class(className(FACETED_PANEL_CLASS, fst.panelAuto)),
      ],
      [
        ...(rangeModel === undefined
          ? []
          : [
              Calendar.calendar(
                {
                  model: rangeModel.calendar,
                  maybeSelectedDate: Option.none(),
                  toParentMessage: message =>
                    emit(
                      DataTableStateMessages.GotDateRangeMessage({
                        columnId: column.key,
                        message: DateRangeInput.Message.GotCalendarMessage({
                          message,
                        }),
                      }),
                    ),
                  captionLayout: 'dropdown',
                  direction: model.direction,
                  ...(Option.isSome(displayRange)
                    ? { range: displayRange.value }
                    : {}),
                },
                h,
              ),
            ]),
        ...(hasRange
          ? [
              h.div(
                [h.Class(className(fst.footerPad))],
                [
                  h.button(
                    [
                      h.Type('button'),
                      h.OnClick(
                        emit(
                          DataTableStateMessages.ClearedDateFilter({
                            columnId: column.key,
                          }),
                        ),
                      ),
                      h.Class(className(reset.button, fst.clearBtn)),
                    ],
                    ['Clear'],
                  ),
                ],
              ),
            ]
          : []),
      ],
    ),
    h,
  )
}

const facetedViewOptions = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  emit: (message: Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const isOpen = model.openPanel === 'view-options'
  const trigger = h.button(
    [
      h.Type('button'),
      h.AriaLabel('View columns'),
      h.AriaHasPopup('menu'),
      h.AriaExpanded(isOpen),
      h.OnClick(
        emit(DataTableStateMessages.SetPanel({ panel: 'view-options' })),
      ),
      h.Class(className(reset.button, fst.c45)),
    ],
    [
      h.span(
        [h.Class(className(fst.icon20))],
        [icon({ name: 'settings-2', size: 'sm' }, h)],
      ),
      'View',
      h.span(
        [h.Class(className(fst.icon21))],
        [icon({ name: 'chevron-down', size: 'sm' }, h)],
      ),
    ],
  )
  return facetedTriggerPanel(
    isOpen,
    trigger,
    emit(DataTableStateMessages.SetPanel({ panel: 'none' })),
    h.div(
      [
        h.Role('menu'),
        h.DataAttribute('slot', 'dropdown-menu-content'),
        h.Class(className(FACETED_PANEL_CLASS, fst.c46)),
      ],
      [
        h.div(
          [h.Class(className(FACETED_MENU_LABEL_CLASS))],
          ['Toggle columns'],
        ),
        h.div([h.Class(className(FACETED_MENU_SEPARATOR_CLASS))], []),
        ...props.columns
          .filter(column => column.isHideable !== false)
          .map(column =>
            facetedCheckItem(
              column.header,
              !model.hiddenColumnKeys.includes(column.key),
              emit(
                DataTableStateMessages.ToggledColumnHidden({
                  columnId: column.key,
                }),
              ),
              undefined,
              h,
            ),
          ),
      ],
    ),
    h,
  )
}

const facetedSortMenu = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  emit: (message: Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const isOpen = model.openPanel === 'sort-menu'
  const sortable = props.columns.filter(
    column =>
      (column.sortable ?? true) && !model.hiddenColumnKeys.includes(column.key),
  )
  const trigger = h.button(
    [
      h.Type('button'),
      h.AriaLabel('Sort options'),
      h.AriaHasPopup('dialog'),
      h.AriaExpanded(isOpen),
      h.OnClick(emit(DataTableStateMessages.SetPanel({ panel: 'sort-menu' }))),
      h.Class(className(reset.button, fst.c47)),
    ],
    [
      h.span(
        [h.Class(className(fst.icon22))],
        [icon({ name: 'arrow-down-up', size: 'sm' }, h)],
      ),
      'Sort',
      ...(model.sorting.length > 0
        ? [
            h.span(
              [h.Class(className(fst.badge7))],
              [String(model.sorting.length)],
            ) as Html,
          ]
        : []),
    ],
  )
  const unused = sortable.filter(
    column => !model.sorting.some(entry => entry.id === column.key),
  )
  return facetedTriggerPanel(
    isOpen,
    trigger,
    emit(DataTableStateMessages.SetPanel({ panel: 'none' })),
    h.div(
      [
        h.DataAttribute('slot', 'popover-content'),
        h.Class(className(FACETED_PANEL_CLASS, fst.c49)),
      ],
      [
        h.div(
          [h.Class(className(fst.c50))],
          [
            h.h4(
              [h.Class(className(fst.c51))],
              [model.sorting.length > 0 ? 'Sort by' : 'No sorting applied'],
            ),
            h.p(
              [h.Class(className(fst.c52))],
              [
                model.sorting.length > 0
                  ? 'Modify sorting to organize your rows.'
                  : 'Add sorting to organize your rows.',
              ],
            ),
          ],
        ),
        ...(model.sorting.length > 0
          ? [
              h.ul(
                [h.Class(className(fst.c53))],
                model.sorting.map((entry: SortEntry, index: number) => {
                  const column = sortable.find(c => c.key === entry.id)
                  return h.li(
                    [h.Class(className(fst.c54))],
                    [
                      h.span(
                        [h.Class(className(fst.icon23))],
                        [icon({ name: 'grip-vertical', size: 'sm' }, h)],
                      ),
                      h.span(
                        [h.Class(className(fst.c55))],
                        [column?.header ?? entry.id],
                      ),
                      h.div(
                        [h.Class(className(fst.c56))],
                        [
                          h.button(
                            [
                              h.Type('button'),
                              h.AriaPressed(String(!entry.desc)),
                              h.OnClick(
                                emit(
                                  DataTableStateMessages.ChangedSortDirection({
                                    index,
                                    desc: false,
                                  }),
                                ),
                              ),
                              h.Class(
                                className(
                                  reset.button,
                                  fst.c57,
                                  !entry.desc ? fst.c58 : fst.c59,
                                ),
                              ),
                            ],
                            ['Asc'],
                          ),
                          h.button(
                            [
                              h.Type('button'),
                              h.AriaPressed(String(entry.desc)),
                              h.OnClick(
                                emit(
                                  DataTableStateMessages.ChangedSortDirection({
                                    index,
                                    desc: true,
                                  }),
                                ),
                              ),
                              h.Class(
                                className(
                                  reset.button,
                                  fst.c57,
                                  entry.desc ? fst.c58 : fst.c59,
                                ),
                              ),
                            ],
                            ['Desc'],
                          ),
                          h.button(
                            [
                              h.Type('button'),
                              h.AriaLabel(`Remove sort on ${entry.id}`),
                              h.OnClick(
                                emit(
                                  DataTableStateMessages.RemovedSort({ index }),
                                ),
                              ),
                              h.Class(className(reset.button, fst.c60)),
                            ],
                            [
                              h.span(
                                [h.Class(className(fst.icon24))],
                                [icon({ name: 'trash-2', size: 'sm' }, h)],
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  )
                }),
              ),
            ]
          : []),
        h.div(
          [h.Class(className(fst.c61))],
          [
            h.div(
              [h.Class(className(fst.c6))],
              [
                button<Msg>(
                  {
                    variant: 'outline',
                    size: 'sm',
                    buttonAttributes: [h.Class(className(fst.c62))],
                    children: ['Add sort'],
                    isDisabled: unused.length === 0,
                    ...(unused.length === 0
                      ? {}
                      : {
                          onClick: emit(
                            DataTableStateMessages.AddedSort({
                              columnId: unused[0]!.key,
                            }),
                          ),
                        }),
                  },
                  h,
                ),
              ],
            ),
            ...(model.sorting.length > 0
              ? [
                  button(
                    {
                      variant: 'outline',
                      size: 'sm',
                      layoutStyle: fst.c26,
                      children: ['Reset sorting'],
                      onClick: emit(DataTableStateMessages.ResetSorting({})),
                    },
                    h,
                  ) as Html,
                ]
              : []),
          ],
        ),
      ],
    ),
    h,
  )
}

const facetedPagination = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  pageCount: number,
  emit: (message: Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const page = Math.min(model.page, pageCount - 1)
  const selected = model.selectedRowKeys.length
  const pageBtn = (
    label: string,
    iconName: string,
    onClick: Msg,
    isDisabled: boolean,
    largeOnly = false,
  ): Html =>
    h.button(
      [
        h.Type('button'),
        h.AriaLabel(label),
        h.OnClick(onClick),
        ...(isDisabled ? [h.Attribute('disabled', '')] : []),
        h.Class(
          className(reset.button, fst.c85, ...(largeOnly ? [fst.lgOnly] : [])),
        ),
      ],
      [
        h.span(
          [h.Class(className(fst.icon33))],
          [icon({ name: iconName, size: 'sm' }, h)],
        ),
      ],
    )
  return h.div(
    [
      h.DataAttribute('slot', 'data-table-pagination'),
      h.Class(className(fst.c86)),
    ],
    [
      h.div(
        [h.Role('status'), h.Class(className(fst.c87))],
        [`${String(selected)} row${selected === 1 ? '' : 's'} selected.`],
      ),
      h.div(
        [h.Class(className(fst.c88))],
        [
          h.div(
            [h.Class(className(fst.c17))],
            [
              h.p([h.Class(className(fst.c89))], ['Rows per page']),
              Select.select(
                {
                  model: model.pageSizeSelect,
                  maybeSelectedValue: Option.some(String(model.pageSize)),
                  toParentMessage: message =>
                    emit(
                      DataTableStateMessages.GotPageSizeSelectMessage({
                        message,
                      }),
                    ),
                  items: props.pageSizeOptions ?? [10, 20, 30, 40, 50],
                  itemToValue: size => String(size),
                  itemToLabel: size => String(size),
                  size: 'sm',
                  ariaLabel: 'Rows per page',
                  triggerLayoutStyle: facetedTablecnStyles.pageSizeTrigger,
                },
                h,
              ),
            ],
          ),
          h.div(
            [h.Class(className(fst.c91))],
            [`Page ${String(page + 1)} of ${String(pageCount)}`],
          ),
          h.div(
            [h.Class(className(fst.c17))],
            [
              pageBtn(
                'Go to first page',
                'chevrons-left',
                emit(DataTableStateMessages.SetPage({ index: 0 })),
                page === 0,
                true,
              ),
              pageBtn(
                'Go to previous page',
                'chevron-left',
                emit(DataTableStateMessages.SetPage({ index: page - 1 })),
                page === 0,
              ),
              pageBtn(
                'Go to next page',
                'chevron-right',
                emit(DataTableStateMessages.SetPage({ index: page + 1 })),
                page >= pageCount - 1,
              ),
              pageBtn(
                'Go to last page',
                'chevrons-right',
                emit(DataTableStateMessages.SetPage({ index: pageCount - 1 })),
                page >= pageCount - 1,
                true,
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const facetedDeleteDialog = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  emit: (message: Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  if (model.deleteDialogKeys.length === 0) return h.empty
  const count = model.deleteDialogKeys.length
  const noun = props.deleteItemLabel ?? 'row'
  return h.div(
    [],
    [
      h.div([
        h.Class(className(fst.c73)),
        h.OnClick(emit(DataTableStateMessages.ClosedDeleteDialog({}))),
      ]),
      h.div(
        [
          h.Role('alertdialog'),
          h.AriaModal(true),
          h.DataAttribute('slot', 'alert-dialog-content'),
          h.Class(className(fst.c80)),
        ],
        [
          h.div(
            [h.Class(className(fst.c81))],
            [
              h.h2([h.Class(className(fst.c77))], ['Are you absolutely sure?']),
              h.p(
                [h.Class(className(fst.c52))],
                [
                  `This action cannot be undone. This will permanently delete ${count === 1 ? `this ${noun}` : `${String(count)} ${noun}s`} from our servers.`,
                ],
              ),
            ],
          ),
          h.div(
            [h.Class(className(fst.c82))],
            [
              button(
                {
                  variant: 'outline',
                  size: 'sm',
                  children: ['Cancel'],
                  onClick: emit(DataTableStateMessages.ClosedDeleteDialog({})),
                },
                h,
              ),
              button(
                {
                  variant: 'destructive',
                  size: 'sm',
                  children: ['Delete'],
                  onClick: emit(DataTableStateMessages.ConfirmedDelete({})),
                },
                h,
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const facetedDataTable = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const model = props.model
  const emit = props.toParentMessage
  const config = facetedConfig(props)
  const { rows, pageCount } = pageRows(model, config, props.rows)
  const columns = props.columns.filter(
    column => !model.hiddenColumnKeys.includes(column.key),
  )
  const filters = filterCount(model)
  const withRowMenu = props.rowMenu !== false
  const withSelection = props.enableRowSelection !== false
  const facetColumns = props.columns.filter(
    column => column.filterVariant !== undefined,
  )
  return h.div(
    [
      h.DataAttribute('slot', 'data-table'),
      h.Dir(model.direction),
      h.Class(className(fst.c92, props.layoutStyle)),
    ],
    [
      h.div(
        [
          h.DataAttribute('slot', 'data-table-toolbar'),
          h.Class(className(fst.c95)),
        ],
        [
          h.div(
            [h.Class(className(fst.c96))],
            [
              h.input([
                h.Type('text'),
                h.Placeholder(props.searchPlaceholder ?? 'Filter...'),
                h.AriaLabel(props.searchAriaLabel ?? 'Filter rows'),
                h.Value(model.filter),
                h.OnInput(value =>
                  emit(DataTableStateMessages.ChangedFilter({ value })),
                ),
                h.Class(className(reset.input, fst.c97)),
              ]),
              ...facetColumns.map(column =>
                column.filterVariant === 'range'
                  ? facetedRangeFilter(props, config, column, emit, h)
                  : column.filterVariant === 'date'
                    ? facetedDateFilter(props, column, emit, h)
                    : facetedOptionFilter(props, config, column, emit, h),
              ),
              ...(filters > 0
                ? [
                    button(
                      {
                        variant: 'outline',
                        size: 'sm',
                        buttonAttributes: [h.Class(className(fst.c28))],
                        children: [
                          h.span(
                            [h.Class(className(fst.icon34))],
                            [icon({ name: 'x', size: 'sm' }, h)],
                          ),
                          'Reset',
                        ],
                        onClick: emit(
                          DataTableStateMessages.ClearedFilters({}),
                        ),
                      },
                      h,
                    ) as Html,
                  ]
                : []),
            ],
          ),
          h.div(
            [h.Class(className(fst.c17))],
            [
              facetedSortMenu(props, emit, h),
              facetedViewOptions(props, emit, h),
              ...(props.toolbarContent ?? []),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class(className(fst.c98))],
        [
          h.table(
            [
              h.Role('table'),
              h.AriaLabel(props.ariaLabel ?? 'Data table'),
              h.Class(className(fst.c99)),
              h.Style({ minWidth: '100%' }),
            ],
            [
              h.thead(
                [h.Class(className(fst.c100))],
                [
                  h.tr(
                    [h.Class(className(fst.c101))],
                    [
                      ...(withSelection
                        ? [facetedSelectHeaderCell(props, config, emit, h)]
                        : []),
                      ...columns.map(column =>
                        facetedHeaderCell(props, column, emit, h),
                      ),
                      ...(withRowMenu
                        ? [
                            h.th(
                              [
                                h.DataAttribute('slot', 'table-head'),
                                h.Class(className(fst.c10)),
                              ],
                              [''],
                            ),
                          ]
                        : []),
                    ],
                  ),
                ],
              ),
              h.tbody(
                [h.Class(className(fst.c102))],
                rows.map(row => {
                  const key = props.rowKey(row)
                  return h.tr(
                    [
                      h.Key(key),
                      h.DataAttribute(
                        'state',
                        model.selectedRowKeys.includes(key)
                          ? 'selected'
                          : 'unselected',
                      ),
                      h.Class(
                        className(
                          fst.c103,
                          model.selectedRowKeys.includes(key) && fst.rowSel,
                        ),
                      ),
                    ],
                    [
                      ...(withSelection
                        ? [
                            h.td(
                              [h.Class(className(fst.c104))],
                              [
                                h.span(
                                  [h.Class(className(fst.cbWrap8))],
                                  [
                                    checkbox(
                                      {
                                        id: `data-table-select-${key}`,
                                        isChecked:
                                          model.selectedRowKeys.includes(key),
                                        onToggle: () =>
                                          emit(
                                            DataTableStateMessages.ToggledRowSelected(
                                              { id: key, keys: [] },
                                            ),
                                          ),
                                      },
                                      h,
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ]
                        : []),
                      ...columns.map(column =>
                        h.td(
                          [h.Class(className(fst.c104, column.layoutStyle))],
                          [column.cell(row)],
                        ),
                      ),
                      ...(withRowMenu
                        ? [
                            h.td(
                              [h.Class(className(fst.c104))],
                              [facetedRowMenuCell(props, row, emit, h)],
                            ),
                          ]
                        : []),
                    ],
                  )
                }),
              ),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class(className(fst.c106))],
        [
          facetedPagination(props, pageCount, emit, h),
          ...(props.actionBar ?? []),
        ],
      ),
      facetedDeleteDialog(props, emit, h),
    ],
  )
}
