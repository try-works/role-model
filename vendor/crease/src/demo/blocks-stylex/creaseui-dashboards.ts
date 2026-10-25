import type { Html, HtmlBuilder } from 'foldkit/html'

import { badge } from '@/stylex/badge'
import { button } from '@/stylex/button'
import type { ChartMessage } from '@/stylex/integrations/echarts'
import {
  box,
  dashboardShell,
  grid,
  inline,
  masterDetailPage,
  metricGrid,
  section,
  stack,
  tableRegion,
  text,
  toolbar,
} from '@/stylex/composition'
import { icon } from '@/stylex/composition/icon'
import {
  item,
  itemContent,
  itemDescription,
  itemGroup,
  itemMedia,
  itemTitle,
} from '@/stylex/item'
import { progress } from '@/stylex/progress'
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
} from '@/stylex/sidebar'
import {
  table,
  tableBody,
  tableCell,
  tableHead,
  tableHeader,
  tableRow,
} from '@/stylex/table'
import {
  cohortConversionChart,
  executiveCustomerChart,
  executiveRevenueChart,
  projectBurndownChart,
  projectProgressChart,
  serviceLatencyChart,
  serviceRequestChart,
} from './dashboard-echarts'

const dashboardNavigation = <Message>(
  active: string,
  h: HtmlBuilder<Message>,
): Html =>
  sidebar(
    {
      children: [
        sidebarHeader(
          {
            children: [
              inline(
                {
                  align: 'center',
                  children: [
                    badge({ children: ['OS'] }, h),
                    text({ children: ['Orbit Studio'], variant: 'label' }, h),
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
                    sidebarGroupLabel({ children: ['Workspace'] }, h),
                    sidebarGroupContent(
                      {
                        children: [
                          sidebarMenu(
                            {
                              children: [
                                'Overview',
                                'Growth',
                                'Projects',
                                'Services',
                                'Incidents',
                              ].map(label =>
                                sidebarMenuItem(
                                  {
                                    children: [
                                      sidebarMenuButton(
                                        {
                                          children: [
                                            icon(
                                              {
                                                name:
                                                  label === 'Overview'
                                                    ? 'gauge'
                                                    : label === 'Growth'
                                                      ? 'chart-pie'
                                                      : label === 'Projects'
                                                        ? 'file'
                                                        : label === 'Services'
                                                          ? 'square-terminal'
                                                          : 'circle-alert',
                                              },
                                              h,
                                            ),
                                            label,
                                          ],
                                          isActive: label === active,
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
                                  { children: ['AL'], variant: 'outline' },
                                  h,
                                ),
                                'Alex Lee',
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
  )

const pageHeader = <Message>(
  title: string,
  description: string,
  actions: ReadonlyArray<Html>,
  h: HtmlBuilder<Message>,
): Html =>
  inline(
    {
      align: 'center',
      children: [
        stack(
          {
            children: [
              text({ as: 'h1', children: [title], variant: 'headingMd' }, h),
              text(
                {
                  as: 'p',
                  children: [description],
                  tone: 'secondary',
                  variant: 'caption',
                },
                h,
              ),
            ],
            gap: 'xs',
          },
          h,
        ),
        inline(
          { align: 'center', children: actions, gap: 'sm', wrap: true },
          h,
        ),
      ],
      justify: 'between',
      width: 'full',
      wrap: true,
    },
    h,
  )

const metric = <Message>(
  label: string,
  value: string,
  delta: string,
  status: 'good' | 'watch',
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
                  children: [
                    text(
                      {
                        children: [label],
                        tone: 'secondary',
                        variant: 'caption',
                      },
                      h,
                    ),
                    badge(
                      {
                        children: [delta],
                        variant: status === 'good' ? 'secondary' : 'outline',
                      },
                      h,
                    ),
                  ],
                  justify: 'between',
                  width: 'full',
                },
                h,
              ),
              text(
                { children: [value], numeric: 'tabular', variant: 'headingMd' },
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

const dataTable = <Message>(
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<Html | string>>,
  h: HtmlBuilder<Message>,
): Html =>
  table(
    {
      children: [
        tableHeader(
          {
            children: [
              tableRow(
                {
                  children: headers.map(header =>
                    tableHead({ children: [header] }, h),
                  ),
                },
                h,
              ),
            ],
          },
          h,
        ),
        tableBody(
          {
            children: rows.map(row =>
              tableRow(
                {
                  children: row.map(cell => tableCell({ children: [cell] }, h)),
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

const titledChart = <Message>(
  title: string,
  description: string,
  chart: Html,
  h: HtmlBuilder<Message>,
): Html =>
  section(
    { children: [chart], description, heading: title, surface: 'card' },
    h,
  )

const narrative = <Message>(
  title: string,
  body: string,
  iconName: string,
  h: HtmlBuilder<Message>,
): Html =>
  item(
    {
      children: [
        itemMedia(
          { children: [icon({ name: iconName }, h)], variant: 'icon' },
          h,
        ),
        itemContent(
          {
            children: [
              itemTitle({ children: [title] }, h),
              itemDescription({ children: [body] }, h),
            ],
          },
          h,
        ),
      ],
      size: 'sm',
    },
    h,
  )

export const executiveSummaryDashboard = <Message>(
  toMessage: (message: ChartMessage) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  masterDetailPage(
    {
      detail: section(
        {
          children: [
            itemGroup(
              {
                children: [
                  narrative(
                    'Enterprise expansion',
                    'Pipeline growth is concentrated in larger annual contracts.',
                    'house',
                    h,
                  ),
                  narrative(
                    'Retention improved',
                    'Activation changes reduced early churn by 1.8 points.',
                    'refresh-cw',
                    h,
                  ),
                  narrative(
                    'Margin watch',
                    'Infrastructure costs grew faster than usage in Europe.',
                    'circle-alert',
                    h,
                  ),
                ],
                spacing: 'md',
              },
              h,
            ),
          ],
          description: 'Generated from weekly operating data',
          heading: 'What changed & why',
          surface: 'plain',
        },
        h,
      ),
      detailBehavior: 'stack',
      header: [
        pageHeader(
          'Executive summary',
          'Quarterly business review · updated 12 minutes ago',
          [
            button({ children: ['Week'], size: 'sm', variant: 'ghost' }, h),
            button(
              { children: ['Quarter'], size: 'sm', variant: 'secondary' },
              h,
            ),
            button({ children: ['Export'], size: 'sm', variant: 'outline' }, h),
          ],
          h,
        ),
      ],
      master: [
        metricGrid(
          {
            children: [
              metric('Revenue', '$4.82M', '+8.4% QoQ', 'good', h),
              metric('Gross margin', '71.2%', '-0.6 pts', 'watch', h),
              metric('Net retention', '118%', '+3.1 pts', 'good', h),
              metric('Pipeline', '$12.4M', '+16% QoQ', 'good', h),
            ],
          },
          h,
        ),
        section(
          {
            children: [
              stack(
                {
                  children: [
                    ['Expand enterprise', 78],
                    ['Improve activation', 64],
                    ['Reduce infrastructure cost', 41],
                  ].map(([label, value]) =>
                    stack(
                      {
                        children: [
                          inline(
                            {
                              children: [
                                text(
                                  {
                                    children: [String(label)],
                                    variant: 'label',
                                  },
                                  h,
                                ),
                                text(
                                  {
                                    children: [`${String(value)}%`],
                                    numeric: 'tabular',
                                    tone: 'secondary',
                                    variant: 'caption',
                                  },
                                  h,
                                ),
                              ],
                              justify: 'between',
                              width: 'full',
                            },
                            h,
                          ),
                          progress(
                            {
                              ariaLabel: `${String(label)} objective progress`,
                              value: Number(value),
                            },
                            h,
                          ),
                        ],
                        gap: 'xs',
                      },
                      h,
                    ),
                  ),
                  gap: 'md',
                },
                h,
              ),
            ],
            description:
              'Company objectives weighted by expected business impact',
            heading: 'Objective attainment',
            surface: 'card',
          },
          h,
        ),
        grid(
          {
            children: [
              titledChart(
                'Revenue trend',
                'Trailing eight periods',
                executiveRevenueChart(toMessage, h),
                h,
              ),
              titledChart(
                'Customer growth',
                'New accounts by period',
                executiveCustomerChart(toMessage, h),
                h,
              ),
            ],
            columns: 'two',
            gap: 'md',
            width: 'full',
          },
          h,
        ),
      ],
      theme: 'expressive',
    },
    h,
  )

export const cohortFunnelDashboard = <Message>(
  toMessage: (message: ChartMessage) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  dashboardShell(
    {
      content: [
        metricGrid(
          {
            children: [
              metric('Visitor → signup', '14.8%', '+1.2 pts', 'good', h),
              metric('Signup → active', '62.4%', '+4.8 pts', 'good', h),
              metric('Active → paid', '18.1%', '-0.9 pts', 'watch', h),
              metric('Overall conversion', '1.67%', '+0.2 pts', 'good', h),
            ],
          },
          h,
        ),
        section(
          {
            children: [
              stack(
                {
                  children: [
                    ['Visited', 100],
                    ['Signed up', 72],
                    ['Activated', 48],
                    ['Subscribed', 21],
                  ].map(([label, value]) =>
                    stack(
                      {
                        children: [
                          inline(
                            {
                              children: [
                                text(
                                  {
                                    children: [String(label)],
                                    variant: 'label',
                                  },
                                  h,
                                ),
                                text(
                                  {
                                    children: [`${String(value)}k`],
                                    numeric: 'tabular',
                                    tone: 'secondary',
                                    variant: 'caption',
                                  },
                                  h,
                                ),
                              ],
                              justify: 'between',
                              width: 'full',
                            },
                            h,
                          ),
                          progress(
                            {
                              ariaLabel: `${String(label)} funnel stage`,
                              value: Number(value),
                            },
                            h,
                          ),
                        ],
                        gap: 'xs',
                      },
                      h,
                    ),
                  ),
                  gap: 'md',
                },
                h,
              ),
            ],
            description: 'Last 30 days · all acquisition channels',
            heading: 'Conversion funnel',
            surface: 'card',
          },
          h,
        ),
        titledChart(
          'Conversion over time',
          'Weekly visitor-to-paid conversion',
          cohortConversionChart(toMessage, h),
          h,
        ),
        tableRegion(
          {
            children: [
              dataTable(
                ['Cohort', 'Week 0', 'Week 1', 'Week 2', 'Week 3'],
                [
                  [
                    'Aug 04',
                    badge({ children: ['100%'] }, h),
                    badge({ children: ['68%'], variant: 'secondary' }, h),
                    '51%',
                    '43%',
                  ],
                  [
                    'Aug 11',
                    badge({ children: ['100%'] }, h),
                    badge({ children: ['71%'], variant: 'secondary' }, h),
                    '55%',
                    '—',
                  ],
                  [
                    'Aug 18',
                    badge({ children: ['100%'] }, h),
                    badge({ children: ['74%'], variant: 'secondary' }, h),
                    '—',
                    '—',
                  ],
                ],
                h,
              ),
            ],
            description: 'Weekly activation retention',
            heading: 'Cohort retention',
          },
          h,
        ),
      ],
      header: [
        pageHeader(
          'Growth funnel',
          'Acquisition and retention performance',
          [
            button(
              { children: ['30 days'], size: 'sm', variant: 'secondary' },
              h,
            ),
            button(
              { children: ['All segments'], size: 'sm', variant: 'outline' },
              h,
            ),
          ],
          h,
        ),
      ],
      navigation: dashboardNavigation('Growth', h),
      theme: 'comfortable',
    },
    h,
  )

export const projectStatusDashboard = <Message>(
  toMessage: (message: ChartMessage) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  dashboardShell(
    {
      content: [
        grid(
          {
            children: [
              titledChart(
                'Task progress',
                'Weighted by story points · 68% complete',
                projectProgressChart(toMessage, h),
                h,
              ),
              titledChart(
                'Scope burndown',
                'Remaining story points',
                projectBurndownChart(toMessage, h),
                h,
              ),
            ],
            columns: 'two',
            gap: 'md',
            width: 'full',
          },
          h,
        ),
        section(
          {
            children: [
              stack(
                {
                  children: [
                    ['Foundation', 100, 'Done'],
                    ['Private beta', 76, 'On track'],
                    ['General availability', 34, 'At risk'],
                  ].map(([label, value, status]) =>
                    stack(
                      {
                        children: [
                          inline(
                            {
                              children: [
                                text(
                                  {
                                    children: [String(label)],
                                    variant: 'label',
                                  },
                                  h,
                                ),
                                badge(
                                  {
                                    children: [String(status)],
                                    variant:
                                      status === 'At risk'
                                        ? 'outline'
                                        : 'secondary',
                                  },
                                  h,
                                ),
                              ],
                              justify: 'between',
                              width: 'full',
                            },
                            h,
                          ),
                          progress(
                            {
                              ariaLabel: `${String(label)} milestone progress`,
                              value: Number(value),
                            },
                            h,
                          ),
                        ],
                        gap: 'xs',
                      },
                      h,
                    ),
                  ),
                  gap: 'md',
                },
                h,
              ),
            ],
            description: 'Release milestones and completion',
            heading: 'Launch timeline',
            surface: 'card',
          },
          h,
        ),
        tableRegion(
          {
            children: [
              dataTable(
                ['Workstream', 'Owner', 'Complete', 'Due', 'Status'],
                [
                  [
                    'Core platform',
                    'Maya Chen',
                    '82%',
                    'Sep 12',
                    badge({ children: ['On track'], variant: 'secondary' }, h),
                  ],
                  [
                    'Migration tooling',
                    'Ibrahim Noor',
                    '63%',
                    'Sep 18',
                    badge({ children: ['Watch'], variant: 'outline' }, h),
                  ],
                  [
                    'Documentation',
                    'Jo Park',
                    '48%',
                    'Sep 24',
                    badge({ children: ['On track'], variant: 'secondary' }, h),
                  ],
                  [
                    'Partner rollout',
                    'Ana Silva',
                    '29%',
                    'Oct 03',
                    badge({ children: ['Blocked'], variant: 'destructive' }, h),
                  ],
                ],
                h,
              ),
            ],
            heading: 'Workstreams',
            toolbar: [
              toolbar(
                {
                  children: [
                    inline(
                      {
                        children: [
                          button(
                            {
                              children: ['All'],
                              size: 'sm',
                              variant: 'secondary',
                            },
                            h,
                          ),
                          button(
                            {
                              children: ['Beta'],
                              size: 'sm',
                              variant: 'ghost',
                            },
                            h,
                          ),
                          button(
                            { children: ['GA'], size: 'sm', variant: 'ghost' },
                            h,
                          ),
                        ],
                        gap: 'xs',
                      },
                      h,
                    ),
                  ],
                  label: 'Release phase',
                },
                h,
              ),
            ],
          },
          h,
        ),
        section(
          {
            children: [
              itemGroup(
                {
                  children: [
                    narrative(
                      'Partner API approval',
                      'External review is two days behind the launch plan.',
                      'circle-alert',
                      h,
                    ),
                    narrative(
                      'Migration throughput',
                      'Large accounts need a second batch window.',
                      'timer',
                      h,
                    ),
                  ],
                  spacing: 'md',
                },
                h,
              ),
            ],
            heading: 'Blockers & risks',
            surface: 'card',
          },
          h,
        ),
      ],
      header: [
        pageHeader(
          'Project Atlas',
          'Launch status · General availability',
          [
            button(
              { children: ['Phase: All'], size: 'sm', variant: 'outline' },
              h,
            ),
            button({ children: ['Update status'], size: 'sm' }, h),
          ],
          h,
        ),
      ],
      navigation: dashboardNavigation('Projects', h),
    },
    h,
  )

export const serviceMonitoringDashboard = <Message>(
  toMessage: (message: ChartMessage) => Message,
  h: HtmlBuilder<Message>,
): Html =>
  masterDetailPage(
    {
      detail: stack(
        {
          children: [
            section(
              {
                children: [
                  itemGroup(
                    {
                      children: [
                        narrative(
                          'Elevated latency',
                          'api-eu-west · started 8m ago',
                          'circle-alert',
                          h,
                        ),
                        narrative(
                          'Queue saturation',
                          'worker-billing · started 21m ago',
                          'circle-alert',
                          h,
                        ),
                      ],
                      spacing: 'md',
                    },
                    h,
                  ),
                ],
                heading: 'Active alerts',
              },
              h,
            ),
            section(
              {
                children: [
                  itemGroup(
                    {
                      children: [
                        ['API gateway', '99.99%', 'Healthy'],
                        ['Billing worker', '98.72%', 'Degraded'],
                        ['Search index', '99.91%', 'Healthy'],
                        ['Email delivery', '99.43%', 'Watch'],
                      ].map(([name, uptime, status]) =>
                        item(
                          {
                            children: [
                              itemContent(
                                {
                                  children: [
                                    itemTitle({ children: [String(name)] }, h),
                                    itemDescription(
                                      { children: [String(uptime)] },
                                      h,
                                    ),
                                  ],
                                },
                                h,
                              ),
                              badge(
                                {
                                  children: [String(status)],
                                  variant:
                                    status === 'Healthy'
                                      ? 'secondary'
                                      : 'outline',
                                },
                                h,
                              ),
                            ],
                            size: 'sm',
                          },
                          h,
                        ),
                      ),
                      spacing: 'md',
                    },
                    h,
                  ),
                ],
                heading: 'Service health',
              },
              h,
            ),
          ],
          gap: 'lg',
        },
        h,
      ),
      detailBehavior: 'stack',
      header: [
        pageHeader(
          'Service monitoring',
          'Production · all systems checked 34 seconds ago',
          [
            button({ children: ['1h'], size: 'sm', variant: 'secondary' }, h),
            button({ children: ['1d'], size: 'sm', variant: 'ghost' }, h),
            button(
              { children: ['Region: Global'], size: 'sm', variant: 'outline' },
              h,
            ),
          ],
          h,
        ),
      ],
      master: [
        metricGrid(
          {
            children: [
              metric('Availability', '99.94%', '+0.02 pts', 'good', h),
              metric('P95 latency', '184ms', '+31ms', 'watch', h),
              metric('Requests', '28.4k/s', '+12%', 'good', h),
              metric('Error rate', '0.18%', '+0.06 pts', 'watch', h),
            ],
          },
          h,
        ),
        grid(
          {
            children: [
              titledChart(
                'Request volume',
                'Requests per second',
                serviceRequestChart(toMessage, h),
                h,
              ),
              titledChart(
                'P95 latency',
                'Milliseconds by interval',
                serviceLatencyChart(toMessage, h),
                h,
              ),
            ],
            columns: 'two',
            gap: 'md',
            width: 'full',
          },
          h,
        ),
      ],
      theme: 'compact',
    },
    h,
  )

export const incidentConsoleDashboard = <Message>(
  h: HtmlBuilder<Message>,
): Html =>
  masterDetailPage(
    {
      detail: section(
        {
          children: [
            stack(
              {
                children: [
                  inline(
                    {
                      children: [
                        text(
                          {
                            children: ['Severity'],
                            tone: 'secondary',
                            variant: 'caption',
                          },
                          h,
                        ),
                        badge(
                          { children: ['SEV-1'], variant: 'destructive' },
                          h,
                        ),
                      ],
                      justify: 'between',
                      width: 'full',
                    },
                    h,
                  ),
                  inline(
                    {
                      children: [
                        text(
                          {
                            children: ['Owner'],
                            tone: 'secondary',
                            variant: 'caption',
                          },
                          h,
                        ),
                        text(
                          { children: ['On-call Platform'], variant: 'label' },
                          h,
                        ),
                      ],
                      justify: 'between',
                      width: 'full',
                    },
                    h,
                  ),
                  inline(
                    {
                      children: [
                        text(
                          {
                            children: ['Started'],
                            tone: 'secondary',
                            variant: 'caption',
                          },
                          h,
                        ),
                        text({ children: ['14:32 UTC'], variant: 'label' }, h),
                      ],
                      justify: 'between',
                      width: 'full',
                    },
                    h,
                  ),
                  itemGroup(
                    {
                      children: [
                        narrative(
                          '14:47',
                          'Traffic shifted away from eu-west-1.',
                          'repeat',
                          h,
                        ),
                        narrative(
                          '14:39',
                          'Database connection pool reached capacity.',
                          'file',
                          h,
                        ),
                        narrative(
                          '14:32',
                          'Latency alert triggered for checkout API.',
                          'circle-alert',
                          h,
                        ),
                      ],
                      spacing: 'md',
                    },
                    h,
                  ),
                ],
                gap: 'md',
              },
              h,
            ),
          ],
          description: 'Checkout API latency',
          heading: 'Incident INC-2048',
          surface: 'plain',
        },
        h,
      ),
      header: [
        pageHeader(
          'Incident console',
          '6 active · 2 require attention',
          [
            button({ children: ['All'], size: 'sm', variant: 'secondary' }, h),
            button(
              { children: ['Triggered'], size: 'sm', variant: 'ghost' },
              h,
            ),
            button({ children: ['Create incident'], size: 'sm' }, h),
          ],
          h,
        ),
      ],
      master: [
        tableRegion(
          {
            children: [
              dataTable(
                ['Incident', 'Service', 'Severity', 'Status', 'Duration'],
                [
                  [
                    'INC-2048 Checkout latency',
                    'api-checkout',
                    badge({ children: ['SEV-1'], variant: 'destructive' }, h),
                    'Investigating',
                    '26m',
                  ],
                  [
                    'INC-2047 Delayed invoices',
                    'worker-billing',
                    badge({ children: ['SEV-2'], variant: 'outline' }, h),
                    'Mitigating',
                    '43m',
                  ],
                  [
                    'INC-2044 Search freshness',
                    'search-index',
                    badge({ children: ['SEV-3'], variant: 'secondary' }, h),
                    'Monitoring',
                    '2h 14m',
                  ],
                  [
                    'INC-2041 Email retries',
                    'email-delivery',
                    badge({ children: ['SEV-3'], variant: 'secondary' }, h),
                    'Resolved',
                    '3h 02m',
                  ],
                ],
                h,
              ),
            ],
            heading: 'Active incidents',
            toolbar: [
              toolbar(
                {
                  children: [
                    button(
                      {
                        leadingIcon: icon({ name: 'search' }, h),
                        children: ['Search incidents'],
                        size: 'sm',
                        variant: 'outline',
                      },
                      h,
                    ),
                    button(
                      {
                        children: ['Status: Open'],
                        size: 'sm',
                        variant: 'outline',
                      },
                      h,
                    ),
                  ],
                  label: 'Incident filters',
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
      theme: 'compact',
    },
    h,
  )
