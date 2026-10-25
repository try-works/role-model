import { reset } from '@/stylex/reset'
import type { ColumnDef, Table } from '@tanstack/table-core'
import {
  createTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/table-core'
import { Option, Stream } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Subscription from 'foldkit/subscription'

import * as State from '@/lib/tanstack-table-state'
import * as Icon from '@/lib/icon'
import { button } from '../button'
import { className } from '../style'
import { styles } from './data-table.stylex'

export * from '@/lib/tanstack-table-state'

export type TanStackDataTableColumn<Data, Message> = Readonly<{
  id: string
  header: string
  value: (row: Data) => string | number
  cell?: (row: Data, h: HtmlBuilder<Message>) => Html | string
  aggregate?: (value: unknown) => string
  canGroup?: boolean
  canHide?: boolean
  canSort?: boolean
  size?: number
  minSize?: number
  defaultSize?: number
  headerTooltip?: string
  sticky?: boolean
  filterValue?: (row: Data) => unknown
  filterable?: boolean
  filter?: Readonly<{
    type: State.ColumnFilterKind
    options?: ReadonlyArray<
      Readonly<{ value: string; label: string; count?: number; color?: string }>
    >
    unit?: string
    step?: number
  }>
}>

export type TanStackDataTableFacet = Readonly<{
  columnId: string
  label: string
  options: ReadonlyArray<string>
}>
export type TanStackDataTableFeature = Readonly<{
  columnId: string
  label: string
}>
export type TanStackDataTableSizing = TanStackDataTableFeature &
  Readonly<{ min: number; max: number; step: number }>

export type TanStackDataTableProps<Data, Message> = Readonly<{
  ariaLabel: string
  columns: ReadonlyArray<TanStackDataTableColumn<Data, Message>>
  model: State.Model
  rows: ReadonlyArray<Data>
  rowKey: (row: Data) => string
  toParentMessage: (message: State.Message) => Message
  emptyText?: string
  pageSizeOptions?: ReadonlyArray<number>
  enableColumnOrder?: boolean
  enableColumnVisibility?: boolean
  enableRowSelection?: boolean
  allSelectableRowIds?: ReadonlyArray<string>
  enableExpandableRows?: boolean
  expandedContent?: (row: Data, h: HtmlBuilder<Message>) => Html | string
  onRowClick?: (row: Data) => Message
  isLoading?: boolean
  loadingText?: string
  stretchColumns?: boolean
  layoutVersion?: number
  storageKey?: string
  footerContent?: Html | string
  pagination?: Readonly<{ totalCount: number; hasMore?: boolean }>
  onResetFilters?: Message
  onResetSort?: Message
  filterPlaceholder?: string
  facet?: TanStackDataTableFacet
  grouping?: TanStackDataTableFeature
  pinnedColumn?: TanStackDataTableFeature
  sizing?: TanStackDataTableSizing
  enableDensity?: boolean
  enableRowPinning?: boolean
}>

const columnInitialWidth = <Data, Message>(
  column: TanStackDataTableColumn<Data, Message>,
  props: Pick<TanStackDataTableProps<Data, Message>, 'storageKey'>,
): number => {
  const minWidth = column.minSize ?? 120
  const explicitWidth = column.defaultSize ?? column.size
  if (explicitWidth !== undefined) return Math.max(minWidth, explicitWidth)

  const labelWidth = Math.ceil(column.header.trim().length * 7.4)
  const controlWidth =
    (column.canSort === false ? 0 : 18) +
    (column.headerTooltip === undefined ? 0 : 18) +
    (column.filter === undefined ? 0 : 20) +
    (props.storageKey === undefined || column.canHide === false ? 0 : 20) +
    44

  return Math.max(minWidth, labelWidth + controlWidth)
}

const activeFilter = (
  model: State.Model,
  columnId: string,
): State.ColumnFilter | undefined =>
  model.columnFilters.find(filter => filter.columnId === columnId)

const matchesColumnFilter = (
  rawValue: unknown,
  filter: State.ColumnFilter,
): boolean => {
  const raw = String(rawValue ?? '')
  if (filter.kind === 'text')
    return raw.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase())
  if (filter.kind === 'enum')
    return filter.values.length === 0 || filter.values.includes(raw)
  if (filter.kind === 'datetime') {
    const value = Date.parse(raw)
    const from =
      filter.value === '' ? Number.NEGATIVE_INFINITY : Date.parse(filter.value)
    const to =
      filter.secondaryValue === ''
        ? Number.POSITIVE_INFINITY
        : Date.parse(filter.secondaryValue)
    return Number.isFinite(value) && value >= from && value <= to
  }
  const value = Number(rawValue)
  const first = Number(filter.value)
  const second = Number(filter.secondaryValue)
  if (!Number.isFinite(value) || !Number.isFinite(first)) return false
  if (filter.operator === 'gte') return value >= first
  if (filter.operator === 'lte') return value <= first
  if (filter.operator === 'between')
    return (
      Number.isFinite(second) &&
      value >= Math.min(first, second) &&
      value <= Math.max(first, second)
    )
  return value === first
}

export const createTanStackTable = <Data, Message>(
  props: TanStackDataTableProps<Data, Message>,
): Table<Data> => {
  const columns: Array<ColumnDef<Data>> = props.columns.map(
    (column): ColumnDef<Data> => ({
      id: column.id,
      accessorFn: column.value,
      header: column.header,
      enableHiding: column.canHide ?? true,
      enableSorting: column.canSort ?? true,
      size:
        props.model.columnWidths.find(entry => entry.columnId === column.id)
          ?.width ?? columnInitialWidth(column, props),
      minSize: column.minSize ?? 60,
      ...(column.filter === undefined
        ? {}
        : {
            filterFn: (row, _columnId, value) =>
              matchesColumnFilter(
                column.filterValue?.(row.original) ??
                  column.value(row.original),
                value as State.ColumnFilter,
              ),
          }),
    }),
  )
  return createTable<Data>({
    autoResetAll: false,
    columns,
    data: [...props.rows],
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: row => props.rowKey(row),
    onStateChange: () => undefined,
    renderFallbackValue: '',
    state: {
      columnFilters: props.model.columnFilters.map(filter => ({
        id: filter.columnId,
        value: filter,
      })),
      columnOrder: props.model.columnOrder.filter(id => id !== 'select'),
      columnVisibility: Object.fromEntries(
        props.model.hiddenColumnIds.map(id => [id, false]),
      ),
      pagination: {
        pageIndex: props.model.pageIndex,
        pageSize: props.model.pageSize,
      },
      sorting: [...props.model.sorting],
    },
  })
}

const checkbox = <Message>(
  checked: boolean,
  indeterminate: boolean,
  label: string,
  message: Message,
  h: HtmlBuilder<Message>,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.Role('checkbox'),
      h.AriaChecked(indeterminate ? 'mixed' : checked),
      h.AriaLabel(label),
      h.OnClick(message),
      h.Class(
        className(
          reset.button,
          styles.checkbox,
          (checked || indeterminate) && styles.checkboxChecked,
        ),
      ),
    ],
    [
      checked && !indeterminate
        ? Icon.check({ class: className(styles.checkboxIcon) }, h)
        : indeterminate
          ? Icon.minus({ class: className(styles.checkboxIcon) }, h)
          : h.empty,
    ],
  )

const filterSummary = <Data, Message>(
  column: TanStackDataTableColumn<Data, Message>,
  filter: State.ColumnFilter,
): string => {
  if (filter.kind === 'enum')
    return filter.values
      .map(
        value =>
          column.filter?.options?.find(option => option.value === value)
            ?.label ?? value,
      )
      .join(', ')
  if (filter.kind === 'datetime')
    return `${filter.value || 'Beliebig'} bis ${filter.secondaryValue || 'Beliebig'}`
  if (filter.kind === 'number') {
    const symbol =
      filter.operator === 'gte'
        ? '≥'
        : filter.operator === 'lte'
          ? '≤'
          : filter.operator === 'between'
            ? 'bis'
            : '='
    return filter.operator === 'between'
      ? `${filter.value} ${symbol} ${filter.secondaryValue}${column.filter?.unit ? ` ${column.filter.unit}` : ''}`
      : `${symbol} ${filter.value}${column.filter?.unit ? ` ${column.filter.unit}` : ''}`
  }
  return filter.value
}

const localDateTimeValue = (value: string): string => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return value
  const part = (number: number) => String(number).padStart(2, '0')
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`
}

const calendarMonth = <Message>(
  year: number,
  month: number,
  model: State.Model,
  toParentMessage: (message: State.Message) => Message,
  navigation: 'previous' | 'next',
  h: HtmlBuilder<Message>,
): Html => {
  const monthStart = new Date(year, month, 1)
  const offset = (monthStart.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const selectedFrom = Date.parse(model.filterDraft)
  const selectedTo = Date.parse(model.filterSecondaryDraft)
  return h.div(
    [h.Class(className(styles.calendarMonth))],
    [
      h.div(
        [h.Class(className(styles.calendarTitleRow))],
        [
          ...(navigation === 'previous'
            ? [
                h.button(
                  [
                    h.Type('button'),
                    h.AriaLabel('Vorheriger Monat'),
                    h.OnClick(
                      toParentMessage(
                        State.Message.ShiftedTanStackCalendarMonth({
                          delta: -1,
                        }),
                      ),
                    ),
                    h.Class(className(reset.button, styles.calendarNavigation)),
                  ],
                  [Icon.chevronLeft({ class: className(styles.smallIcon) }, h)],
                ),
              ]
            : [
                h.span(
                  [h.Class(className(styles.calendarNavigationSpacer))],
                  [],
                ),
              ]),
          h.strong(
            [h.Class(className(styles.calendarTitle))],
            [
              new Intl.DateTimeFormat('de', {
                month: 'long',
                year: 'numeric',
              }).format(monthStart),
            ],
          ),
          ...(navigation === 'next'
            ? [
                h.button(
                  [
                    h.Type('button'),
                    h.AriaLabel('Nächster Monat'),
                    h.Disabled(model.calendarMonthOffset >= 0),
                    h.OnClick(
                      toParentMessage(
                        State.Message.ShiftedTanStackCalendarMonth({
                          delta: 1,
                        }),
                      ),
                    ),
                    h.Class(
                      className(
                        reset.button,
                        styles.calendarNavigation,
                        model.calendarMonthOffset >= 0 &&
                          styles.calendarDayDisabled,
                      ),
                    ),
                  ],
                  [
                    Icon.chevronRight(
                      { class: className(styles.smallIcon) },
                      h,
                    ),
                  ],
                ),
              ]
            : [
                h.span(
                  [h.Class(className(styles.calendarNavigationSpacer))],
                  [],
                ),
              ]),
        ],
      ),
      h.div(
        [h.Class(className(styles.calendarGrid))],
        [
          ...['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(day =>
            h.span([h.Class(className(styles.calendarWeekday))], [day]),
          ),
          ...Array.from({ length: offset }, () => h.span([], [])),
          ...Array.from({ length: days }, (_, index) => {
            const date = new Date(year, month, index + 1)
            const start = new Date(year, month, index + 1, 0, 0, 0, 0)
            const end = new Date(year, month, index + 1, 23, 59, 59, 999)
            const disabled = date.getTime() > today.getTime()
            const selected =
              start.getTime() === new Date(selectedFrom).setHours(0, 0, 0, 0) ||
              start.getTime() === new Date(selectedTo).setHours(0, 0, 0, 0)
            const inRange =
              Number.isFinite(selectedFrom) &&
              Number.isFinite(selectedTo) &&
              start.getTime() >= selectedFrom &&
              start.getTime() <= selectedTo
            const startsNewRange =
              model.filterDraft === '' || model.filterSecondaryDraft !== ''
            const from = startsNewRange
              ? localDateTimeValue(start.toISOString())
              : selectedFrom <= end.getTime()
                ? localDateTimeValue(model.filterDraft)
                : localDateTimeValue(start.toISOString())
            const to = startsNewRange
              ? ''
              : selectedFrom <= end.getTime()
                ? localDateTimeValue(end.toISOString())
                : localDateTimeValue(new Date(selectedFrom).toISOString())
            return h.button(
              [
                h.Type('button'),
                h.AriaLabel(
                  new Intl.DateTimeFormat('de', { dateStyle: 'long' }).format(
                    date,
                  ),
                ),
                h.Disabled(disabled),
                h.OnClick(
                  toParentMessage(
                    State.Message.ChangedTanStackDateRangeDraft({ from, to }),
                  ),
                ),
                h.Class(
                  className(
                    reset.button,
                    styles.calendarDay,
                    selected && styles.calendarDaySelected,
                    inRange && styles.calendarDayRange,
                    disabled && styles.calendarDayDisabled,
                  ),
                ),
              ],
              [String(index + 1)],
            )
          }),
        ],
      ),
    ],
  )
}

const filterPanel = <Data, Message>(
  column: TanStackDataTableColumn<Data, Message>,
  props: TanStackDataTableProps<Data, Message>,
  h: HtmlBuilder<Message>,
): Html => {
  const filter = activeFilter(props.model, column.id)
  const clear = props.toParentMessage(
    State.Message.ClearedTanStackFilterPopover({ columnId: column.id }),
  )
  if (column.filter?.type === 'text')
    return h.div(
      [
        h.Style({ positionAnchor: '--data-table-filter' }),
        h.Class(className(styles.filterPanel, styles.textFilterPanel)),
      ],
      [
        h.input([
          h.Type('text'),
          h.Value(props.model.filterDraft),
          h.Placeholder('Suchen…'),
          h.AriaLabel(`${column.header} durchsuchen`),
          h.OnInput(value =>
            props.toParentMessage(
              State.Message.ChangedTanStackFilterDraft({ value }),
            ),
          ),
          h.OnKeyDownPreventDefault(key =>
            key === 'Enter'
              ? Option.some(
                  props.toParentMessage(
                    State.Message.AppliedTanStackTextFilter({
                      columnId: column.id,
                    }),
                  ),
                )
              : Option.none(),
          ),
          h.Class(className(reset.input, styles.filterInput)),
        ]),
        h.div(
          [h.Class(className(styles.filterActions))],
          [
            button(
              {
                children: ['Filtern'],
                size: 'sm',
                layoutStyle: styles.filterApply,
                onClick: props.toParentMessage(
                  State.Message.AppliedTanStackTextFilter({
                    columnId: column.id,
                  }),
                ),
              },
              h,
            ),
            ...(filter === undefined
              ? []
              : [
                  button(
                    {
                      children: [
                        Icon.x({ class: className(styles.smallIcon) }, h),
                      ],
                      size: 'icon',
                      variant: 'outline',
                      onClick: clear,
                    },
                    h,
                  ),
                ]),
          ],
        ),
      ],
    )
  if (column.filter?.type === 'enum') {
    const options = column.filter.options ?? []
    const shown = options.filter(option =>
      option.label
        .toLocaleLowerCase()
        .includes(props.model.enumSearch.toLocaleLowerCase()),
    )
    return h.div(
      [
        h.Style({ positionAnchor: '--data-table-filter' }),
        h.Class(className(styles.filterPanel, styles.enumFilterPanel)),
      ],
      [
        h.div(
          [h.Class(className(styles.panelHeading))],
          [
            h.span([], ['Werte auswählen']),
            ...(filter === undefined
              ? []
              : [
                  h.button(
                    [
                      h.Type('button'),
                      h.OnClick(clear),
                      h.Class(className(reset.button, styles.resetText)),
                    ],
                    ['Zurücksetzen'],
                  ),
                ]),
          ],
        ),
        ...(options.length <= 5
          ? []
          : [
              h.input([
                h.Type('search'),
                h.Value(props.model.enumSearch),
                h.Placeholder('Suchen…'),
                h.OnInput(value =>
                  props.toParentMessage(
                    State.Message.ChangedTanStackEnumSearch({ value }),
                  ),
                ),
                h.Class(className(reset.input, styles.filterInput)),
              ]),
            ]),
        h.div(
          [h.Class(className(styles.enumOptions))],
          shown.map(option => {
            const values = filter?.values ?? []
            const checked = values.includes(option.value)
            const next = checked
              ? values.filter(value => value !== option.value)
              : [...values, option.value]
            return h.label(
              [h.Class(className(styles.enumOption))],
              [
                h.input([
                  h.Class(className(reset.input)),
                  h.Type('checkbox'),
                  h.Checked(checked),
                  h.OnChange(() =>
                    props.toParentMessage(
                      next.length === 0
                        ? State.Message.ClearedTanStackColumnFilter({
                            columnId: column.id,
                          })
                        : State.Message.ChangedTanStackColumnFilter({
                            filter: State.columnFilter(column.id, 'enum', {
                              values: next,
                            }),
                          }),
                    ),
                  ),
                ]),
                h.span(
                  [
                    h.Style(
                      option.color === undefined ? {} : { color: option.color },
                    ),
                    h.Class(className(styles.enumLabel)),
                  ],
                  [option.label],
                ),
                ...(option.count === undefined
                  ? []
                  : [
                      h.span(
                        [h.Class(className(styles.optionCount))],
                        [String(option.count)],
                      ),
                    ]),
              ],
            )
          }),
        ),
      ],
    )
  }
  if (column.filter?.type === 'number') {
    const invalid =
      props.model.filterDraft.trim() === '' ||
      !Number.isFinite(Number(props.model.filterDraft)) ||
      (props.model.filterOperator === 'between' &&
        (!Number.isFinite(Number(props.model.filterSecondaryDraft)) ||
          Number(props.model.filterDraft) >
            Number(props.model.filterSecondaryDraft)))
    const apply = props.toParentMessage(
      State.Message.AppliedTanStackColumnFilter({
        filter: State.columnFilter(column.id, 'number', {
          value: props.model.filterDraft,
          secondaryValue: props.model.filterSecondaryDraft,
          operator: props.model.filterOperator,
        }),
      }),
    )
    return h.div(
      [
        h.Style({ positionAnchor: '--data-table-filter' }),
        h.Class(className(styles.filterPanel, styles.numberFilterPanel)),
      ],
      [
        h.label(
          [h.Class(className(styles.field))],
          [
            h.span([], ['Bedingung']),
            h.select(
              [
                h.Value(props.model.filterOperator),
                h.OnChange(value =>
                  props.toParentMessage(
                    State.Message.ChangedTanStackFilterOperator({
                      operator:
                        value === 'gte' ||
                        value === 'lte' ||
                        value === 'between'
                          ? value
                          : 'eq',
                    }),
                  ),
                ),
                h.Class(className(reset.input, styles.select)),
              ],
              [
                h.option([h.Value('eq')], ['Ist gleich']),
                h.option([h.Value('gte')], ['Größer oder gleich']),
                h.option([h.Value('lte')], ['Kleiner oder gleich']),
                h.option([h.Value('between')], ['Zwischen']),
              ],
            ),
          ],
        ),
        h.div(
          [
            h.Class(
              className(
                props.model.filterOperator === 'between' && styles.twoFields,
              ),
            ),
          ],
          [
            h.label(
              [h.Class(className(styles.field))],
              [
                h.span(
                  [],
                  [props.model.filterOperator === 'between' ? 'Von' : 'Wert'],
                ),
                h.div(
                  [h.Class(className(styles.inputWithUnit))],
                  [
                    h.input([
                      h.Type('number'),
                      h.Step(String(column.filter.step ?? 1)),
                      h.Value(props.model.filterDraft),
                      h.OnInput(value =>
                        props.toParentMessage(
                          State.Message.ChangedTanStackFilterDraft({ value }),
                        ),
                      ),
                      h.Class(className(reset.input, styles.filterInput)),
                    ]),
                    ...(column.filter.unit
                      ? [h.span([], [column.filter.unit])]
                      : []),
                  ],
                ),
              ],
            ),
            ...(props.model.filterOperator !== 'between'
              ? []
              : [
                  h.label(
                    [h.Class(className(styles.field))],
                    [
                      h.span([], ['Bis']),
                      h.div(
                        [h.Class(className(styles.inputWithUnit))],
                        [
                          h.input([
                            h.Type('number'),
                            h.Step(String(column.filter.step ?? 1)),
                            h.Value(props.model.filterSecondaryDraft),
                            h.OnInput(value =>
                              props.toParentMessage(
                                State.Message.ChangedTanStackFilterSecondaryDraft(
                                  { value },
                                ),
                              ),
                            ),
                            h.Class(className(reset.input, styles.filterInput)),
                          ]),
                          ...(column.filter.unit
                            ? [h.span([], [column.filter.unit])]
                            : []),
                        ],
                      ),
                    ],
                  ),
                ]),
          ],
        ),
        ...(invalid && props.model.filterDraft !== ''
          ? [
              h.p(
                [h.Class(className(reset.text, styles.errorText))],
                ['Bitte einen gültigen Wert eingeben.'],
              ),
            ]
          : []),
        h.div(
          [h.Class(className(styles.panelFooter))],
          [
            button(
              {
                children: ['Zurücksetzen'],
                size: 'sm',
                variant: 'ghost',
                isDisabled: filter === undefined,
                onClick: clear,
              },
              h,
            ),
            button(
              {
                children: ['Anwenden'],
                size: 'sm',
                isDisabled: invalid,
                onClick: apply,
              },
              h,
            ),
          ],
        ),
      ],
    )
  }
  const now = new Date()
  const preset = (hours: number) =>
    props.toParentMessage(
      State.Message.AppliedTanStackColumnFilter({
        filter: State.columnFilter(column.id, 'datetime', {
          value: new Date(now.getTime() - hours * 3_600_000).toISOString(),
          secondaryValue: now.toISOString(),
        }),
      }),
    )
  const applyDate = props.toParentMessage(
    State.Message.AppliedTanStackColumnFilter({
      filter: State.columnFilter(column.id, 'datetime', {
        value: props.model.filterDraft,
        secondaryValue: props.model.filterSecondaryDraft,
      }),
    }),
  )
  if (!props.model.dateCustomOpen)
    return h.div(
      [
        h.Style({ positionAnchor: '--data-table-filter' }),
        h.Class(className(styles.filterPanel, styles.datePresetPanel)),
      ],
      [
        h.div(
          [h.Class(className(styles.datePresetList))],
          [
            ...(filter === undefined
              ? []
              : [
                  h.button(
                    [
                      h.Type('button'),
                      h.OnClick(clear),
                      h.Class(className(reset.button, styles.datePresetButton)),
                    ],
                    [
                      Icon.x({ class: className(styles.smallIcon) }, h),
                      'Alle Zeiten anzeigen',
                    ],
                  ),
                  h.div([h.Class(className(styles.separator))], []),
                ]),
            ...[
              [1, 'Letzte Stunde'],
              [6, 'Letzte 6 Stunden'],
              [24, 'Letzte 24 Stunden'],
              [168, 'Letzte 7 Tage'],
              [720, 'Letzte 30 Tage'],
              [2160, 'Letzte 3 Monate'],
            ].map(([hours, label]) =>
              h.button(
                [
                  h.Type('button'),
                  h.OnClick(preset(Number(hours))),
                  h.Class(className(reset.button, styles.datePresetButton)),
                ],
                [String(label)],
              ),
            ),
            h.div([h.Class(className(styles.separator))], []),
            h.button(
              [
                h.Type('button'),
                h.OnClick(
                  props.toParentMessage(
                    State.Message.ChangedTanStackDateCustomOpen({
                      isOpen: true,
                    }),
                  ),
                ),
                h.Class(className(reset.button, styles.datePresetButton)),
              ],
              [
                Icon.calendarDays({ class: className(styles.smallIcon) }, h),
                'Benutzerdefiniert…',
              ],
            ),
          ],
        ),
      ],
    )
  return h.div(
    [
      h.Style({ positionAnchor: '--data-table-filter' }),
      h.Class(className(styles.filterPanel, styles.dateFilterPanel)),
    ],
    [
      h.div(
        [h.Class(className(styles.dateCustomHeading))],
        [
          h.strong([], ['Zeitraum festlegen']),
          ...(filter === undefined
            ? []
            : [
                button(
                  {
                    children: ['Alle Zeiten'],
                    size: 'sm',
                    variant: 'ghost',
                    onClick: clear,
                  },
                  h,
                ),
              ]),
        ],
      ),
      h.div(
        [h.Class(className(styles.dateFields))],
        [
          h.label(
            [h.Class(className(styles.field))],
            [
              h.span([], ['Von']),
              h.input([
                h.Type('datetime-local'),
                h.Value(localDateTimeValue(props.model.filterDraft)),
                h.OnInput(value =>
                  props.toParentMessage(
                    State.Message.ChangedTanStackFilterDraft({ value }),
                  ),
                ),
                h.Class(className(reset.input, styles.filterInput)),
              ]),
            ],
          ),
          h.label(
            [h.Class(className(styles.field))],
            [
              h.span([], ['Bis']),
              h.input([
                h.Type('datetime-local'),
                h.Value(localDateTimeValue(props.model.filterSecondaryDraft)),
                h.OnInput(value =>
                  props.toParentMessage(
                    State.Message.ChangedTanStackFilterSecondaryDraft({
                      value,
                    }),
                  ),
                ),
                h.Class(className(reset.input, styles.filterInput)),
              ]),
            ],
          ),
        ],
      ),
      h.div(
        [h.Class(className(styles.calendarMonths))],
        [
          calendarMonth(
            now.getFullYear(),
            now.getMonth() + props.model.calendarMonthOffset,
            props.model,
            props.toParentMessage,
            'previous',
            h,
          ),
          calendarMonth(
            now.getFullYear(),
            now.getMonth() + props.model.calendarMonthOffset + 1,
            props.model,
            props.toParentMessage,
            'next',
            h,
          ),
        ],
      ),
      h.div(
        [h.Class(className(styles.panelFooter))],
        [
          button(
            {
              children: [
                Icon.arrowLeft({ class: className(styles.smallIcon) }, h),
                'Zurück',
              ],
              size: 'sm',
              variant: 'ghost',
              onClick: props.toParentMessage(
                State.Message.ChangedTanStackDateCustomOpen({ isOpen: false }),
              ),
            },
            h,
          ),
          button(
            {
              children: ['Übernehmen'],
              size: 'sm',
              isDisabled:
                props.model.filterDraft === '' ||
                props.model.filterSecondaryDraft === '',
              onClick: applyDate,
            },
            h,
          ),
        ],
      ),
    ],
  )
}

const filterControl = <Data, Message>(
  column: TanStackDataTableColumn<Data, Message>,
  props: TanStackDataTableProps<Data, Message>,
  h: HtmlBuilder<Message>,
): Html => {
  if (column.filter === undefined || column.filterable === false) return h.empty
  const filter = activeFilter(props.model, column.id)
  const open = props.model.openFilterColumnId === column.id
  return h.div(
    [
      h.Style(open ? { anchorName: '--data-table-filter' } : {}),
      h.Class(className(styles.filterControl)),
    ],
    [
      h.button(
        [
          h.Type('button'),
          h.Title('Spalte filtern'),
          h.AriaLabel(`${column.header} filtern`),
          h.AriaExpanded(open),
          h.OnClick(
            props.toParentMessage(
              State.Message.ToggledTanStackFilterPopover({
                columnId: column.id,
                draft: filter?.value ?? '',
                secondaryDraft: filter?.secondaryValue ?? '',
                operator: filter?.operator ?? 'eq',
              }),
            ),
          ),
          h.Class(
            className(
              reset.button,
              styles.filterTrigger,
              filter !== undefined && styles.filterTriggerActive,
            ),
          ),
        ],
        [Icon.filter({ class: className(styles.filterIcon) }, h)],
      ),
      ...(open ? [filterPanel(column, props, h)] : []),
    ],
  )
}

const layoutMenu = <Data, Message>(
  ordered: ReadonlyArray<TanStackDataTableColumn<Data, Message>>,
  props: TanStackDataTableProps<Data, Message>,
  h: HtmlBuilder<Message>,
): Html =>
  h.div(
    [h.Class(className(styles.layoutWrap))],
    [
      button(
        {
          children: [
            Icon.chevronsUpDown({ class: className(styles.smallIcon) }, h),
            'Spalten anpassen',
          ],
          size: 'sm',
          variant:
            props.model.hiddenColumnIds.length > 0 ? 'default' : 'outline',
          onClick: props.toParentMessage(
            State.Message.ToggledTanStackLayoutMenu(),
          ),
        },
        h,
      ),
      ...(props.model.layoutMenuOpen
        ? [
            h.div(
              [h.Class(className(styles.layoutPanel))],
              [
                h.div(
                  [h.Class(className(styles.layoutHeader))],
                  [
                    h.strong([], ['Spalten anpassen']),
                    button(
                      {
                        children: ['Zurücksetzen'],
                        size: 'sm',
                        variant: 'ghost',
                        onClick: props.toParentMessage(
                          State.Message.ResetTanStackTableLayout({
                            columnOrder: [
                              'select',
                              ...props.columns.map(column => column.id),
                            ],
                            pinnedColumnIds: [
                              'select',
                              ...props.columns
                                .filter(column => column.sticky)
                                .map(column => column.id),
                            ],
                          }),
                        ),
                      },
                      h,
                    ),
                  ],
                ),
                h.div(
                  [h.Class(className(styles.layoutList))],
                  ordered.map((column, index) => {
                    const hidden = props.model.hiddenColumnIds.includes(
                      column.id,
                    )
                    const pinned =
                      !hidden && props.model.pinnedColumnIds.includes(column.id)
                    return h.div(
                      [
                        h.Class(
                          className(
                            styles.layoutItem,
                            hidden && styles.layoutItemMuted,
                          ),
                        ),
                      ],
                      [
                        button(
                          {
                            children: [
                              Icon.arrowUp(
                                { class: className(styles.tinyIcon) },
                                h,
                              ),
                            ],
                            size: 'icon',
                            variant: 'ghost',
                            isDisabled: index === 0,
                            onClick: props.toParentMessage(
                              State.Message.MovedTanStackColumn({
                                columnId: column.id,
                                direction: 'left',
                              }),
                            ),
                          },
                          h,
                        ),
                        button(
                          {
                            children: [
                              Icon.arrowDown(
                                { class: className(styles.tinyIcon) },
                                h,
                              ),
                            ],
                            size: 'icon',
                            variant: 'ghost',
                            isDisabled: index === ordered.length - 1,
                            onClick: props.toParentMessage(
                              State.Message.MovedTanStackColumn({
                                columnId: column.id,
                                direction: 'right',
                              }),
                            ),
                          },
                          h,
                        ),
                        h.button(
                          [
                            h.Type('button'),
                            h.OnClick(
                              props.toParentMessage(
                                State.Message.ToggledTanStackColumn({
                                  columnId: column.id,
                                  isVisible: hidden,
                                }),
                              ),
                            ),
                            h.Class(
                              className(reset.button, styles.visibilityButton),
                            ),
                          ],
                          [
                            hidden
                              ? Icon.eyeOff(
                                  { class: className(styles.smallIcon) },
                                  h,
                                )
                              : Icon.eye(
                                  { class: className(styles.smallIcon) },
                                  h,
                                ),
                            h.span(
                              [h.Class(className(styles.truncate))],
                              [column.header],
                            ),
                          ],
                        ),
                        button(
                          {
                            children: [
                              Icon.pin(
                                { class: className(styles.smallIcon) },
                                h,
                              ),
                            ],
                            size: 'icon',
                            variant: pinned ? 'secondary' : 'ghost',
                            isDisabled: hidden,
                            onClick: props.toParentMessage(
                              State.Message.ToggledTanStackColumnPin({
                                columnId: column.id,
                              }),
                            ),
                          },
                          h,
                        ),
                      ],
                    )
                  }),
                ),
              ],
            ),
          ]
        : []),
    ],
  )

export const tanStackDataTable = <Data, Message>(
  props: TanStackDataTableProps<Data, Message>,
  h: HtmlBuilder<Message>,
): Html => {
  const table = createTanStackTable(props)
  const byId = new Map(props.columns.map(column => [column.id, column]))
  const savedOrder = props.model.columnOrder.filter(
    id => id !== 'select' && byId.has(id),
  )
  const ordered = [
    ...savedOrder,
    ...props.columns
      .map(column => column.id)
      .filter(id => !savedOrder.includes(id)),
  ]
    .map(id => byId.get(id))
    .filter(
      (column): column is TanStackDataTableColumn<Data, Message> =>
        column !== undefined,
    )
  const visible = ordered.filter(
    column => !props.model.hiddenColumnIds.includes(column.id),
  )
  const selection = props.enableRowSelection !== false
  const expandable = props.enableExpandableRows === true
  const initialWidths = new Map(
    props.columns.map(column => [column.id, columnInitialWidth(column, props)]),
  )
  const widths = visible.map(
    column =>
      props.model.columnWidths.find(entry => entry.columnId === column.id)
        ?.width ??
      initialWidths.get(column.id) ??
      120,
  )
  const templateColumns = `${selection ? '40px ' : ''}${expandable ? '40px ' : ''}${visible.map((_column, index) => (props.stretchColumns === true && index === visible.length - 1 ? `minmax(${widths[index]}px,1fr)` : `${widths[index]}px`)).join(' ')}`
  const pinned = visible.filter(column =>
    props.model.pinnedColumnIds.includes(column.id),
  )
  const stickyOffset = (
    column: TanStackDataTableColumn<Data, Message>,
  ): number =>
    16 +
    (selection ? 40 : 0) +
    (expandable ? 40 : 0) +
    pinned
      .slice(0, pinned.indexOf(column))
      .reduce(
        (sum, current) =>
          sum +
          (props.model.columnWidths.find(entry => entry.columnId === current.id)
            ?.width ??
            initialWidths.get(current.id) ??
            120),
        0,
      )
  const allIds =
    props.allSelectableRowIds ??
    table.getFilteredRowModel().rows.map(row => row.id)
  const selectedCount = allIds.filter(id =>
    props.model.selectedRowIds.includes(id),
  ).length
  const allSelected = allIds.length > 0 && selectedCount === allIds.length
  const someSelected = selectedCount > 0 && !allSelected
  const pageRows = table.getRowModel().rows
  const totalCount =
    props.pagination?.totalCount ?? table.getFilteredRowModel().rows.length
  const pageCount = Math.max(1, Math.ceil(totalCount / props.model.pageSize))
  const widthDiffersFromDefault = (columnId: string, width: number): boolean =>
    width !== (initialWidths.get(columnId) ?? 120)
  const hasCommittedWidthChanges =
    props.model.resizingColumnId === ''
      ? props.model.columnWidths.some(entry =>
          widthDiffersFromDefault(entry.columnId, entry.width),
        )
      : props.model.columnWidths.some(
          entry =>
            entry.columnId !== props.model.resizingColumnId &&
            widthDiffersFromDefault(entry.columnId, entry.width),
        ) ||
        widthDiffersFromDefault(
          props.model.resizingColumnId,
          props.model.resizeStartWidth,
        )
  const modified =
    props.model.columnFilters.length > 0 || hasCommittedWidthChanges
  const backdrop =
    props.model.openFilterColumnId !== '' ||
    props.model.layoutMenuOpen ||
    props.model.activeFiltersMenuOpen ||
    props.model.pageSizeMenuOpen
      ? h.button(
          [
            h.Type('button'),
            h.AriaLabel('Menü schließen'),
            h.OnClick(
              props.toParentMessage(
                State.Message.ClosedTanStackTableOverlays(),
              ),
            ),
            h.Class(
              className(
                reset.button,
                styles.backdrop,
                props.model.openFilterColumnId !== '' && styles.filterBackdrop,
              ),
            ),
          ],
          [],
        )
      : h.empty
  const modifiedToolbar =
    modified && props.storageKey !== undefined
      ? h.div(
          [h.Class(className(styles.modifiedToolbar))],
          [
            h.button(
              [
                h.Type('button'),
                h.Title('Gesamte Ansicht zurücksetzen'),
                h.AriaLabel('Gesamte Ansicht zurücksetzen'),
                h.OnClick(
                  props.toParentMessage(State.Message.ResetTanStackTableView()),
                ),
                h.Class(className(reset.button, styles.toolbarButton)),
              ],
              [Icon.rotateCcw({ class: className(styles.smallIcon) }, h)],
            ),
            h.button(
              [
                h.Type('button'),
                h.Title('Spaltenbreiten zurücksetzen'),
                h.AriaLabel('Spaltenbreiten zurücksetzen'),
                h.OnClick(
                  props.toParentMessage(
                    State.Message.ResetTanStackColumnWidths(),
                  ),
                ),
                h.Class(className(reset.button, styles.toolbarButton)),
              ],
              [Icon.moveHorizontal({ class: className(styles.smallIcon) }, h)],
            ),
            ...(props.model.columnFilters.length === 0
              ? []
              : [
                  h.div(
                    [h.Class(className(styles.activeFilterWrap))],
                    [
                      h.button(
                        [
                          h.Type('button'),
                          h.Title('Aktive Filter'),
                          h.AriaLabel('Aktive Filter'),
                          h.OnClick(
                            props.toParentMessage(
                              State.Message.ToggledTanStackActiveFiltersMenu(),
                            ),
                          ),
                          h.Class(
                            className(reset.button, styles.toolbarButton),
                          ),
                        ],
                        [
                          Icon.filter(
                            { class: className(styles.smallIcon) },
                            h,
                          ),
                          h.span(
                            [h.Class(className(styles.filterBadge))],
                            [String(props.model.columnFilters.length)],
                          ),
                        ],
                      ),
                      ...(props.model.activeFiltersMenuOpen
                        ? [
                            h.div(
                              [h.Class(className(styles.activeFilterPanel))],
                              [
                                h.strong([], ['Aktive Filter']),
                                ...props.model.columnFilters.map(filter => {
                                  const column = byId.get(filter.columnId)
                                  return h.div(
                                    [
                                      h.Class(
                                        className(styles.activeFilterItem),
                                      ),
                                    ],
                                    [
                                      h.div(
                                        [
                                          h.Class(
                                            className(styles.activeFilterText),
                                          ),
                                        ],
                                        [
                                          h.strong(
                                            [],
                                            [column?.header ?? filter.columnId],
                                          ),
                                          h.span(
                                            [],
                                            [
                                              column
                                                ? filterSummary(column, filter)
                                                : filter.value,
                                            ],
                                          ),
                                        ],
                                      ),
                                      h.button(
                                        [
                                          h.Type('button'),
                                          h.AriaLabel(
                                            `${column?.header ?? filter.columnId} Filter entfernen`,
                                          ),
                                          h.OnClick(
                                            props.toParentMessage(
                                              State.Message.ClearedTanStackColumnFilter(
                                                { columnId: filter.columnId },
                                              ),
                                            ),
                                          ),
                                          h.Class(
                                            className(
                                              reset.button,
                                              styles.iconButton,
                                            ),
                                          ),
                                        ],
                                        [
                                          Icon.x(
                                            {
                                              class: className(styles.tinyIcon),
                                            },
                                            h,
                                          ),
                                        ],
                                      ),
                                    ],
                                  )
                                }),
                              ],
                            ),
                          ]
                        : []),
                    ],
                  ),
                ]),
          ],
        )
      : h.empty
  return h.div(
    [
      h.Role('table'),
      h.AriaLabel(props.ariaLabel),
      h.OnPointerMove(screenX =>
        props.model.resizingColumnId === ''
          ? Option.none()
          : Option.some(
              props.toParentMessage(
                State.Message.DraggedTanStackColumnResize({ screenX }),
              ),
            ),
      ),
      h.OnPointerUp(() =>
        props.model.resizingColumnId === ''
          ? Option.none()
          : Option.some(
              props.toParentMessage(State.Message.EndedTanStackColumnResize()),
            ),
      ),
      h.Class(
        className(
          styles.root,
          props.model.resizingColumnId !== '' && styles.resizing,
        ),
      ),
    ],
    [
      backdrop,
      ...(modified && props.storageKey !== undefined ? [modifiedToolbar] : []),
      h.div(
        [h.Class(className(styles.tableColumn))],
        [
          h.div(
            [
              h.Class(
                className(
                  styles.tableFrame,
                  props.storageKey !== undefined &&
                    modified &&
                    styles.tableFrameModified,
                ),
              ),
            ],
            [
              props.isLoading === true
                ? h.div(
                    [h.Role('status'), h.Class(className(styles.loading))],
                    [
                      Icon.loaderCircle(
                        { class: className(styles.spinner) },
                        h,
                      ),
                      props.loadingText ?? 'Wird geladen…',
                    ],
                  )
                : h.div(
                    [
                      h.Class(className(styles.scroller)),
                      h.OnMount({
                        name: `tanstack-table-scroll-${props.storageKey ?? props.ariaLabel}`,
                        f: element =>
                          element instanceof HTMLElement
                            ? Subscription.fromEvent<
                                HTMLElement,
                                'scroll',
                                Message
                              >({
                                target: element,
                                type: 'scroll',
                                mapEvent: () =>
                                  props.toParentMessage(
                                    State.Message.ClosedTanStackTableOverlays(),
                                  ),
                                options: { passive: true },
                              })
                            : Stream.empty,
                      }),
                    ],
                    [
                      h.div(
                        [
                          h.Role('row'),
                          h.Style({ gridTemplateColumns: templateColumns }),
                          h.Class(className(styles.grid, styles.header)),
                        ],
                        [
                          ...(selection
                            ? [
                                h.div(
                                  [
                                    h.Role('columnheader'),
                                    h.Class(
                                      className(
                                        styles.prefixCell,
                                        pinned.length > 0 &&
                                          styles.stickyHeader,
                                        pinned.length > 0 &&
                                          styles.stickyPrefixHeader,
                                        pinned.length > 0 &&
                                          styles.stickyLeading,
                                      ),
                                    ),
                                    h.Style(
                                      pinned.length > 0 ? { left: '16px' } : {},
                                    ),
                                  ],
                                  [
                                    checkbox(
                                      allSelected,
                                      someSelected,
                                      'Alle auswählen',
                                      props.toParentMessage(
                                        State.Message.ToggledTanStackRows({
                                          rowIds: allIds,
                                          isSelected: !allSelected,
                                        }),
                                      ),
                                      h,
                                    ),
                                  ],
                                ),
                              ]
                            : []),
                          ...(expandable
                            ? [
                                h.div(
                                  [
                                    h.Role('columnheader'),
                                    h.Class(
                                      className(
                                        styles.prefixCell,
                                        pinned.length > 0 &&
                                          styles.stickyHeader,
                                        pinned.length > 0 &&
                                          styles.stickyPrefixHeader,
                                        pinned.length > 0 &&
                                          !selection &&
                                          styles.stickyLeading,
                                      ),
                                    ),
                                    h.Style(
                                      pinned.length > 0
                                        ? {
                                            left: `${16 + (selection ? 40 : 0)}px`,
                                          }
                                        : {},
                                    ),
                                  ],
                                  [],
                                ),
                              ]
                            : []),
                          ...visible.map((column, index) => {
                            const isPinned =
                              props.model.pinnedColumnIds.includes(column.id)
                            const currentSort = props.model.sorting[0]
                            const nextSort =
                              currentSort?.id === column.id
                                ? [{ id: column.id, desc: !currentSort.desc }]
                                : [{ id: column.id, desc: false }]
                            const label = [
                              h.span(
                                [h.Class(className(styles.truncate))],
                                [column.header],
                              ),
                              ...(column.canSort === false
                                ? []
                                : [
                                    Icon.icon(
                                      currentSort?.id === column.id
                                        ? currentSort.desc
                                          ? 'arrow-down'
                                          : 'arrow-up'
                                        : 'chevrons-up-down',
                                      {
                                        class: className(
                                          styles.sortIcon,
                                          currentSort?.id !== column.id &&
                                            styles.sortIconIdle,
                                        ),
                                      },
                                      h,
                                    ),
                                  ]),
                              ...(column.headerTooltip === undefined
                                ? []
                                : [
                                    h.span(
                                      [
                                        h.Title(column.headerTooltip),
                                        h.AriaLabel(
                                          `Hilfe zu ${column.header}`,
                                        ),
                                        h.Class(className(styles.info)),
                                      ],
                                      [
                                        Icon.info(
                                          {
                                            class: className(styles.smallIcon),
                                          },
                                          h,
                                        ),
                                      ],
                                    ),
                                  ]),
                            ]
                            const header =
                              column.canSort === false
                                ? h.span(
                                    [
                                      h.Class(
                                        className(
                                          styles.sortButton,
                                          styles.staticHeader,
                                        ),
                                      ),
                                    ],
                                    label,
                                  )
                                : h.button(
                                    [
                                      h.Type('button'),
                                      h.OnClick(
                                        props.toParentMessage(
                                          State.Message.ChangedTanStackSorting({
                                            sorting: nextSort,
                                          }),
                                        ),
                                      ),
                                      h.Class(
                                        className(
                                          reset.button,
                                          styles.sortButton,
                                        ),
                                      ),
                                    ],
                                    label,
                                  )
                            return h.div(
                              [
                                h.Role('columnheader'),
                                h.Style(
                                  isPinned
                                    ? { left: `${stickyOffset(column)}px` }
                                    : {},
                                ),
                                h.Class(
                                  className(
                                    styles.headerCell,
                                    index > 0 && styles.cellInset,
                                    isPinned && styles.stickyHeader,
                                  ),
                                ),
                              ],
                              [
                                h.div(
                                  [h.Class(className(styles.headerInner))],
                                  [header, filterControl(column, props, h)],
                                ),
                                ...(props.storageKey === undefined ||
                                index === visible.length - 1
                                  ? []
                                  : [
                                      h.div(
                                        [
                                          h.Role('separator'),
                                          h.AriaLabel('Spaltenbreite anpassen'),
                                          h.Title('Spaltenbreite anpassen'),
                                          h.OnPointerDown(
                                            (_type, pointerButton, screenX) =>
                                              pointerButton === 0
                                                ? Option.some(
                                                    props.toParentMessage(
                                                      State.Message.StartedTanStackColumnResize(
                                                        {
                                                          columnId: column.id,
                                                          screenX,
                                                          width:
                                                            widths[index] ??
                                                            120,
                                                        },
                                                      ),
                                                    ),
                                                  )
                                                : Option.none(),
                                          ),
                                          h.Class(
                                            className(styles.resizeHandle),
                                          ),
                                        ],
                                        [
                                          h.span(
                                            [
                                              h.Class(
                                                className(styles.resizeDots),
                                              ),
                                            ],
                                            [],
                                          ),
                                        ],
                                      ),
                                    ]),
                              ],
                            )
                          }),
                        ],
                      ),
                      h.div(
                        [h.Role('rowgroup'), h.Class(className(styles.rows))],
                        pageRows.length === 0
                          ? [
                              h.div(
                                [h.Class(className(styles.empty))],
                                [props.emptyText ?? 'Keine Daten gefunden'],
                              ),
                            ]
                          : pageRows.flatMap(row => {
                              const selected =
                                props.model.selectedRowIds.includes(row.id)
                              const expanded =
                                props.model.expandedRowIds.includes(row.id)
                              const dataCells = visible.map((column, index) => {
                                const isPinned =
                                  props.model.pinnedColumnIds.includes(
                                    column.id,
                                  )
                                return h.div(
                                  [
                                    h.Role('cell'),
                                    ...(expandable ||
                                    props.onRowClick !== undefined
                                      ? [
                                          h.OnClick(
                                            props.onRowClick?.(row.original) ??
                                              props.toParentMessage(
                                                State.Message.ToggledTanStackExpanded(
                                                  { rowId: row.id },
                                                ),
                                              ),
                                          ),
                                        ]
                                      : []),
                                    h.Style(
                                      isPinned
                                        ? { left: `${stickyOffset(column)}px` }
                                        : {},
                                    ),
                                    h.Class(
                                      className(
                                        styles.bodyCell,
                                        index > 0 && styles.cellInset,
                                        isPinned && styles.stickyBody,
                                        selected && styles.stickySelected,
                                        expanded && styles.stickyExpanded,
                                      ),
                                    ),
                                  ],
                                  [
                                    column.cell?.(row.original, h) ??
                                      String(column.value(row.original) ?? '–'),
                                  ],
                                )
                              })
                              return [
                                h.div(
                                  [
                                    h.Role('row'),
                                    h.Key(row.id),
                                    h.Style({
                                      gridTemplateColumns: templateColumns,
                                    }),
                                    h.Class(
                                      className(
                                        styles.grid,
                                        styles.row,
                                        (expandable ||
                                          props.onRowClick !== undefined) &&
                                          styles.rowInteractive,
                                        selected && styles.rowSelected,
                                        expanded && styles.rowExpanded,
                                      ),
                                    ),
                                  ],
                                  [
                                    ...(selection
                                      ? [
                                          h.div(
                                            [
                                              h.Role('cell'),
                                              h.Class(
                                                className(
                                                  styles.prefixCell,
                                                  pinned.length > 0 &&
                                                    styles.stickyBody,
                                                  pinned.length > 0 &&
                                                    styles.stickyPrefixBody,
                                                  pinned.length > 0 &&
                                                    styles.stickyLeading,
                                                  selected &&
                                                    styles.stickySelected,
                                                  expanded &&
                                                    styles.stickyExpanded,
                                                ),
                                              ),
                                              h.Style(
                                                pinned.length > 0
                                                  ? { left: '16px' }
                                                  : {},
                                              ),
                                            ],
                                            [
                                              checkbox(
                                                selected,
                                                false,
                                                `Zeile ${row.id} auswählen`,
                                                props.toParentMessage(
                                                  State.Message.ToggledTanStackRow(
                                                    {
                                                      rowId: row.id,
                                                      isSelected: !selected,
                                                    },
                                                  ),
                                                ),
                                                h,
                                              ),
                                            ],
                                          ),
                                        ]
                                      : []),
                                    ...(expandable
                                      ? [
                                          h.div(
                                            [
                                              h.Role('cell'),
                                              h.OnClick(
                                                props.toParentMessage(
                                                  State.Message.ToggledTanStackExpanded(
                                                    { rowId: row.id },
                                                  ),
                                                ),
                                              ),
                                              h.Class(
                                                className(
                                                  styles.prefixCell,
                                                  pinned.length > 0 &&
                                                    styles.stickyBody,
                                                  pinned.length > 0 &&
                                                    styles.stickyPrefixBody,
                                                  pinned.length > 0 &&
                                                    !selection &&
                                                    styles.stickyLeading,
                                                  selected &&
                                                    styles.stickySelected,
                                                  expanded &&
                                                    styles.stickyExpanded,
                                                ),
                                              ),
                                              h.Style(
                                                pinned.length > 0
                                                  ? {
                                                      left: `${16 + (selection ? 40 : 0)}px`,
                                                    }
                                                  : {},
                                              ),
                                            ],
                                            [
                                              Icon.chevronDown(
                                                {
                                                  class: className(
                                                    styles.expandIcon,
                                                    expanded &&
                                                      styles.expandIconOpen,
                                                  ),
                                                },
                                                h,
                                              ),
                                            ],
                                          ),
                                        ]
                                      : []),
                                    ...dataCells,
                                  ],
                                ),
                                ...(expandable && expanded
                                  ? [
                                      h.div(
                                        [
                                          h.Class(
                                            className(styles.expandedContent),
                                          ),
                                        ],
                                        [
                                          props.expandedContent?.(
                                            row.original,
                                            h,
                                          ) ?? 'Erweiterte Zeile',
                                        ],
                                      ),
                                    ]
                                  : []),
                              ]
                            }),
                      ),
                    ],
                  ),
            ],
          ),
          ...(props.storageKey === undefined &&
          props.footerContent === undefined &&
          props.pagination === undefined
            ? []
            : [
                h.div(
                  [h.Class(className(styles.footer))],
                  [
                    h.div(
                      [h.Class(className(styles.footerLeft))],
                      [
                        ...(props.footerContent === undefined
                          ? []
                          : [props.footerContent]),
                        h.span(
                          [h.Class(className(styles.footerText))],
                          [
                            totalCount > props.model.pageSize
                              ? `Seite ${props.model.pageIndex + 1} von ${pageCount}`
                              : `${totalCount} Einträge`,
                          ],
                        ),
                        ...(props.pageSizeOptions === undefined
                          ? []
                          : [
                              h.div(
                                [h.Class(className(styles.pageSizeWrap))],
                                [
                                  h.span(
                                    [h.Class(className(styles.footerText))],
                                    ['Zeilen:'],
                                  ),
                                  h.input([
                                    h.Type('text'),
                                    h.InputMode('numeric'),
                                    h.Value(
                                      props.model.pageSizeMenuOpen
                                        ? props.model.pageSizeDraft
                                        : String(props.model.pageSize),
                                    ),
                                    h.OnFocus(
                                      props.toParentMessage(
                                        State.Message.ToggledTanStackPageSizeMenu(),
                                      ),
                                    ),
                                    h.OnInput(value =>
                                      props.toParentMessage(
                                        State.Message.ChangedTanStackPageSizeDraft(
                                          { value },
                                        ),
                                      ),
                                    ),
                                    h.OnKeyDownPreventDefault(key =>
                                      key === 'Enter' &&
                                      Number(props.model.pageSizeDraft) > 0
                                        ? Option.some(
                                            props.toParentMessage(
                                              State.Message.CommittedTanStackPageSize(
                                                {
                                                  pageSize: Number(
                                                    props.model.pageSizeDraft,
                                                  ),
                                                },
                                              ),
                                            ),
                                          )
                                        : Option.none(),
                                    ),
                                    h.Class(
                                      className(
                                        reset.input,
                                        styles.pageSizeInput,
                                      ),
                                    ),
                                  ]),
                                  ...(props.model.pageSizeMenuOpen
                                    ? [
                                        h.div(
                                          [
                                            h.Class(
                                              className(styles.pageSizePanel),
                                            ),
                                          ],
                                          props.pageSizeOptions.map(size =>
                                            h.button(
                                              [
                                                h.Type('button'),
                                                h.OnClick(
                                                  props.toParentMessage(
                                                    State.Message.CommittedTanStackPageSize(
                                                      { pageSize: size },
                                                    ),
                                                  ),
                                                ),
                                                h.Class(
                                                  className(
                                                    reset.button,
                                                    styles.pageSizeOption,
                                                    size ===
                                                      props.model.pageSize &&
                                                      styles.pageSizeOptionActive,
                                                  ),
                                                ),
                                              ],
                                              [String(size)],
                                            ),
                                          ),
                                        ),
                                      ]
                                    : []),
                                ],
                              ),
                            ]),
                      ],
                    ),
                    h.div(
                      [h.Class(className(styles.footerRight))],
                      [
                        layoutMenu(ordered, props, h),
                        ...(totalCount <= props.model.pageSize
                          ? []
                          : [
                              button(
                                {
                                  children: ['Zurück'],
                                  size: 'sm',
                                  variant: 'outline',
                                  isDisabled: props.model.pageIndex === 0,
                                  onClick: props.toParentMessage(
                                    State.Message.ChangedTanStackPage({
                                      pageIndex: Math.max(
                                        0,
                                        props.model.pageIndex - 1,
                                      ),
                                    }),
                                  ),
                                },
                                h,
                              ),
                              button(
                                {
                                  children: ['Weiter'],
                                  size: 'sm',
                                  variant: 'outline',
                                  isDisabled:
                                    props.pagination?.hasMore === false ||
                                    (props.model.pageIndex + 1) *
                                      props.model.pageSize >=
                                      totalCount,
                                  onClick: props.toParentMessage(
                                    State.Message.ChangedTanStackPage({
                                      pageIndex: props.model.pageIndex + 1,
                                    }),
                                  ),
                                },
                                h,
                              ),
                            ]),
                      ],
                    ),
                  ],
                ),
              ]),
        ],
      ),
    ],
  )
}
