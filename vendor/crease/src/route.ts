import { Schema as S, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'

export const ChartSection = S.Literals([
  'area',
  'bar',
  'line',
  'pie',
  'radar',
  'radial',
  'tooltip',
])
export type ChartSection = typeof ChartSection.Type

export const CHART_SECTIONS: ReadonlyArray<ChartSection> = [
  'area',
  'bar',
  'line',
  'pie',
  'radar',
  'radial',
  'tooltip',
]

export const isChartSection = S.is(ChartSection)

export const SIDEBAR_BLOCK_IDS: ReadonlyArray<string> = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
]

export const AppRoute = defineRouteUnion({
  Home: {},
  Create: {},
  Charts: { section: S.String },
  BlocksIndex: {},
  BlocksStyleX: {},
  BlocksStyleXTable: {},
  Block: { blockId: S.String },
  GettingStarted: {},
  Theming: {},
  LintRules: {},
  LintRule: { rule: S.String },
  ComponentDocs: { component: S.String },
  NotFound: { path: S.String },
})

export type AppRoute = typeof AppRoute.Type

const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))

const createRouter = pipe(literal('create'), Route.mapTo(AppRoute.Create))

const chartsRouter = pipe(
  literal('charts'),
  slash(string('section')),
  Route.mapTo(AppRoute.Charts),
)

const blocksRootRouter = pipe(
  literal('blocks'),
  Route.mapTo(AppRoute.BlocksIndex),
)

const blockPreviewRouter = pipe(
  literal('blocks'),
  slash(literal('preview')),
  slash(string('blockId')),
  Route.mapTo(AppRoute.Block),
)

const blocksIndexRouter = pipe(
  literal('blocks'),
  slash(literal('sidebar')),
  Route.mapTo(AppRoute.BlocksIndex),
)

const blocksStyleXRouter = pipe(
  literal('blocks-stylex'),
  Route.mapTo(AppRoute.BlocksStyleX),
)

const blocksStyleXTableRouter = pipe(
  literal('blocks-stylex'),
  slash(literal('table')),
  Route.mapTo(AppRoute.BlocksStyleXTable),
)

const blockRouter = pipe(
  literal('blocks'),
  slash(literal('sidebar')),
  slash(string('blockId')),
  Route.mapTo(AppRoute.Block),
)

const componentDocsRouter = pipe(
  literal('docs'),
  slash(literal('components')),
  slash(string('component')),
  Route.mapTo(AppRoute.ComponentDocs),
)

const gettingStartedRouter = pipe(
  literal('docs'),
  slash(literal('getting-started')),
  Route.mapTo(AppRoute.GettingStarted),
)

const themingRouter = pipe(
  literal('docs'),
  slash(literal('theming')),
  Route.mapTo(AppRoute.Theming),
)

const lintRuleRouter = pipe(
  literal('docs'),
  slash(literal('lint')),
  slash(string('rule')),
  Route.mapTo(AppRoute.LintRule),
)

const lintRulesRouter = pipe(
  literal('docs'),
  slash(literal('lint')),
  Route.mapTo(AppRoute.LintRules),
)

const routeParser = Route.oneOf(
  createRouter,
  chartsRouter,
  blockPreviewRouter,
  blockRouter,
  blocksIndexRouter,
  blocksRootRouter,
  blocksStyleXTableRouter,
  blocksStyleXRouter,
  gettingStartedRouter,
  themingRouter,
  lintRuleRouter,
  lintRulesRouter,
  componentDocsRouter,
  homeRouter,
)

export const urlToAppRoute = Route.parseUrlWithFallback(
  routeParser,
  AppRoute.NotFound,
)

export const homePath = (): string => homeRouter()

export const createPath = (): string => createRouter()

export const chartsPath = (section: ChartSection): string =>
  chartsRouter({ section })

export const blocksIndexPath = (): string => blocksRootRouter()

export const blockPreviewPath = (
  renderer: 'tailwind' | 'stylex' | 'pleat',
  name: string,
): string => blockPreviewRouter({ blockId: `${renderer}--${name}` })

export const blocksStyleXPath = (): string => blocksStyleXRouter()

export const blocksStyleXTablePath = (): string => blocksStyleXTableRouter()

export const blockPath = (blockId: string): string => blockRouter({ blockId })

export const componentDocsPath = (component: string): string =>
  componentDocsRouter({ component })

export const gettingStartedPath = (): string => gettingStartedRouter()

export const themingPath = (): string => themingRouter()

export const lintRulesPath = (): string => lintRulesRouter()

export const lintRulePath = (rule: string): string => lintRuleRouter({ rule })
