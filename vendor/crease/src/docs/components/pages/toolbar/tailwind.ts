import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  FILTER_FIELDS,
  JOBS,
  toolbarFixtures,
  type Job,
} from '@/docs/components/pages/toolbar/shared'
import * as Icon from '@/lib/icon'
import { badge } from '@/ui/badge'
import { button } from '@/ui/button'
import { checkbox } from '@/ui/checkbox'
import { input } from '@/ui/input'
import * as Select from '@/ui/select'
import {
  table,
  tableBody,
  tableCell,
  tableHead,
  tableHeader,
  tableRow,
} from '@/ui/table'
import * as Tabs from '@/ui/tabs'
import * as Toolbar from '@/ui/toolbar'

const PreviewMessage = defineMessageUnion({
  GotToolbarMessage: { message: Toolbar.Message },
  GotTabsMessage: { message: Tabs.Message },
  ToggledJobRow: { id: S.String, isChecked: S.Boolean },
  ClickedDeselectAll: {},
  ChangedSearch: { value: S.String },
  GotFilterSelectMessage: {
    field: S.Literals(['status', 'priority', 'customer']),
    message: Select.Message,
  },
  ClickedClearFilters: {},
})
type PreviewMessage = typeof PreviewMessage.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('toolbar'),
  tabs: Tabs.Model,
  selectedTab: S.String,
  selectedRows: S.Array(S.String),
  search: S.String,
  status: S.String,
  priority: S.String,
  customer: S.String,
  filterSelects: S.Struct({
    status: Select.Model,
    priority: Select.Model,
    customer: Select.Model,
  }),
})
type PreviewModel = typeof PreviewModel.Type

const FilterSelect = Select.create<string>()
const FILTER_WIDTH = {
  status: 'w-32',
  priority: 'w-24',
  customer: 'w-40',
} as const

const heading = (text: string, h: HtmlBuilder<PreviewMessage>): Html =>
  h.h4([h.Class('text-base font-medium')], [text])

const ghostIconButton = (
  name: string,
  ariaLabel: string,
  h: HtmlBuilder<PreviewMessage>,
  edgeComp = false,
): Html =>
  h.div(edgeComp ? [h.DataAttribute('crease-edge-comp', '')] : [], [
    button<PreviewMessage>(
      {
        variant: 'ghost',
        size: 'icon-sm',
        ariaLabel,
        leadingIcon: Icon.icon(name, {}, h),
        children: [],
      },
      h,
    ),
  ])

const jobsTable = (
  rows: ReadonlyArray<Job>,
  model: PreviewModel,
  withSelection: boolean,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  table(
    {
      children: [
        tableHeader(
          {
            children: [
              tableRow(
                {
                  children: [
                    ...(withSelection
                      ? [tableHead({ children: [''], class: 'w-8' }, h)]
                      : []),
                    tableHead({ children: ['Job'] }, h),
                    tableHead({ children: ['Customer'] }, h),
                    tableHead({ children: ['Status'] }, h),
                    tableHead({ children: ['Priority'] }, h),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
        tableBody(
          {
            children: rows.map(job =>
              tableRow(
                {
                  children: [
                    ...(withSelection
                      ? [
                          tableCell(
                            {
                              children: [
                                checkbox<PreviewMessage>(
                                  {
                                    id: `row-${job.id}`,
                                    isChecked: model.selectedRows.includes(
                                      job.id,
                                    ),
                                    onToggle: isChecked =>
                                      PreviewMessage.ToggledJobRow({
                                        id: job.id,
                                        isChecked,
                                      }),
                                    label: `Select ${job.job}`,
                                  },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                        ]
                      : []),
                    tableCell({ children: [job.job] }, h),
                    tableCell({ children: [job.customer] }, h),
                    tableCell({ children: [job.status] }, h),
                    tableCell({ children: [job.priority] }, h),
                  ],
                },
                h,
              ),
            ),
          },
          h,
        ),
      ],
    },
    h,
  )

const filterRows = (model: PreviewModel): ReadonlyArray<Job> => {
  const query = model.search.trim().toLowerCase()
  return JOBS.filter(
    row =>
      (query === '' ||
        `${row.job} ${row.customer}`.toLowerCase().includes(query)) &&
      FILTER_FIELDS.every(
        field => model[field.key] === '' || row[field.key] === model[field.key],
      ),
  )
}

const bodyFor = (
  fixture: (typeof toolbarFixtures)[number],
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const toolbarMessage = (message: Toolbar.Message): PreviewMessage =>
    PreviewMessage.GotToolbarMessage({ message })

  switch (fixture.kind) {
    case 'threeSlot':
      return h.div(
        [h.Class('w-150 rounded-xl border bg-card')],
        [
          Toolbar.toolbar<PreviewMessage>(
            {
              label: 'Document toolbar',
              dividers: ['bottom'],
              toParentMessage: toolbarMessage,
              startContent: [ghostIconButton('arrow-left', 'Back', h, true)],
              centerContent: heading('Title', h),
              endContent: [
                button<PreviewMessage>(
                  { variant: 'secondary', children: ['Discard'] },
                  h,
                ),
                button<PreviewMessage>(
                  { variant: 'default', children: ['Save'] },
                  h,
                ),
              ],
            },
            h,
          ),
          h.div([h.Class('h-40 p-4')], []),
        ],
      )
    case 'cardHeader':
      return h.div(
        [h.Class('w-125 rounded-xl border bg-card')],
        [
          Toolbar.toolbar<PreviewMessage>(
            {
              label: 'User list actions',
              size: 'sm',
              dividers: ['bottom'],
              toParentMessage: toolbarMessage,
              startContent: [heading('Card title', h)],
              endContent: [
                ghostIconButton('funnel', 'Filter', h, true),
                button<PreviewMessage>(
                  {
                    variant: 'default',
                    size: 'icon-sm',
                    ariaLabel: 'Add user',
                    leadingIcon: Icon.icon('plus', {}, h),
                    children: [],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          h.div([h.Class('h-32 p-4')], []),
        ],
      )
    case 'sizes':
      return h.div(
        [h.Class('flex w-125 flex-col gap-4')],
        (
          [
            ['sm', 'Small'],
            ['md', 'Medium'],
            ['lg', 'Large'],
          ] as const
        ).map(([size, label]) =>
          h.div(
            [h.Class('rounded-xl border bg-card')],
            [
              Toolbar.toolbar<PreviewMessage>(
                {
                  label: `${label} toolbar`,
                  size,
                  toParentMessage: toolbarMessage,
                  startContent: [heading(label, h)],
                  endContent: [
                    ghostIconButton('funnel', 'Filter', h, true),
                    button<PreviewMessage>(
                      {
                        variant: 'default',
                        size: size === 'sm' ? 'sm' : 'default',
                        leadingIcon: Icon.icon('plus', {}, h),
                        children: ['Add'],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
            ],
          ),
        ),
      )
    case 'tabs':
      return h.div(
        [h.Class('w-150 rounded-xl border bg-card')],
        [
          Toolbar.toolbar<PreviewMessage>(
            {
              label: 'Section navigation',
              dividers: ['bottom'],
              toParentMessage: toolbarMessage,
              startContent: [
                h.div(
                  [h.DataAttribute('crease-edge-comp', '')],
                  [
                    Tabs.tabs<PreviewMessage>(
                      {
                        model: model.tabs,
                        selectedValue: model.selectedTab,
                        toParentMessage: message =>
                          PreviewMessage.GotTabsMessage({ message }),
                        tabs: [
                          { value: 'overview', label: 'Overview', content: '' },
                          {
                            value: 'analytics',
                            label: 'Analytics',
                            content: '',
                          },
                          { value: 'settings', label: 'Settings', content: '' },
                        ],
                        listClass: 'border-b-0',
                      },
                      h,
                    ),
                  ],
                ),
              ],
              endContent: [
                button<PreviewMessage>(
                  {
                    variant: 'default',
                    size: 'icon-sm',
                    ariaLabel: 'New item',
                    leadingIcon: Icon.icon('plus', {}, h),
                    children: [],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          h.div([h.Class('h-32 p-4')], []),
        ],
      )
    case 'bulk':
      return h.div(
        [h.Class('w-160')],
        [
          ...(model.selectedRows.length === 0
            ? []
            : [
                Toolbar.toolbar<PreviewMessage>(
                  {
                    label: 'Bulk actions',
                    size: 'sm',
                    variant: 'muted',
                    dividers: ['bottom'],
                    toParentMessage: toolbarMessage,
                    startContent: [
                      badge<PreviewMessage>(
                        {
                          variant: 'secondary',
                          children: [`${model.selectedRows.length} selected`],
                        },
                        h,
                      ),
                      ghostIconButton('trash-2', 'Delete', h),
                      ghostIconButton('archive', 'Archive', h),
                    ],
                    endContent: [
                      button<PreviewMessage>(
                        {
                          variant: 'ghost',
                          size: 'sm',
                          onClick: PreviewMessage.ClickedDeselectAll(),
                          children: ['Deselect all'],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
              ]),
          h.div(
            [h.Class('rounded-b-xl border border-t-0 bg-card')],
            [jobsTable(JOBS, model, true, h)],
          ),
        ],
      )
    case 'filter': {
      const results = filterRows(model)
      const hasFilters =
        model.search !== '' ||
        model.status !== '' ||
        model.priority !== '' ||
        model.customer !== ''
      return h.div(
        [h.Class('w-190 max-w-full min-w-0 rounded-xl border bg-card')],
        [
          Toolbar.toolbar<PreviewMessage>(
            {
              label: 'Job filters',
              size: 'sm',
              dividers: ['bottom'],
              toParentMessage: toolbarMessage,
              startContent: [
                h.div(
                  [h.Class('flex w-full min-w-0 flex-wrap items-center gap-2')],
                  [
                    input<PreviewMessage>(
                      {
                        id: 'filter-search',
                        ariaLabel: 'Search jobs',
                        placeholder: 'Search',
                        value: model.search,
                        onInput: value =>
                          PreviewMessage.ChangedSearch({ value }),
                        class: 'w-36',
                      },
                      h,
                    ),
                    ...FILTER_FIELDS.map(field =>
                      FilterSelect.select(
                        {
                          model: model.filterSelects[field.key],
                          ariaLabel: field.label,
                          placeholder: field.label,
                          maybeSelectedValue:
                            model[field.key] === ''
                              ? Option.none()
                              : Option.some(model[field.key]),
                          toParentMessage: message =>
                            PreviewMessage.GotFilterSelectMessage({
                              field: field.key,
                              message,
                            }),
                          size: 'sm',
                          triggerClass: FILTER_WIDTH[field.key],
                          items: ['', ...field.options],
                          itemToValue: value => value,
                          itemToLabel: value =>
                            value === '' ? field.label : value,
                        },
                        h,
                      ),
                    ),
                    h.div(
                      [
                        h.DataAttribute('slot', 'toolbar-filter-actions'),
                        h.Class('ms-auto flex shrink-0 items-center gap-2'),
                      ],
                      [
                        h.span(
                          [
                            h.DataAttribute('slot', 'toolbar-filter-count'),
                            h.Class(
                              'text-muted-foreground text-xs tabular-nums whitespace-nowrap',
                            ),
                          ],
                          [`${results.length} of ${JOBS.length}`],
                        ),
                        ...(hasFilters
                          ? [
                              button<PreviewMessage>(
                                {
                                  variant: 'link',
                                  size: 'sm',
                                  onClick: PreviewMessage.ClickedClearFilters(),
                                  children: ['Clear all'],
                                },
                                h,
                              ),
                            ]
                          : []),
                        ghostIconButton('columns-3-cog', 'View options', h),
                      ],
                    ),
                  ],
                ),
              ],
            },
            h,
          ),
          results.length === 0
            ? h.div(
                [h.Class('flex flex-col items-center gap-3 p-8 text-center')],
                [
                  h.p(
                    [h.Class('text-sm font-medium')],
                    ['No jobs match these filters'],
                  ),
                  button<PreviewMessage>(
                    {
                      variant: 'secondary',
                      size: 'sm',
                      onClick: PreviewMessage.ClickedClearFilters(),
                      children: ['Clear all'],
                    },
                    h,
                  ),
                ],
              )
            : jobsTable(results, model, false, h),
        ],
      )
    }
  }
}

export const toolbarTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => {
    const fixture = toolbarFixtures[index] ?? toolbarFixtures[0]
    return {
      _docsPage: 'toolbar',
      tabs: Tabs.init({ id: `docs-toolbar-tabs-${index}` }),
      selectedTab: 'overview',
      selectedRows:
        fixture.kind === 'bulk' ? ['SJ-2136', 'SJ-2134', 'SJ-2132'] : [],
      search: '',
      status: '',
      priority: '',
      customer: '',
      filterSelects: {
        status: Select.init({
          id: `docs-toolbar-${index}-filter-status`,
          isAnimated: true,
        }),
        priority: Select.init({
          id: `docs-toolbar-${index}-filter-priority`,
          isAnimated: true,
        }),
        customer: Select.init({
          id: `docs-toolbar-${index}-filter-customer`,
          isAnimated: true,
        }),
      },
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'GotToolbarMessage':
        return { model }
      case 'GotTabsMessage': {
        const next = Tabs.update(model.tabs, message.message)
        const selection =
          next.outMessage?._tag === 'Selected'
            ? next.outMessage.value
            : undefined
        return {
          model: {
            ...model,
            tabs: next.model,
            ...(selection === undefined ? {} : { selectedTab: selection }),
          },
          commands: Command.mapMessages(next.commands ?? [], nextMessage =>
            PreviewMessage.GotTabsMessage({ message: nextMessage }),
          ),
        }
      }
      case 'ToggledJobRow':
        return {
          model: {
            ...model,
            selectedRows: message.isChecked
              ? [...model.selectedRows, message.id]
              : model.selectedRows.filter(id => id !== message.id),
          },
        }
      case 'ClickedDeselectAll':
        return { model: { ...model, selectedRows: [] } }
      case 'ChangedSearch':
        return { model: { ...model, search: message.value } }
      case 'GotFilterSelectMessage': {
        const next = Select.update(
          model.filterSelects[message.field],
          message.message,
        )
        return {
          model: {
            ...model,
            filterSelects: {
              ...model.filterSelects,
              [message.field]: next.model,
            },
            ...(next.outMessage?._tag === 'Selected'
              ? { [message.field]: next.outMessage.value }
              : {}),
          },
          commands: Command.mapMessages(next.commands ?? [], messageNext =>
            PreviewMessage.GotFilterSelectMessage({
              field: message.field,
              message: messageNext,
            }),
          ),
        }
      }
      case 'ClickedClearFilters':
        return {
          model: {
            ...model,
            search: '',
            status: '',
            priority: '',
            customer: '',
          },
        }
    }
  },
  view: (index, model, h) => {
    const fixture = toolbarFixtures[index] ?? toolbarFixtures[0]
    return bodyFor(fixture, model, h)
  },
})
