export const RECIPE_NAMES = [
  'dashboard',
  'settings',
  'master-detail',
  'data-explorer',
  'commerce',
] as const

export type RecipeName = (typeof RECIPE_NAMES)[number]
export type TemplateKind = 'page' | 'block'
export type TemplateDensity = 'compact' | 'balanced' | 'spacious'
export type RegionBehavior = 'remain' | 'stack' | 'hide' | 'overlay'

export type TemplateRegion = Readonly<{
  behavior: RegionBehavior
  name: string
  width: 'fill' | 'readable' | 'form' | 'navigation' | 'panel'
}>

export type TemplateDefinition = Readonly<{
  componentsUsed: ReadonlyArray<string>
  density: TemplateDensity
  description: string
  evaluationTasks: ReadonlyArray<string>
  id: string
  kind: TemplateKind
  recipe: RecipeName
  regions: ReadonlyArray<TemplateRegion>
}>

export const templates = [
  {
    componentsUsed: ['Sidebar', 'Card', 'Chart', 'TanStackDataTable'],
    density: 'balanced',
    description: 'Navigation, metrics, chart, and a full-width data region.',
    evaluationTasks: [
      'navigation remains budgeted',
      'metrics reflow',
      'table fills content region',
    ],
    id: 'dashboard-analytics',
    kind: 'page',
    recipe: 'dashboard',
    regions: [
      { behavior: 'hide', name: 'navigation', width: 'navigation' },
      { behavior: 'remain', name: 'content', width: 'fill' },
    ],
  },
  {
    componentsUsed: ['Field', 'Input', 'Select', 'Button'],
    density: 'balanced',
    description: 'A readable settings form with persistent actions.',
    evaluationTasks: [
      'form stays capped',
      'labels align',
      'actions remain reachable',
    ],
    id: 'settings-form',
    kind: 'page',
    recipe: 'settings',
    regions: [{ behavior: 'remain', name: 'form', width: 'form' }],
  },
  {
    componentsUsed: ['Table', 'LayoutPanel', 'Dialog'],
    density: 'compact',
    description: 'A fill-width collection with a budgeted detail surface.',
    evaluationTasks: [
      'detail panel has fixed budget',
      'detail becomes overlay when narrow',
    ],
    id: 'master-detail-records',
    kind: 'page',
    recipe: 'master-detail',
    regions: [
      { behavior: 'remain', name: 'master', width: 'fill' },
      { behavior: 'overlay', name: 'detail', width: 'panel' },
    ],
  },
  {
    componentsUsed: ['Input', 'Select', 'Toolbar', 'TanStackDataTable'],
    density: 'compact',
    description: 'Filters and actions over a full-width controlled data table.',
    evaluationTasks: [
      'filters wrap without overlap',
      'rows stay readable',
      'keyboard order follows DOM',
    ],
    id: 'data-explorer',
    kind: 'page',
    recipe: 'data-explorer',
    regions: [{ behavior: 'remain', name: 'table', width: 'fill' }],
  },
  {
    componentsUsed: ['Card', 'Grid', 'Button', 'Sheet'],
    density: 'spacious',
    description: 'A product collection with a cart that becomes an overlay.',
    evaluationTasks: [
      'products reflow',
      'cart becomes overlay',
      'theme changes do not alter structure',
    ],
    id: 'commerce-catalog',
    kind: 'page',
    recipe: 'commerce',
    regions: [
      { behavior: 'stack', name: 'products', width: 'fill' },
      { behavior: 'overlay', name: 'cart', width: 'panel' },
    ],
  },
  {
    componentsUsed: ['MetricGrid', 'Progress', 'ApacheEChart', 'ItemGroup'],
    density: 'spacious',
    description:
      'Executive scorecard with objectives, trends, and a narrative insight rail.',
    evaluationTasks: [
      'scorecard hierarchy reads first',
      'narrative rail stacks when narrow',
    ],
    id: 'astryx-executive-summary',
    kind: 'block',
    recipe: 'master-detail',
    regions: [
      { behavior: 'remain', name: 'scorecard', width: 'fill' },
      { behavior: 'stack', name: 'narrative', width: 'panel' },
    ],
  },
  {
    componentsUsed: ['MetricGrid', 'Progress', 'ApacheEChart', 'Table'],
    density: 'balanced',
    description:
      'Growth funnel with conversion trend and cohort retention table.',
    evaluationTasks: [
      'funnel order remains clear',
      'cohort table scrolls inside its region',
    ],
    id: 'astryx-cohort-funnel',
    kind: 'block',
    recipe: 'dashboard',
    regions: [
      { behavior: 'hide', name: 'navigation', width: 'navigation' },
      { behavior: 'remain', name: 'growth', width: 'fill' },
    ],
  },
  {
    componentsUsed: ['ApacheEChart', 'Progress', 'Table', 'ItemGroup'],
    density: 'balanced',
    description:
      'Project launch status with milestones, workstreams, and risks.',
    evaluationTasks: [
      'workstream table stays full width',
      'risks remain rows rather than cards',
    ],
    id: 'astryx-project-status',
    kind: 'block',
    recipe: 'dashboard',
    regions: [
      { behavior: 'hide', name: 'navigation', width: 'navigation' },
      { behavior: 'remain', name: 'program', width: 'fill' },
    ],
  },
  {
    componentsUsed: ['MetricGrid', 'ApacheEChart', 'ItemGroup', 'Badge'],
    density: 'compact',
    description:
      'Live service metrics with alert and service-health triage rail.',
    evaluationTasks: [
      'metric charts stay paired',
      'triage rail stacks when narrow',
    ],
    id: 'astryx-service-monitoring',
    kind: 'block',
    recipe: 'master-detail',
    regions: [
      { behavior: 'remain', name: 'metrics', width: 'fill' },
      { behavior: 'stack', name: 'triage', width: 'panel' },
    ],
  },
  {
    componentsUsed: ['Toolbar', 'Table', 'Badge', 'ItemGroup'],
    density: 'compact',
    description: 'Dense incident rows with filters and a dedicated inspector.',
    evaluationTasks: [
      'incidents render as rows',
      'inspector retains metadata hierarchy',
    ],
    id: 'astryx-incident-console',
    kind: 'block',
    recipe: 'master-detail',
    regions: [
      { behavior: 'remain', name: 'incidents', width: 'fill' },
      { behavior: 'stack', name: 'inspector', width: 'panel' },
    ],
  },
  {
    componentsUsed: ['MetricGrid', 'ApacheEChart', 'Grid', 'ItemGroup'],
    density: 'balanced',
    description:
      'Real Apache ECharts across six chart families with a narrative insight rail.',
    evaluationTasks: [
      'all chart hosts mount canvases',
      'paired charts reflow without clipping',
      'chart labels retain semantic contrast',
    ],
    id: 'chart-analytics-dashboard',
    kind: 'block',
    recipe: 'master-detail',
    regions: [
      { behavior: 'remain', name: 'charts', width: 'fill' },
      { behavior: 'stack', name: 'insights', width: 'panel' },
    ],
  },
  {
    componentsUsed: ['Sidebar', 'Badge', 'Card', 'Item'],
    density: 'compact',
    description:
      'Four status lanes of task cards under a shared sprint toolbar.',
    evaluationTasks: [
      'lanes stay parallel columns',
      'cards remain individual boxes with tag badges',
    ],
    id: 'astryx-kanban-board',
    kind: 'block',
    recipe: 'dashboard',
    regions: [
      { behavior: 'remain', name: 'board', width: 'fill' },
      { behavior: 'hide', name: 'navigation', width: 'navigation' },
    ],
  },
  {
    componentsUsed: ['Sidebar', 'Table', 'Bubble', 'Textarea'],
    density: 'compact',
    description:
      'Mail queue indexed into a reading pane with a reply composer.',
    evaluationTasks: [
      'message rows render in a table region',
      'reading pane stacks below the queue when narrow',
    ],
    id: 'astryx-inbox-table',
    kind: 'block',
    recipe: 'master-detail',
    regions: [
      { behavior: 'remain', name: 'queue', width: 'fill' },
      { behavior: 'stack', name: 'reading', width: 'panel' },
      { behavior: 'remain', name: 'navigation', width: 'navigation' },
    ],
  },
  {
    componentsUsed: ['MetricGrid', 'Table', 'ItemGroup', 'Badge'],
    density: 'balanced',
    description:
      'Order record with line items, totals, delivery details and activity rail.',
    evaluationTasks: [
      'totals stay column-aligned',
      'activity follows the record when narrow',
    ],
    id: 'astryx-order-detail',
    kind: 'block',
    recipe: 'master-detail',
    regions: [
      { behavior: 'remain', name: 'record', width: 'fill' },
      { behavior: 'stack', name: 'activity', width: 'panel' },
    ],
  },
  {
    componentsUsed: ['Input', 'NativeSelect', 'RadioGroup', 'FieldSeparator'],
    density: 'balanced',
    description:
      'Sectioned checkout form beside a recalculating order summary.',
    evaluationTasks: [
      'form sections keep field order',
      'summary follows the form when narrow',
      'totals update with delivery selection',
    ],
    id: 'astryx-checkout-form',
    kind: 'block',
    recipe: 'master-detail',
    regions: [
      { behavior: 'remain', name: 'form', width: 'fill' },
      { behavior: 'stack', name: 'summary', width: 'panel' },
    ],
  },
  {
    componentsUsed: ['Sidebar', 'MetricGrid', 'ApacheEChart', 'Table'],
    density: 'balanced',
    description:
      'Sparkline tiles with period-over-period deltas and segment breakdowns.',
    evaluationTasks: [
      'sparkline hosts mount canvases inside metric tiles',
      'breakdown tables pair side by side when wide',
    ],
    id: 'astryx-data-dashboard',
    kind: 'block',
    recipe: 'dashboard',
    regions: [
      { behavior: 'remain', name: 'metrics', width: 'fill' },
      { behavior: 'hide', name: 'navigation', width: 'navigation' },
    ],
  },
  {
    componentsUsed: ['Input', 'Card', 'Empty', 'Button'],
    density: 'spacious',
    description:
      'Browsable catalog grid with search, filter tabs and a real empty state.',
    evaluationTasks: [
      'cards flow in the gallery grid',
      'empty state replaces products when search filters all',
    ],
    id: 'astryx-card-grid',
    kind: 'block',
    recipe: 'commerce',
    regions: [
      { behavior: 'remain', name: 'products', width: 'fill' },
      { behavior: 'remain', name: 'saved', width: 'panel' },
    ],
  },
] as const satisfies ReadonlyArray<TemplateDefinition>

export type TemplateId = (typeof templates)[number]['id']

export const templateById = (id: TemplateId): TemplateDefinition => {
  const match = templates.find(template => template.id === id)
  if (match === undefined)
    throw new Error(`Unknown constrained template: ${id}`)
  return match
}
