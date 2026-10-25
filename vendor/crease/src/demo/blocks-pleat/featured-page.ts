import { taggedStruct } from 'foldkit/schema'
import { defineView } from 'foldkit/submodel'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { Option, Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { Command, Subscription } from 'foldkit'

import { loginArtwork } from '@/pleat/composition/login-artwork'
import { badge } from '@/pleat/badge'
import { button } from '@/pleat/button'
import * as TableState from '@/lib/data-table-state'
import { sliderSubscriptions as tablecnSliderSubscriptions } from '@/lib/data-table-state'
import { fieldSeparator } from '@/pleat/field'
import { input } from '@/pleat/input'
import { icon } from '@/pleat/composition/icon'
import * as ECharts from '@/pleat/integrations/echarts'
import * as RadioGroup from '@/pleat/radio-group'
import { dataTable, type DataTableColumn } from '@/pleat/data-table'
import {
  box,
  dashboardShell,
  grid,
  inline,
  metricGrid,
  section,
  stack,
  tableRegion,
  text,
  toolbar,
} from '@/pleat/composition'
import {
  sidebar,
  sidebarContent,
  sidebarFooter,
  sidebarGroup,
  sidebarGroupContent,
  sidebarGroupLabel,
  sidebarHeader,
  sidebarMenu,
  sidebarMenuButton,
  sidebarMenuItem,
} from '@/pleat/sidebar'
import {
  cohortFunnelDashboard,
  executiveSummaryDashboard,
  incidentConsoleDashboard,
  projectStatusDashboard,
  serviceMonitoringDashboard,
} from './creaseui-dashboards'
import {
  cardGrid,
  checkoutForm,
  dataDashboard,
  inboxTable,
  kanbanBoard,
  orderDetail,
} from './creaseui-blocks'
import { appShell } from './app-shell'
import { chartAnalyticsDashboard } from './chart-analytics-dashboard'
import { featuredVisitorsChart } from './dashboard-echarts'
import * as TablecnPage from './tablecn-page'

type Block = Readonly<{
  description: string
  name: string
  preview: (model: Model, h: HtmlBuilder<Message>) => Html
}>

export const Model = S.Struct({
  checkout: S.Record(S.String, S.String),
  delivery: S.String,
  email: S.String,
  kind: S.String,
  mail: S.String,
  mailFilter: S.String,
  password: S.String,
  query: S.String,
  radioGroup: RadioGroup.Model,
  table: TableState.Model,
  tablecn: TablecnPage.Model,
  tablecnGrid: TablecnPage.Model,
})
export type Model = typeof Model.Type
export const ChangedEmail = taggedStruct('ChangedBlockEmail', {
  value: S.String,
})
export const ChangedPassword = taggedStruct('ChangedBlockPassword', {
  value: S.String,
})
export const ChangedQuery = taggedStruct('ChangedBlockQuery', {
  value: S.String,
})
export const ChangedKind = taggedStruct('ChangedBlockKind', {
  value: S.String,
})
export const ClearedCatalogSearch = taggedStruct('ClearedBlockCatalogSearch')
export const ChangedMailFilter = taggedStruct('ChangedBlockMailFilter', {
  value: S.String,
})
export const SelectedMailThread = taggedStruct('SelectedBlockMailThread', {
  id: S.String,
})
export const ChangedCheckoutField = taggedStruct('ChangedCheckoutField', {
  name: S.String,
  value: S.String,
})
export const GotRadioGroupMessage = taggedStruct('GotBlockRadioGroupMessage', {
  message: RadioGroup.Message,
})
export const GotEChartMessage = taggedStruct('GotBlocksStyleXEChartMessage', {
  message: ECharts.ChartMessage,
})
export const GotTablecnMessage = taggedStruct('GotBlockTablecnMessage', {
  message: TablecnPage.Message,
})
export const GotTablecnGridMessage = taggedStruct(
  'GotBlockTablecnGridMessage',
  {
    message: TablecnPage.Message,
  },
)
export const Message = S.Union([
  TableState.Message,
  GotEChartMessage,
  ChangedEmail,
  ChangedPassword,
  ChangedQuery,
  ChangedKind,
  ClearedCatalogSearch,
  ChangedMailFilter,
  SelectedMailThread,
  ChangedCheckoutField,
  GotRadioGroupMessage,
  GotTablecnMessage,
  GotTablecnGridMessage,
])
export type Message = typeof Message.Type
export const init = (): Model => ({
  checkout: {},
  delivery: 'standard',
  email: '',
  kind: 'all',
  mail: 'nora',
  mailFilter: 'all',
  password: '',
  query: '',
  radioGroup: RadioGroup.init({ id: 'checkout-delivery' }),
  table: TableState.init(10),
  tablecn: TablecnPage.init(),
  tablecnGrid: TablecnPage.init('data-grid'),
})
type UpdateReturn = Update.Return<Model, Message>

/* Est. Hours range-slider thumb drags inside the tablecn blocks. */
export const subscriptions = Subscription.aggregate<Model, Message>()(
  Subscription.lift(
    tablecnSliderSubscriptions('estimatedHours', 'featuredPlTablecnHours'),
  )<Model, Message>({
    toChildModel: model => model.tablecn.table,
    toParentMessage: message => GotTablecnMessage({ message }),
  }),
  Subscription.lift(
    tablecnSliderSubscriptions('estimatedHours', 'featuredPlTablecnGridHours'),
  )<Model, Message>({
    toChildModel: model => model.tablecnGrid.table,
    toParentMessage: message => GotTablecnGridMessage({ message }),
  }),
)

export const update = (model: Model, message: Message): UpdateReturn => {
  if (message._tag === 'GotBlocksStyleXEChartMessage') return { model: model }
  if (message._tag === 'GotBlockTablecnMessage') {
    const { model: tablecn, commands: tablecnCommands__ } = TablecnPage.update(
      model.tablecn,
      message.message,
    )
    return {
      model: { ...model, tablecn },
      commands: Command.mapMessages(tablecnCommands__ ?? [], childMessage =>
        GotTablecnMessage({ message: childMessage }),
      ),
    }
  }
  if (message._tag === 'GotBlockTablecnGridMessage') {
    const { model: tablecnGrid, commands: tablecnGridCommands__ } =
      TablecnPage.update(model.tablecnGrid, message.message)
    return {
      model: { ...model, tablecnGrid },
      commands: Command.mapMessages(tablecnGridCommands__ ?? [], childMessage =>
        GotTablecnGridMessage({ message: childMessage }),
      ),
    }
  }
  if (message._tag === 'ChangedBlockEmail')
    return { model: { ...model, email: message.value } }
  if (message._tag === 'ChangedBlockPassword')
    return { model: { ...model, password: message.value } }
  if (message._tag === 'ChangedBlockQuery')
    return { model: { ...model, query: message.value } }
  if (message._tag === 'ChangedBlockKind')
    return { model: { ...model, kind: message.value } }
  if (message._tag === 'ClearedBlockCatalogSearch')
    return { model: { ...model, kind: 'all', query: '' } }
  if (message._tag === 'ChangedBlockMailFilter')
    return { model: { ...model, mailFilter: message.value } }
  if (message._tag === 'SelectedBlockMailThread')
    return { model: { ...model, mail: message.id } }
  if (message._tag === 'ChangedCheckoutField')
    return {
      model: {
        ...model,
        checkout: { ...model.checkout, [message.name]: message.value },
      },
    }
  if (message._tag === 'GotBlockRadioGroupMessage') {
    const {
      model: radioGroup,
      commands: radioGroupCommands__,
      outMessage: radioGroupOut__,
    } = RadioGroup.update(model.radioGroup, message.message)
    const commands = radioGroupCommands__ ?? []
    const maybeSelection = Option.fromNullishOr(radioGroupOut__)
    return {
      model: {
        ...model,
        delivery: Option.match(maybeSelection, {
          onNone: () => model.delivery,
          onSome: selection => selection.value,
        }),
        radioGroup,
      },
      commands: Command.mapMessages(commands, childMessage =>
        GotRadioGroupMessage({ message: childMessage }),
      ),
    }
  }
  return {
    model: { ...model, table: TableState.update(model.table, message).model },
  }
}

const metricCard = <Message>(
  label: string,
  value: string,
  change: string,
  trend: string,
  detail: string,
  h: HtmlBuilder<Message>,
): Html =>
  box(
    {
      children: [
        stack(
          {
            children: [
              inline(
                {
                  align: 'center',
                  children: [
                    text(
                      {
                        children: [label],
                        tone: 'secondary',
                        variant: 'caption',
                      },
                      h,
                    ),
                    badge({ children: [change], variant: 'outline' }, h),
                  ],
                  justify: 'between',
                  width: 'full',
                },
                h,
              ),
              text({ as: 'div', children: [value], variant: 'headingMd' }, h),
              text({ children: [trend], variant: 'label' }, h),
              text(
                { children: [detail], tone: 'secondary', variant: 'caption' },
                h,
              ),
            ],
            gap: 'sm',
          },
          h,
        ),
      ],
      padding: 'md',
      radius: 'lg',
      surface: 'card',
    },
    h,
  )

type DashboardRow = Readonly<{
  header: string
  id: string
  reviewer: string
  status: 'Done' | 'In Process' | 'Not Started'
  target: number
  type: string
}>

const dashboardRows: ReadonlyArray<DashboardRow> = [
  {
    id: '1',
    header: 'Cover page',
    type: 'Cover page',
    status: 'In Process',
    target: 18,
    reviewer: 'Eddie Lake',
  },
  {
    id: '2',
    header: 'Table of contents',
    type: 'Table of contents',
    status: 'Done',
    target: 29,
    reviewer: 'Jamik Tashpulatov',
  },
  {
    id: '3',
    header: 'Executive summary',
    type: 'Narrative',
    status: 'Done',
    target: 10,
    reviewer: 'Assign reviewer',
  },
  {
    id: '4',
    header: 'Technical approach',
    type: 'Narrative',
    status: 'Done',
    target: 27,
    reviewer: 'Eddie Lake',
  },
  {
    id: '5',
    header: 'Design',
    type: 'Narrative',
    status: 'In Process',
    target: 2,
    reviewer: 'Assign reviewer',
  },
  {
    id: '6',
    header: 'Capabilities',
    type: 'Narrative',
    status: 'Not Started',
    target: 20,
    reviewer: 'Jamik Tashpulatov',
  },
  {
    id: '7',
    header: 'Integration plan',
    type: 'Narrative',
    status: 'In Process',
    target: 19,
    reviewer: 'Eddie Lake',
  },
  {
    id: '8',
    header: 'Appendix',
    type: 'Appendix',
    status: 'Not Started',
    target: 12,
    reviewer: 'Assign reviewer',
  },
]

const dashboardColumns = (
  h: HtmlBuilder<Message>,
): ReadonlyArray<DataTableColumn<DashboardRow>> => [
  {
    key: 'header',
    header: 'Header',
    cell: row => row.header,
    sortValue: row => row.header,
  },
  {
    key: 'type',
    header: 'Section Type',
    cell: row =>
      text({ children: [row.type], tone: 'secondary', variant: 'caption' }, h),
  },
  {
    key: 'status',
    header: 'Status',
    cell: row =>
      badge(
        {
          children: [row.status],
          variant: row.status === 'Done' ? 'secondary' : 'outline',
        },
        h,
      ),
  },
  {
    key: 'target',
    header: 'Target',
    cell: row => String(row.target),
    sortValue: row => row.target,
  },
  { key: 'reviewer', header: 'Reviewer', cell: row => row.reviewer },
  {
    key: 'actions',
    header: '',
    cell: () =>
      button(
        {
          children: [
            icon({ ariaLabel: 'Open row actions', name: 'ellipsis' }, h),
          ],
          size: 'icon',
          variant: 'ghost',
        },
        h,
      ),
    isHideable: false,
  },
]

const dashboardTable = (model: Model, h: HtmlBuilder<Message>): Html =>
  dataTable<DashboardRow, Message>(
    {
      ariaLabel: 'Document sections',
      columns: dashboardColumns(h),
      enableColumnVisibility: true,
      enableRowSelection: true,
      filterPlaceholder: 'Filter sections…',
      model: model.table,
      pageSizeOptions: [5, 10, 20],
      rowKey: row => row.id,
      rows: dashboardRows,
      toParentMessage: message => message,
    },
    h,
  )

const dashboard = (model: Model, h: HtmlBuilder<Message>): Html =>
  dashboardShell(
    {
      navigation: sidebar(
        {
          children: [
            sidebarHeader(
              {
                children: [
                  inline(
                    {
                      align: 'center',
                      children: [
                        badge({ children: ['A'], variant: 'default' }, h),
                        text({ children: ['Acme Inc.'], variant: 'label' }, h),
                      ],
                      gap: 'sm',
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            sidebarContent(
              {
                children: [
                  sidebarGroup(
                    {
                      children: [
                        sidebarGroupContent(
                          {
                            children: [
                              sidebarMenu(
                                {
                                  children: [
                                    sidebarMenuItem(
                                      {
                                        children: [
                                          sidebarMenuButton(
                                            {
                                              children: [
                                                icon(
                                                  { name: 'circle-plus' },
                                                  h,
                                                ),
                                                'Quick Create',
                                              ],
                                              variant: 'primary',
                                            },
                                            h,
                                          ),
                                        ],
                                      },
                                      h,
                                    ),
                                  ],
                                },
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                  sidebarGroup(
                    {
                      children: [
                        sidebarGroupLabel({ children: ['Platform'] }, h),
                        sidebarGroupContent(
                          {
                            children: [
                              sidebarMenu(
                                {
                                  children: [
                                    ['Dashboard', 'gauge'],
                                    ['Lifecycle', 'list'],
                                    ['Analytics', 'radar'],
                                    ['Projects', 'file'],
                                    ['Team', 'group'],
                                  ].map(([label, iconName], index) =>
                                    sidebarMenuItem(
                                      {
                                        children: [
                                          sidebarMenuButton(
                                            {
                                              children: [
                                                icon(
                                                  {
                                                    name: iconName ?? 'circle',
                                                  },
                                                  h,
                                                ),
                                                label ?? '',
                                              ],
                                              isActive: index === 0,
                                            },
                                            h,
                                          ),
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
                        ),
                      ],
                    },
                    h,
                  ),
                  sidebarGroup(
                    {
                      children: [
                        sidebarGroupLabel({ children: ['Documents'] }, h),
                        sidebarGroupContent(
                          {
                            children: [
                              sidebarMenu(
                                {
                                  children: [
                                    ['Data Library', 'database'],
                                    ['Reports', 'file-chart-column'],
                                    ['Word Assistant', 'file-pen-line'],
                                  ].map(([label, iconName]) =>
                                    sidebarMenuItem(
                                      {
                                        children: [
                                          sidebarMenuButton(
                                            {
                                              children: [
                                                icon(
                                                  { name: iconName ?? 'file' },
                                                  h,
                                                ),
                                                label ?? '',
                                              ],
                                            },
                                            h,
                                          ),
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
                        ),
                      ],
                      spacing: 'later',
                    },
                    h,
                  ),
                  sidebarGroup(
                    {
                      children: [
                        sidebarGroupContent(
                          {
                            children: [
                              sidebarMenu(
                                {
                                  children: [
                                    ['Settings', 'settings-2'],
                                    ['Get Help', 'circle-question-mark'],
                                    ['Search', 'search'],
                                  ].map(([label, iconName]) =>
                                    sidebarMenuItem(
                                      {
                                        children: [
                                          sidebarMenuButton(
                                            {
                                              children: [
                                                icon(
                                                  {
                                                    name: iconName ?? 'circle',
                                                  },
                                                  h,
                                                ),
                                                label ?? '',
                                              ],
                                            },
                                            h,
                                          ),
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
                        ),
                      ],
                      spacing: 'later',
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            sidebarFooter(
              {
                children: [
                  sidebarMenu(
                    {
                      children: [
                        sidebarMenuItem(
                          {
                            children: [
                              sidebarMenuButton(
                                {
                                  children: [
                                    badge(
                                      { children: ['SC'], variant: 'outline' },
                                      h,
                                    ),
                                    stack(
                                      {
                                        children: [
                                          text(
                                            {
                                              children: ['CreaseUI'],
                                              variant: 'label',
                                            },
                                            h,
                                          ),
                                          text(
                                            {
                                              children: ['m@example.com'],
                                              tone: 'secondary',
                                              variant: 'caption',
                                            },
                                            h,
                                          ),
                                        ],
                                        gap: 'none',
                                      },
                                      h,
                                    ),
                                    icon({ name: 'chevrons-up-down' }, h),
                                  ],
                                  size: 'lg',
                                },
                                h,
                              ),
                            ],
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
          ],
          collapsible: 'none',
        },
        h,
      ),
      header: [
        inline(
          {
            children: [
              inline(
                {
                  align: 'center',
                  children: [
                    icon({ name: 'blocks' }, h),
                    text(
                      {
                        as: 'h1',
                        children: ['Documents'],
                        variant: 'headingSm',
                      },
                      h,
                    ),
                  ],
                  gap: 'sm',
                },
                h,
              ),
              button({ children: ['GitHub'], size: 'sm', variant: 'ghost' }, h),
            ],
            align: 'center',
            justify: 'between',
            width: 'full',
          },
          h,
        ),
      ],
      content: [
        metricGrid(
          {
            children: [
              metricCard(
                'Total Revenue',
                '$1,250.00',
                '+12.5%',
                'Trending up this month ↗',
                'Visitors for the last 6 months',
                h,
              ),
              metricCard(
                'New Customers',
                '1,234',
                '-20%',
                'Down 20% this period ↘',
                'Acquisition needs attention',
                h,
              ),
              metricCard(
                'Active Accounts',
                '45,678',
                '+12.5%',
                'Strong user retention ↗',
                'Engagement exceed targets',
                h,
              ),
              metricCard(
                'Growth Rate',
                '4.5%',
                '+4.5%',
                'Steady performance increase ↗',
                'Meets growth projections',
                h,
              ),
            ],
          },
          h,
        ),
        section(
          {
            actions: [
              badge({ children: ['Last 3 months'], variant: 'outline' }, h),
            ],
            children: [
              featuredVisitorsChart(
                message => GotEChartMessage({ message }),
                h,
              ),
            ],
            description: 'Total for the last three months',
            heading: 'Total Visitors',
            surface: 'card',
          },
          h,
        ),
        tableRegion(
          {
            actions: [
              button(
                {
                  leadingIcon: icon({ name: 'sliders-horizontal' }, h),
                  children: ['Customize Columns'],
                  size: 'sm',
                  variant: 'outline',
                },
                h,
              ),
            ],
            children: [dashboardTable(model, h)],
            heading: 'Document sections',
            toolbar: [
              toolbar(
                {
                  children: [
                    inline(
                      {
                        children: [
                          button(
                            {
                              children: ['Outline'],
                              size: 'sm',
                              variant: 'secondary',
                            },
                            h,
                          ),
                          button(
                            {
                              children: ['Past Performance'],
                              size: 'sm',
                              variant: 'ghost',
                            },
                            h,
                          ),
                          button(
                            {
                              children: ['Key Personnel'],
                              size: 'sm',
                              variant: 'ghost',
                            },
                            h,
                          ),
                        ],
                        gap: 'xs',
                        wrap: true,
                      },
                      h,
                    ),
                  ],
                  label: 'Document views',
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
      navigationWidth: 'wide',
    },
    h,
  )

const loginForm = (model: Model, h: HtmlBuilder<Message>): Html =>
  stack(
    {
      align: 'stretch',
      children: [
        stack(
          {
            align: 'center',
            children: [
              text(
                { as: 'h3', children: ['Welcome back'], variant: 'headingMd' },
                h,
              ),
              text(
                {
                  children: ['Login to your Acme Inc account'],
                  tone: 'secondary',
                },
                h,
              ),
            ],
            gap: 'xs',
          },
          h,
        ),
        input(
          {
            id: 'blocks-email',
            label: 'Email',
            onInput: value => ChangedEmail({ value }),
            placeholder: 'm@example.com',
            type: 'email',
            autocomplete: 'email',
            value: model.email,
          },
          h,
        ),
        input(
          {
            id: 'blocks-password',
            label: 'Password',
            onInput: value => ChangedPassword({ value }),
            type: 'password',
            autocomplete: 'current-password',
            value: model.password,
          },
          h,
        ),
        button({ children: ['Login'] }, h),
        fieldSeparator({ children: ['Or continue with'] }, h),
        button(
          {
            leadingIcon: icon({ name: 'code-xml' }, h),
            children: ['Login with GitHub'],
            variant: 'outline',
          },
          h,
        ),
        text(
          {
            align: 'center',
            children: ["Don't have an account? Sign up"],
            variant: 'caption',
          },
          h,
        ),
      ],
      gap: 'md',
      width: 'full',
    },
    h,
  )

const loginMuted = (model: Model, h: HtmlBuilder<Message>): Html =>
  box(
    {
      children: [
        stack(
          {
            align: 'center',
            children: [
              inline(
                {
                  children: [
                    badge({ children: ['A'] }, h),
                    text({ children: ['Acme Inc.'], variant: 'label' }, h),
                  ],
                  gap: 'sm',
                },
                h,
              ),
              box({ children: [loginForm(model, h)], width: 'form' }, h),
            ],
            gap: 'lg',
            width: 'full',
          },
          h,
        ),
      ],
      contentAlignment: 'center',
      minHeight: 'viewport',
      padding: 'md',
      surface: 'muted',
    },
    h,
  )

const loginImage = (model: Model, h: HtmlBuilder<Message>): Html =>
  box(
    {
      children: [
        box(
          {
            children: [
              grid(
                {
                  children: [
                    box(
                      {
                        children: [
                          stack(
                            {
                              align: 'center',
                              children: [
                                box(
                                  {
                                    children: [loginForm(model, h)],
                                    width: 'form',
                                  },
                                  h,
                                ),
                              ],
                              justify: 'center',
                            },
                            h,
                          ),
                        ],
                        minHeight: 'full',
                        padding: 'md',
                        surface: 'page',
                      },
                      h,
                    ),
                    loginArtwork(h),
                  ],
                  columns: 'loginSplit',
                  width: 'full',
                },
                h,
              ),
            ],
            radius: 'lg',
            surface: 'card',
            width: 'login',
          },
          h,
        ),
      ],
      contentAlignment: 'center',
      minHeight: 'viewport',
      padding: 'md',
      surface: 'muted',
    },
    h,
  )

const blocks: ReadonlyArray<Block> = [
  {
    description: 'A dashboard with sidebar, charts and data table.',
    name: 'dashboard-01',
    preview: dashboard,
  },
  {
    description: 'A login page with a muted background color.',
    name: 'login-03',
    preview: (model, h) => loginMuted(model, h),
  },
  {
    description: 'A login page with form and image.',
    name: 'login-04',
    preview: (model, h) => loginImage(model, h),
  },
  {
    description:
      'Executive scorecard, objectives, trends and a narrative insight rail.',
    name: 'creaseui-executive-summary',
    preview: (_model, h) =>
      executiveSummaryDashboard(message => GotEChartMessage({ message }), h),
  },
  {
    description: 'Growth funnel, conversion trend and weekly cohort retention.',
    name: 'creaseui-cohort-funnel',
    preview: (_model, h) =>
      cohortFunnelDashboard(message => GotEChartMessage({ message }), h),
  },
  {
    description:
      'Launch milestones, weighted task progress, workstreams and risks.',
    name: 'creaseui-project-status',
    preview: (_model, h) =>
      projectStatusDashboard(message => GotEChartMessage({ message }), h),
  },
  {
    description:
      'Live service health, traffic metrics and an operational triage rail.',
    name: 'creaseui-service-monitoring',
    preview: (_model, h) =>
      serviceMonitoringDashboard(message => GotEChartMessage({ message }), h),
  },
  {
    description:
      'Dense incident rows with filtering and a dedicated inspector panel.',
    name: 'creaseui-incident-console',
    preview: (_model, h) => incidentConsoleDashboard(h),
  },
  {
    description:
      'Four status lanes of task cards under a shared sprint toolbar.',
    name: 'creaseui-kanban-board',
    preview: (_model, h) => kanbanBoard(h),
  },
  {
    description:
      'A mail queue that indexes a reading pane with a live reply composer.',
    name: 'creaseui-inbox-table',
    preview: (model, h) =>
      inboxTable(
        {
          filter: model.mailFilter,
          onFilter: value => ChangedMailFilter({ value }),
          onSelect: id => SelectedMailThread({ id }),
          selected: model.mail,
        },
        h,
      ),
  },
  {
    description:
      'A single record with line items, totals and an activity rail.',
    name: 'creaseui-order-detail',
    preview: (_model, h) => orderDetail(h),
  },
  {
    description:
      'A sectioned checkout form beside an order summary that recalculates.',
    name: 'creaseui-checkout-form',
    preview: (model, h) =>
      checkoutForm(
        {
          delivery: model.delivery,
          fields: model.checkout,
          onField: (name, value) => ChangedCheckoutField({ name, value }),
          radioGroup: model.radioGroup,
          toRadioGroupMessage: message => GotRadioGroupMessage({ message }),
        },
        h,
      ),
  },
  {
    description:
      'Sparkline tiles with period-over-period deltas and segment breakdowns.',
    name: 'creaseui-data-dashboard',
    preview: (_model, h) =>
      dataDashboard(message => GotEChartMessage({ message }), h),
  },
  {
    description:
      'A browsable catalog grid with search, filter tabs and a real empty state.',
    name: 'creaseui-card-grid',
    preview: (model, h) =>
      cardGrid(
        {
          kind: model.kind,
          onClear: ClearedCatalogSearch(),
          onKind: value => ChangedKind({ value }),
          onQuery: value => ChangedQuery({ value }),
          query: model.query,
        },
        h,
      ),
  },
  {
    description:
      'Real Apache ECharts rendered inside constrained StyleX analytics recipes.',
    name: 'chart-analytics-dashboard',
    preview: (_model, h) =>
      chartAnalyticsDashboard(message => GotEChartMessage({ message }), h),
  },
  {
    description:
      'An app shell with a top navigation, sidebar and elevated content.',
    name: 'app-shell-01',
    preview: (_model, h) => appShell(h),
  },
  {
    description:
      "sadmann7/tablecn's data table with a diceui-style action bar for row multi-select.",
    name: 'tablecn',
    preview: (model, h) =>
      h.submodel({
        slotId: 'tablecn',
        model: model.tablecn,
        view: tablecnView,
        toParentMessage: message => GotTablecnMessage({ message }),
      }),
  },
  {
    description: "sadmann7/tablecn's editable data grid.",
    name: 'tablecn-grid',
    preview: (model, h) =>
      h.submodel({
        slotId: 'tablecn-grid',
        model: model.tablecnGrid,
        view: tablecnView,
        toParentMessage: message => GotTablecnGridMessage({ message }),
      }),
  },
]

const tablecnView = defineView<TablecnPage.Model, TablecnPage.Message>(
  TablecnPage.view,
)

export const viewBlock = (
  model: Model,
  name: string,
  h: HtmlBuilder<Message>,
): Html =>
  blocks.find(block => block.name === name)?.preview(model, h) ?? h.empty
