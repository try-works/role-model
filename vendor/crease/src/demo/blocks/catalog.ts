import { SIDEBAR_BLOCK_IDS } from '@/route'

const BLOCK_DESCRIPTIONS: Readonly<Record<string, string>> = {
  '01': 'A simple sidebar with navigation grouped by section.',
  '02': 'A sidebar with collapsible sections.',
  '03': 'A sidebar with submenus.',
  '04': 'A floating sidebar with submenus.',
  '05': 'A sidebar with collapsible submenus.',
  '06': 'A sidebar with submenus as dropdowns.',
  '07': 'A sidebar that collapses to icons.',
  '08': 'An inset sidebar with secondary navigation.',
  '09': 'Collapsible nested sidebars.',
  '10': 'A sidebar in a popover.',
  '11': 'A sidebar with a collapsible file tree.',
  '12': 'A sidebar with a calendar.',
  '13': 'A sidebar in a dialog.',
  '14': 'A sidebar on the right.',
  '15': 'A left and right sidebar.',
  '16': 'A sidebar with a sticky site header.',
}

export type BlockCategory = 'all' | 'dashboard' | 'sidebar' | 'login' | 'table'
export type BlockDefinition = Readonly<{
  name: string
  description: string
  category: Exclude<BlockCategory, 'all'>
}>
export const BLOCKS: ReadonlyArray<BlockDefinition> = [
  {
    name: 'dashboard-01',
    description: 'A dashboard with sidebar, charts and a document table.',
    category: 'dashboard',
  },
  {
    name: 'creaseui-executive-summary',
    description: 'An executive scorecard with objectives, trends and insights.',
    category: 'dashboard',
  },
  {
    name: 'creaseui-cohort-funnel',
    description:
      'An acquisition funnel with conversion trends and cohort retention.',
    category: 'dashboard',
  },
  {
    name: 'creaseui-project-status',
    description: 'Project milestones, progress, workstreams and risks.',
    category: 'dashboard',
  },
  {
    name: 'creaseui-service-monitoring',
    description: 'Service health, traffic metrics and active alerts.',
    category: 'dashboard',
  },
  {
    name: 'creaseui-incident-console',
    description: 'An incident table with a dedicated inspector panel.',
    category: 'dashboard',
  },
  {
    name: 'creaseui-kanban-board',
    description:
      'Four status lanes of task cards under a shared sprint toolbar.',
    category: 'dashboard',
  },
  {
    name: 'creaseui-inbox-table',
    description:
      'A mail queue that indexes a reading pane with a live reply composer.',
    category: 'dashboard',
  },
  {
    name: 'creaseui-order-detail',
    description:
      'A single record with line items, totals and an activity rail.',
    category: 'dashboard',
  },
  {
    name: 'creaseui-checkout-form',
    description:
      'A sectioned checkout form beside an order summary that recalculates.',
    category: 'dashboard',
  },
  {
    name: 'creaseui-data-dashboard',
    description:
      'Sparkline tiles with period-over-period deltas and segment breakdowns.',
    category: 'dashboard',
  },
  {
    name: 'creaseui-card-grid',
    description:
      'A browsable catalog grid with search, filter tabs and a real empty state.',
    category: 'dashboard',
  },
  {
    name: 'tablecn',
    description:
      "sadmann7/tablecn's data table with a diceui-style action bar for row multi-select.",
    category: 'table',
  },
  {
    name: 'tablecn-grid',
    description: "sadmann7/tablecn's editable data grid.",
    category: 'table',
  },
  {
    name: 'chart-analytics-dashboard',
    description:
      'An analytics dashboard with six Apache ECharts visualizations.',
    category: 'dashboard',
  },
  ...SIDEBAR_BLOCK_IDS.map(id => ({
    name: `sidebar-${id}`,
    description: BLOCK_DESCRIPTIONS[id] ?? '',
    category: 'sidebar' as const,
  })),
  {
    name: 'app-shell-01',
    description:
      'An app shell with a top navigation, sidebar and elevated content.',
    category: 'sidebar',
  },
  {
    name: 'login-03',
    description: 'A centered login form on a muted background.',
    category: 'login',
  },
  {
    name: 'login-04',
    description: 'A split login layout with a form and image panel.',
    category: 'login',
  },
]
export const resolveBlock = (
  blockId: string,
):
  | Readonly<{ renderer: 'tailwind' | 'stylex' | 'pleat'; name: string }>
  | undefined => {
  const [prefix, ...parts] = blockId.split('--')
  const renderer =
    prefix === 'pleat' ? 'pleat' : prefix === 'stylex' ? 'stylex' : 'tailwind'
  const requestedName = parts.length ? parts.join('--') : `sidebar-${blockId}`
  const name = requestedName.replace(/^astryx-/u, 'creaseui-')
  return BLOCKS.some(block => block.name === name)
    ? { renderer, name }
    : undefined
}
