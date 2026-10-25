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
  sortedRows,
  filteredRows,
  visibleSelectedCount,
} from '@/lib/data-table-state'
import type { DataTableConfig, SortEntry } from '@/lib/data-table-state'
import { projectDataTable, type DataTableMode } from '@/lib/data-table-adapter'
import * as Icon from '@/lib/icon'
import { cn } from '@/lib/utils'
import { button, buttonVariants } from '@/ui/button'
import { checkbox } from '@/ui/checkbox'
import * as Calendar from '@/ui/calendar'
import * as DateRangeInput from '@/lib/date-range-input'
import * as Select from '@/ui/select'
import * as Slider from '@/ui/slider'
import { input } from '@/ui/input'
import * as Pagination from '@/ui/pagination'
import * as Table from '@/ui/table'

export * from '@/lib/data-table-state'

export type DataTableColumn<Row> = Readonly<{
  key: string
  header: string
  cell: (row: Row) => Html | string
  sortValue?: (row: Row) => string | number
  isHideable?: boolean
  align?: 'left' | 'center' | 'right'
  class?: string
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
  class?: string
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
  /** Faceted variant: noun used in the delete dialog ("this task" / "N tasks"). */
  deleteItemLabel?: string
  /** Faceted variant: page-size options for the footer select. */
  directionLabel?: string
}>

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
            h.Class(
              'inline-flex size-10 items-center justify-center bg-transparent disabled:opacity-50',
            ),
          ],
          [
            h.span(
              [
                h.Class(
                  cn(
                    'inline-flex size-4 items-center justify-center rounded-[4px] border border-input bg-background text-primary-foreground',
                    (props.isChecked || props.isIndeterminate === true) &&
                      'border-primary bg-primary',
                  ),
                ),
              ],
              props.isChecked || props.isIndeterminate === true
                ? [Icon.check<Msg>({ class: 'size-3' }, h)]
                : [],
            ),
          ],
        ),
    },
    h,
  )

const columnAlignClass = (align: DataTableColumn<unknown>['align']) =>
  align === undefined ? undefined : `text-${align}`

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
      h.Class(cn('w-full space-y-4', props.class)),
    ],
    [
      h.div(
        [
          h.DataAttribute('slot', 'data-table-toolbar'),
          h.Class('flex flex-wrap items-center justify-between gap-3'),
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
                    class: 'h-10 max-w-sm px-3 text-sm',
                  },
                  h,
                ),
              ]),
          ...(props.toolbarContent ?? []),
          ...(props.enableColumnVisibility === true
            ? [
                h.div(
                  [
                    h.Class('relative ml-auto'),
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
                          cn(
                            buttonVariants({ variant: 'outline' }),
                            'h-10 gap-2 px-3 font-medium hover:bg-muted/50',
                          ),
                        ),
                      ],
                      [
                        'Columns',
                        Icon.chevronDown<Msg>({ class: 'size-3.5' }, h),
                      ],
                    ),
                    ...(props.model.columnsMenuOpen
                      ? [
                          h.button(
                            [
                              h.Type('button'),
                              h.Tabindex(-1),
                              h.AriaHidden(true),
                              h.Class('fixed inset-0 z-10 cursor-default'),
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
                              h.Class(
                                'absolute right-0 top-[calc(100%+0.375rem)] z-20 min-w-48 rounded-md border bg-card p-1.5 shadow-md',
                              ),
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
                                  [
                                    h.Class(
                                      'flex min-h-10 items-center gap-1 text-sm',
                                    ),
                                  ],
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
        [h.Class('overflow-hidden rounded-md border')],
        [
          Table.table(
            {
              ariaLabel: props.ariaLabel,
              class: 'w-full',
              children: [
                Table.tableHeader(
                  {
                    children: [
                      Table.tableRow(
                        {
                          children: [
                            ...(props.enableRowSelection === true
                              ? [
                                  h.th(
                                    [
                                      h.Scope('col'),
                                      h.Class('w-12 p-0 text-center'),
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
                                          isDisabled:
                                            selectableKeys.length === 0,
                                          onToggle: isSelected =>
                                            props.toParentMessage(
                                              DataTableStateMessages.ToggledRows(
                                                {
                                                  keys: selectableKeys,
                                                  isSelected,
                                                },
                                              ),
                                            ),
                                        },
                                        h,
                                      ),
                                    ],
                                  ),
                                ]
                              : []),
                            ...visibleColumns.map(column =>
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
                                    cn(
                                      'h-10 px-2 text-start align-middle font-medium text-foreground',
                                      columnAlignClass(column.align),
                                      column.class,
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
                                              DataTableStateMessages.Sorted({
                                                key: column.key,
                                              }),
                                            ),
                                          ),
                                          h.Class(
                                            'inline-flex items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                          ),
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
                                              h.Class(
                                                'size-3.5 shrink-0 text-muted-foreground',
                                              ),
                                            ],
                                            [
                                              h.path(
                                                [
                                                  h.D('m7 15 5 5 5-5'),
                                                  h.Class(
                                                    cn(
                                                      props.model.sortKey ===
                                                        column.key &&
                                                        props.model
                                                          .sortDirection ===
                                                          'descending' &&
                                                        'text-primary',
                                                    ),
                                                  ),
                                                ],
                                                [],
                                              ),
                                              h.path(
                                                [
                                                  h.D('m7 9 5-5 5 5'),
                                                  h.Class(
                                                    cn(
                                                      props.model.sortKey ===
                                                        column.key &&
                                                        props.model
                                                          .sortDirection ===
                                                          'ascending' &&
                                                        'text-primary',
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
                            ),
                          ],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                Table.tableBody(
                  {
                    children:
                      visible.length === 0
                        ? [
                            h.tr(
                              [],
                              [
                                h.td(
                                  [
                                    h.Colspan(columnCount),
                                    h.Class(
                                      'h-24 text-center text-muted-foreground',
                                    ),
                                  ],
                                  [props.emptyText ?? 'No results.'],
                                ),
                              ],
                            ),
                          ]
                        : visible.map(row => {
                            const key = props.rowKey(row)
                            const isSelected = selectedKeys.has(key)
                            const isSelectable =
                              props.isRowSelectable?.(row) ?? true
                            return h.tr(
                              [
                                h.Key(key),
                                ...(isSelected
                                  ? [h.DataAttribute('selected', '')]
                                  : []),
                                h.Class(
                                  cn(
                                    'border-b transition-colors hover:bg-muted/50',
                                    isSelected && 'bg-muted/50',
                                  ),
                                ),
                              ],
                              [
                                ...(props.enableRowSelection === true
                                  ? [
                                      h.td(
                                        [h.Class('w-12 p-0 text-center')],
                                        [
                                          selectionControl(
                                            {
                                              id: `${instanceId}-row-${key}`,
                                              label:
                                                props.rowSelectionLabel?.(
                                                  row,
                                                ) ?? `Select row ${key}`,
                                              isChecked: isSelected,
                                              isDisabled: !isSelectable,
                                              onToggle: nextSelected =>
                                                props.toParentMessage(
                                                  DataTableStateMessages.ToggledRow(
                                                    {
                                                      key,
                                                      isSelected: nextSelected,
                                                    },
                                                  ),
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
                                        cn(
                                          'whitespace-nowrap p-3 align-middle',
                                          columnAlignClass(column.align),
                                          column.class,
                                        ),
                                      ),
                                    ],
                                    [column.cell(row)],
                                  ),
                                ),
                              ],
                            )
                          }),
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      ),
      h.div(
        [h.Class('flex flex-wrap items-center justify-between gap-4')],
        [
          h.p(
            [h.Class('text-sm text-muted-foreground')],
            [
              props.enableRowSelection === true
                ? `${selectedCount} of ${filteredRowCount} row${filteredRowCount === 1 ? '' : 's'} selected.`
                : `${filteredRowCount} row${filteredRowCount === 1 ? '' : 's'}`,
            ],
          ),
          h.div(
            [h.Class('flex flex-wrap items-center gap-2')],
            [
              h.label(
                [
                  h.For(`${instanceId}-page-size`),
                  h.Class('text-sm text-muted-foreground'),
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
                  h.Class('h-10 rounded-md border bg-background px-2 text-sm'),
                ],
                pageSizes.map(size =>
                  h.option([h.Value(String(size))], [String(size)]),
                ),
              ),
              h.span(
                [h.Class('whitespace-nowrap text-sm font-medium tabular-nums')],
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

const FACETED_PANEL_CLASS =
  'bg-popover text-popover-foreground absolute top-full z-50 mt-1 w-48 rounded-md border p-1 shadow-md outline-none crease-action-bar-in'

const FACETED_MENU_ITEM_CLASS =
  'focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none hover:bg-accent hover:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground'

const FACETED_MENU_LABEL_CLASS =
  'text-muted-foreground px-2 py-1.5 text-xs font-medium'

const FACETED_MENU_SEPARATOR_CLASS = 'bg-border -mx-1 my-1 h-px'

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

const TRIGGER_PANEL = <Msg>(
  isOpen: boolean,
  trigger: Html,
  onClose: Msg,
  panel: Html,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class('relative')],
    [
      trigger,
      ...(isOpen
        ? [
            h.button([
              h.Type('button'),
              h.AriaHidden(true),
              h.Tabindex(-1),
              h.Class('fixed inset-0 z-40 cursor-default bg-transparent'),
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
      h.Class(FACETED_MENU_ITEM_CLASS),
    ],
    [
      h.span(
        [
          h.Class(
            'absolute left-2 flex h-3.5 w-3.5 items-center justify-center',
          ),
        ],
        [isChecked ? Icon.icon('check', { class: 'size-4' }, h) : h.empty],
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
  if (entry === undefined) return Icon.icon('chevrons-up-down', {}, h)
  return entry.desc
    ? Icon.icon('chevron-down', {}, h)
    : Icon.icon('chevron-up', {}, h)
}

const facetedHeaderCell = <Row, Msg>(
  props: DataTableProps<Row, Msg>,
  config: DataTableConfig<Row>,
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
      [
        h.DataAttribute('slot', 'table-head'),
        h.Class(
          'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap',
        ),
      ],
      [column.header],
    )
  }
  const ascChecked = model.sorting.some(e => e.id === column.key && !e.desc)
  const descChecked = model.sorting.some(e => e.id === column.key && e.desc)
  const hideable = column.isHideable !== false
  return h.th(
    [
      h.DataAttribute('slot', 'table-head'),
      h.Class(
        'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap',
      ),
    ],
    [
      TRIGGER_PANEL(
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
            h.Class(
              '-ms-1.5 flex h-8 w-auto cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-left font-medium hover:bg-accent focus:ring-1 focus:ring-ring data-[state=open]:bg-accent rtl:flex-row-reverse [&_svg]:size-4 [&_svg]:text-muted-foreground',
            ),
            h.DataAttribute('state', isOpen ? 'open' : 'closed'),
          ],
          [column.header, facetedSortIcon(model, column.key, h)],
        ),
        close,
        h.div(
          [
            h.Role('menu'),
            h.DataAttribute('slot', 'dropdown-menu-content'),
            h.Class(cn(FACETED_PANEL_CLASS, 'start-0 w-28')),
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
              Icon.icon('chevron-up', {}, h),
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
              Icon.icon('chevron-down', {}, h),
              h,
            ),
            ...(hideable
              ? [
                  h.div([h.Class(FACETED_MENU_SEPARATOR_CLASS)], []),
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
                      h.Class(cn(FACETED_MENU_ITEM_CLASS, 'pl-8')),
                    ],
                    [Icon.icon('eye-off', {}, h), 'Hide'],
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
    [
      h.DataAttribute('slot', 'table-head'),
      h.Class(
        'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap w-10',
      ),
    ],
    [
      h.span(
        [h.Class('inline-flex translate-y-0.5')],
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
    [h.Class('flex justify-end')],
    [
      TRIGGER_PANEL(
        isOpen,
        h.button(
          [
            h.Type('button'),
            h.AriaLabel(`Open actions for ${key}`),
            h.AriaHasPopup('menu'),
            h.AriaExpanded(isOpen),
            h.OnClick(emit(DataTableStateMessages.SetRowMenu({ rowKey: key }))),
            h.Class(
              'inline-flex size-8 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-muted [&_svg]:size-4',
            ),
            h.DataAttribute('state', isOpen ? 'open' : 'closed'),
          ],
          [Icon.icon('ellipsis', {}, h)],
        ),
        close,
        h.div(
          [
            h.Role('menu'),
            h.DataAttribute('slot', 'dropdown-menu-content'),
            h.Class(cn(FACETED_PANEL_CLASS, 'end-0 w-40')),
          ],
          [
            h.div([h.Class(FACETED_MENU_LABEL_CLASS)], ['Actions']),
            h.div([h.Class(FACETED_MENU_SEPARATOR_CLASS)], []),
            h.button(
              [
                h.Type('button'),
                h.Role('menuitem'),
                h.OnClick(
                  emit(
                    DataTableStateMessages.OpenedUpdateSheet({ rowKey: key }),
                  ),
                ),
                h.Class(cn(FACETED_MENU_ITEM_CLASS, 'pl-8')),
              ],
              [Icon.icon('pencil', {}, h), 'Edit'],
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
                      h.Class(cn(FACETED_MENU_ITEM_CLASS, 'pl-8')),
                    ],
                    [
                      Icon.icon('tag', {}, h),
                      valueColumn.header,
                      h.span(
                        [h.Class('ml-auto')],
                        [Icon.icon('chevron-right', {}, h)],
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
                              'bg-popover text-popover-foreground absolute end-full top-0 z-50 me-1 w-40 rounded-md border p-1 shadow-md outline-none crease-action-bar-in',
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
                                h.Class(FACETED_MENU_ITEM_CLASS),
                              ],
                              [
                                h.span(
                                  [
                                    h.Class(
                                      'absolute start-2 flex size-3.5 items-center justify-center',
                                    ),
                                  ],
                                  option.value === currentValue
                                    ? [
                                        Icon.icon(
                                          'circle',
                                          { class: 'size-2 fill-current' },
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
            h.div([h.Class(FACETED_MENU_SEPARATOR_CLASS)], []),
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
                h.Class(cn(FACETED_MENU_ITEM_CLASS, 'pl-8')),
              ],
              [Icon.icon('trash-2', {}, h), 'Delete'],
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
  const trigger = h.button(
    [
      h.Type('button'),
      h.AriaHasPopup('menu'),
      h.AriaExpanded(isOpen),
      h.OnClick(emit(DataTableStateMessages.SetPanel({ panel: panelId }))),
      h.Class(
        cn(
          'border-input inline-flex h-8 items-center justify-center gap-1.5 rounded-md border bg-transparent px-2.5 text-sm font-medium whitespace-nowrap shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4 [&_svg]:shrink-0',
          selected.length === 0 && 'border-dashed',
        ),
      ),
    ],
    [
      Icon.icon('circle-plus', {}, h),
      column.header,
      ...(selected.length > 0
        ? [
            h.span([h.Class('bg-border mx-1 h-4 w-px')], []),
            ...(selected.length > 2
              ? [
                  h.span(
                    [
                      h.Class(
                        'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-all border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-sm px-1 font-normal lg:hidden',
                      ),
                    ],
                    [`${String(selected.length)} selected`],
                  ),
                  ...selected.slice(0, 2).map(value => {
                    const option = options.find(o => o.value === value)
                    return h.span(
                      [
                        h.Class(
                          'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-all border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-sm px-1 font-normal capitalize',
                        ),
                      ],
                      [option?.label ?? value],
                    ) as Html
                  }),
                ]
              : selected.map(value => {
                  const option = options.find(o => o.value === value)
                  return h.span(
                    [
                      h.Class(
                        'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-all border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-sm px-1 font-normal capitalize',
                      ),
                    ],
                    [option?.label ?? value],
                  ) as Html
                })),
          ]
        : []),
    ],
  )
  return TRIGGER_PANEL(
    isOpen,
    trigger,
    emit(DataTableStateMessages.SetPanel({ panel: 'none' })),
    h.div(
      [
        h.Role('menu'),
        h.DataAttribute('slot', 'popover-content'),
        h.Class(cn(FACETED_PANEL_CLASS, 'start-0 w-50 p-0')),
      ],
      [
        h.div(
          [h.Class('max-h-72 overflow-y-auto p-1')],
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
                  h.Class(cn(FACETED_MENU_ITEM_CLASS, 'pl-2')),
                ],
                [
                  ...(option.iconName === undefined
                    ? []
                    : [Icon.icon(option.iconName, {}, h)]),
                  h.span([], [option.label]),
                  h.span(
                    [
                      h.Class(
                        'ml-auto flex items-center justify-center font-mono text-xs text-muted-foreground',
                      ),
                    ],
                    [
                      selected.includes(option.value)
                        ? Icon.icon('check', { class: 'size-4' }, h)
                        : String(counts.get(option.value) ?? 0),
                    ],
                  ),
                ],
              ),
            ),
            ...(selected.length > 0
              ? [
                  h.div([h.Class(FACETED_MENU_SEPARATOR_CLASS)], []),
                  h.button(
                    [
                      h.Type('button'),
                      h.Role('menuitem'),
                      h.OnClick(
                        emit(DataTableStateMessages.ClearedFilters({})),
                      ),
                      h.Class(
                        cn(
                          FACETED_MENU_ITEM_CLASS,
                          'justify-center pl-8 text-center',
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
      h.Class(
        cn(
          'border-input inline-flex h-8 items-center justify-center gap-1.5 rounded-md border bg-transparent px-2.5 text-sm font-medium whitespace-nowrap shadow-xs transition-colors hover:bg-accent [&_svg]:size-4',
          !active && 'border-dashed',
        ),
      ),
    ],
    [
      Icon.icon('circle-plus', {}, h),
      column.header,
      ...(active
        ? [
            h.span([h.Class('bg-border mx-1 h-4 w-px')], []),
            h.span(
              [
                h.Class(
                  'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-all border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-sm px-1 font-normal',
                ),
              ],
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
  return TRIGGER_PANEL(
    isOpen,
    trigger,
    emit(DataTableStateMessages.SetPanel({ panel: 'none' })),
    h.div(
      [
        h.DataAttribute('slot', 'popover-content'),
        h.Class(cn(FACETED_PANEL_CLASS, 'start-0 w-56 p-3')),
      ],
      [
        h.div(
          [h.Class('flex flex-col gap-3')],
          [
            h.div([h.Class('text-sm font-medium')], [column.header]),
            h.div(
              [h.Class('flex items-center gap-2')],
              [
                h.input([
                  h.Type('number'),
                  h.Placeholder(String(bounds.min)),
                  h.Min(String(bounds.min)),
                  h.Max(String(bounds.max)),
                  h.Class(
                    'border-input h-8 w-full rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  ),
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
                  h.Class(
                    'border-input h-8 w-full rounded-md border bg-transparent px-2 text-sm shadow-xs outline-none focus-visible:ring-1 focus-visible:ring-ring',
                  ),
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
                      model: sliderModel as (typeof model.sliders)[string] &
                        Parameters<typeof Slider.rangeSlider>[0]['model'],
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
                [h.Class('border-t mt-3 border-border pt-3')],
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
                      h.Class(
                        'border-input inline-flex h-8 w-full items-center justify-center rounded-md border bg-transparent px-2.5 text-sm font-medium shadow-xs transition-colors hover:bg-accent',
                      ),
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
      h.Class(
        cn(
          'border-input inline-flex h-8 items-center justify-center gap-1.5 rounded-md border bg-transparent px-2.5 text-sm font-medium whitespace-nowrap shadow-xs transition-colors hover:bg-accent [&_svg]:size-4',
          !hasRange && 'border-dashed',
        ),
      ),
    ],
    [
      Icon.icon('circle-plus', {}, h),
      column.header,
      ...(hasRange
        ? [
            h.span([h.Class('bg-border mx-1 h-4 w-px')], []),
            h.span(
              [
                h.Class(
                  'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-all border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-sm px-1 font-normal',
                ),
              ],
              [label],
            ),
          ]
        : []),
    ],
  )
  return TRIGGER_PANEL(
    isOpen,
    trigger,
    emit(DataTableStateMessages.SetPanel({ panel: 'none' })),
    h.div(
      [
        h.DataAttribute('slot', 'popover-content'),
        h.Class(cn(FACETED_PANEL_CLASS, 'start-0 w-auto p-0')),
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
                [h.Class('border-t border-border p-3')],
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
                      h.Class(
                        'border-input inline-flex h-8 w-full items-center justify-center rounded-md border bg-transparent px-2.5 text-sm font-medium shadow-xs transition-colors hover:bg-accent',
                      ),
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
      h.Class(
        'border-input ml-auto hidden h-8 items-center gap-1.5 rounded-md border bg-transparent px-2.5 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground lg:flex [&_svg]:size-4',
      ),
    ],
    [Icon.icon('settings-2', {}, h), 'View', Icon.icon('chevron-down', {}, h)],
  )
  return TRIGGER_PANEL(
    isOpen,
    trigger,
    emit(DataTableStateMessages.SetPanel({ panel: 'none' })),
    h.div(
      [
        h.Role('menu'),
        h.DataAttribute('slot', 'dropdown-menu-content'),
        h.Class(cn(FACETED_PANEL_CLASS, 'end-0 w-44')),
      ],
      [
        h.div([h.Class(FACETED_MENU_LABEL_CLASS)], ['Toggle columns']),
        h.div([h.Class(FACETED_MENU_SEPARATOR_CLASS)], []),
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
      h.Class(
        'border-input inline-flex h-8 items-center gap-1.5 rounded-md border bg-transparent px-2.5 text-sm font-medium shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground [&_svg]:size-4',
      ),
    ],
    [
      Icon.icon('arrow-down-up', { class: 'size-4 text-muted-foreground' }, h),
      'Sort',
      ...(model.sorting.length > 0
        ? [
            h.span(
              [
                h.Class(
                  'inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium transition-all border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full px-1.5 font-mono',
                ),
              ],
              [String(model.sorting.length)],
            ) as Html,
          ]
        : []),
    ],
  )
  const unused = sortable.filter(
    column => !model.sorting.some(entry => entry.id === column.key),
  )
  return TRIGGER_PANEL(
    isOpen,
    trigger,
    emit(DataTableStateMessages.SetPanel({ panel: 'none' })),
    h.div(
      [
        h.DataAttribute('slot', 'popover-content'),
        h.Class(
          cn(FACETED_PANEL_CLASS, 'end-0 w-auto min-w-95 flex-col gap-3.5 p-4'),
        ),
      ],
      [
        h.div(
          [h.Class('flex flex-col gap-1')],
          [
            h.h4(
              [h.Class('font-medium leading-none')],
              [model.sorting.length > 0 ? 'Sort by' : 'No sorting applied'],
            ),
            h.p(
              [h.Class('text-muted-foreground text-sm')],
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
                [h.Class('flex max-h-75 flex-col gap-2 overflow-y-auto p-1')],
                model.sorting.map((entry: SortEntry, index: number) => {
                  const column = sortable.find(c => c.key === entry.id)
                  return h.li(
                    [h.Class('flex w-full items-center gap-2 rounded-md p-1')],
                    [
                      Icon.icon(
                        'grip-vertical',
                        { class: 'size-4 text-muted-foreground' },
                        h,
                      ),
                      h.span(
                        [h.Class('w-44 text-sm font-medium')],
                        [column?.header ?? entry.id],
                      ),
                      h.div(
                        [h.Class('ml-auto flex items-center gap-1')],
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
                                cn(
                                  'h-7 rounded-sm px-2 text-xs',
                                  !entry.desc
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground hover:bg-accent',
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
                                cn(
                                  'h-7 rounded-sm px-2 text-xs',
                                  entry.desc
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-muted-foreground hover:bg-accent',
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
                              h.Class(
                                'inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive [&_svg]:size-4',
                              ),
                            ],
                            [Icon.icon('trash-2', {}, h)],
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
          [h.Class('flex w-full items-center gap-2')],
          [
            h.div(
              [h.Class('relative')],
              [
                button<Msg>(
                  {
                    variant: 'outline',
                    size: 'sm',

                    class: 'gap-1.5',
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
                      class: 'ml-auto',
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
    extra?: string,
  ): Html =>
    h.button(
      [
        h.Type('button'),
        h.AriaLabel(label),
        h.OnClick(onClick),
        ...(isDisabled ? [h.Attribute('disabled', '')] : []),
        h.Class(
          cn(
            'border-input inline-flex size-8 items-center justify-center rounded-md border bg-transparent shadow-xs transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:rtl:rotate-180',
            extra ?? '',
          ),
        ),
      ],
      [Icon.icon(iconName, {}, h)],
    )
  return h.div(
    [
      h.DataAttribute('slot', 'data-table-pagination'),
      h.Class(
        'flex w-full flex-col-reverse items-center justify-between gap-4 overflow-auto p-1 sm:flex-row sm:gap-8',
      ),
    ],
    [
      h.div(
        [
          h.Role('status'),
          h.Class('text-muted-foreground flex-1 text-sm whitespace-nowrap'),
        ],
        [`${String(selected)} row${selected === 1 ? '' : 's'} selected.`],
      ),
      h.div(
        [
          h.Class(
            'flex flex-col-reverse items-center gap-4 sm:flex-row sm:gap-6 lg:gap-8',
          ),
        ],
        [
          h.div(
            [h.Class('flex items-center gap-2')],
            [
              h.p(
                [h.Class('text-sm font-medium whitespace-nowrap')],
                ['Rows per page'],
              ),
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
                  triggerClass: 'h-8 w-18',
                },
                h,
              ),
            ],
          ),
          h.div(
            [
              h.Class(
                'flex items-center justify-center text-sm font-medium whitespace-nowrap',
              ),
            ],
            [`Page ${String(page + 1)} of ${String(pageCount)}`],
          ),
          h.div(
            [h.Class('flex items-center gap-2')],
            [
              pageBtn(
                'Go to first page',
                'chevrons-left',
                emit(DataTableStateMessages.SetPage({ index: 0 })),
                page === 0,
                'hidden lg:flex',
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
                'hidden lg:flex',
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
        h.Class('fixed inset-0 z-50 bg-black/50'),
        h.OnClick(emit(DataTableStateMessages.ClosedDeleteDialog({}))),
      ]),
      h.div(
        [
          h.Role('alertdialog'),
          h.AriaModal(true),
          h.DataAttribute('slot', 'alert-dialog-content'),
          h.Class(
            'bg-background fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border p-6 shadow-lg sm:max-w-lg',
          ),
        ],
        [
          h.div(
            [h.Class('flex flex-col gap-2 text-center sm:text-left')],
            [
              h.h2(
                [h.Class('text-lg font-semibold')],
                ['Are you absolutely sure?'],
              ),
              h.p(
                [h.Class('text-muted-foreground text-sm')],
                [
                  `This action cannot be undone. This will permanently delete ${count === 1 ? `this ${noun}` : `${String(count)} ${noun}s`} from our servers.`,
                ],
              ),
            ],
          ),
          h.div(
            [h.Class('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end')],
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
  const { rows, filtered, pageCount } = pageRows(model, config, props.rows)
  void filtered
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
      h.Class(cn('flex h-full w-full flex-col gap-2.5 p-1', props.class)),
    ],
    [
      h.div(
        [
          h.DataAttribute('slot', 'data-table-toolbar'),
          h.Class('flex w-full items-start justify-between gap-2 p-1'),
        ],
        [
          h.div(
            [h.Class('flex flex-1 flex-wrap items-center gap-2')],
            [
              h.input([
                h.Type('text'),
                h.Placeholder(props.searchPlaceholder ?? 'Filter...'),
                h.AriaLabel(props.searchAriaLabel ?? 'Filter rows'),
                h.Value(model.filter),
                h.OnInput(value =>
                  emit(DataTableStateMessages.ChangedFilter({ value })),
                ),
                h.Class(
                  'border-input placeholder:text-muted-foreground flex h-8 w-40 rounded-md border bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring lg:w-56',
                ),
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

                        class: 'border-dashed',
                        children: [
                          Icon.icon('x', { class: 'size-4' }, h),
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
            [h.Class('flex items-center gap-2')],
            [
              facetedSortMenu(props, emit, h),
              facetedViewOptions(props, emit, h),
              ...(props.toolbarContent ?? []),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('isolate min-h-0 flex-1 overflow-auto rounded-md border')],
        [
          h.table(
            [
              h.Role('table'),
              h.AriaLabel(props.ariaLabel ?? 'Data table'),
              h.Class('w-full table-fixed caption-bottom text-sm'),
              h.Style({ minWidth: '100%' }),
            ],
            [
              h.thead(
                [h.Class('[&_tr]:border-b')],
                [
                  h.tr(
                    [h.Class('border-b transition-colors')],
                    [
                      ...(withSelection
                        ? [facetedSelectHeaderCell(props, config, emit, h)]
                        : []),
                      ...columns.map(column =>
                        facetedHeaderCell(props, config, column, emit, h),
                      ),
                      ...(withRowMenu
                        ? [
                            h.th(
                              [
                                h.DataAttribute('slot', 'table-head'),
                                h.Class(
                                  'text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap w-10',
                                ),
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
                [h.Class('[&_tr:last-child]:border-0')],
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
                        'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
                      ),
                    ],
                    [
                      ...(withSelection
                        ? [
                            h.td(
                              [h.Class('p-2 align-middle')],
                              [
                                h.span(
                                  [h.Class('inline-flex translate-y-0.5')],
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
                          [h.Class(cn('p-2 align-middle', column.class ?? ''))],
                          [column.cell(row)],
                        ),
                      ),
                      ...(withRowMenu
                        ? [
                            h.td(
                              [h.Class('p-2 align-middle')],
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
        [h.Class('flex flex-col gap-2.5')],
        [
          facetedPagination(props, pageCount, emit, h),
          ...(props.actionBar ?? []),
        ],
      ),
      facetedDeleteDialog(props, emit, h),
    ],
  )
}
