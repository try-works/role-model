import { Match as M, Schema as S } from 'effect'
import { taggedStruct } from 'foldkit/schema'

import * as BlocksTailwindFeature from '@/demo/blocks/featured-page'
import * as SidebarStyleX from '@/demo/blocks-stylex/sidebar-page'
import * as SidebarPleat from '@/demo/blocks-pleat/sidebar-page'
import * as BlocksFeature from '@/demo/blocks/registry'
import * as BlocksStyleXFeature from '@/demo/blocks-stylex/featured-page'
import * as BlocksPleatFeature from '@/demo/blocks-pleat/featured-page'
import * as TanStackTableFeature from '@/demo/blocks-stylex/tanstack-table-page'
import * as TanStackTablePleatFeature from '@/demo/blocks-pleat/tanstack-table-page'
import * as LandingFeature from '@/demo/landing'
import * as ChartsArea from '@/demo/charts/area'
import * as ChartsBar from '@/demo/charts/bar'
import * as ChartsLine from '@/demo/charts/line'
import * as ChartsPie from '@/demo/charts/pie'
import * as ChartsRadar from '@/demo/charts/radar'
import * as ChartsRadial from '@/demo/charts/radial'
import * as ChartsTooltip from '@/demo/charts/tooltip'
import * as ChartsStyleX from '@/demo/charts-stylex/page'
import * as ChartsPleat from '@/demo/charts-pleat/page'
import * as ComponentCatalog from '@/docs/components/catalog'
import * as CopyFeedback from '@/docs/copy-feedback'
import * as CodeBlock from '@/ui/code-block'
import type { AppRoute } from '@/route'
import { renderer } from '@/site/config'

export const Landing = taggedStruct('LandingPage', {
  landing: LandingFeature.Model,
})
export const Renderer = S.Literals(['tailwind', 'stylex', 'pleat'])
export type Renderer = typeof Renderer.Type
export const Create = taggedStruct('CreatePage', {
  renderer: Renderer,
})
export const BlockCategory = S.Literals([
  'all',
  'dashboard',
  'sidebar',
  'login',
  'table',
])
export const BlockCodePanel = S.Struct({
  files: S.Record(S.String, S.String),
  codeFile: S.String,
})
export type BlockCodePanel = typeof BlockCodePanel.Type
export const BlocksIndex = taggedStruct('BlocksIndexPage', {
  renderer: Renderer,
  category: BlockCategory,
  codeBlocks: S.Record(S.String, BlockCodePanel),
  copiedCode: CopyFeedback.Model,
})
export const BlocksStyleXTable = taggedStruct('BlocksStyleXTablePage', {
  renderer: Renderer,
  table: TanStackTableFeature.Model,
  pleatTable: TanStackTablePleatFeature.Model,
})
export const Block = taggedStruct('BlockPage', {
  blocks: BlocksFeature.Model,
  styleXSidebar: SidebarStyleX.Model,
  styleXFeatured: BlocksStyleXFeature.Model,
  pleatSidebar: SidebarPleat.Model,
  pleatFeatured: BlocksPleatFeature.Model,
  tailwindFeatured: BlocksTailwindFeature.Model,
})
export const Charts = taggedStruct('ChartsPage', {
  renderer: Renderer,
  area: ChartsArea.Model,
  bar: ChartsBar.Model,
  line: ChartsLine.Model,
  pie: ChartsPie.Model,
  radar: ChartsRadar.Model,
  radial: ChartsRadial.Model,
  tooltip: ChartsTooltip.Model,
  styleXCharts: ChartsStyleX.Model,
  pleatCharts: ChartsPleat.Model,
})
export const CatalogDocs = taggedStruct('CatalogDocsPage', {
  docs: ComponentCatalog.Model,
})
export const GettingStarted = taggedStruct('GettingStartedPage', {
  codeBlock: CodeBlock.Model,
})
export const Theming = taggedStruct('ThemingPage', {
  codeBlock: CodeBlock.Model,
})
export const LintDocs = taggedStruct('LintDocsPage', {
  codeBlock: CodeBlock.Model,
  rule: S.String,
})
export const NotFound = taggedStruct('NotFoundPage')

export const Page = S.Union([
  Landing,
  Create,
  BlocksIndex,
  BlocksStyleXTable,
  Block,
  Charts,
  CatalogDocs,
  GettingStarted,
  LintDocs,
  Theming,
  NotFound,
])
export type Page = typeof Page.Type

export const init = (route: AppRoute): Page =>
  M.value(route).pipe(
    M.withReturnType<Page>(),
    M.tagsExhaustive({
      Home: () => Landing({ landing: LandingFeature.init() }),
      Create: () =>
        Create({
          renderer,
        }),
      Charts: () =>
        Charts({
          renderer,
          area: ChartsArea.init(),
          bar: ChartsBar.init(),
          line: ChartsLine.init(),
          pie: ChartsPie.init(),
          radar: ChartsRadar.init(),
          radial: ChartsRadial.init(),
          tooltip: ChartsTooltip.init(),
          styleXCharts: ChartsStyleX.init(),
          pleatCharts: ChartsPleat.init(),
        }),
      BlocksIndex: () =>
        BlocksIndex({
          renderer,
          category: 'all',
          codeBlocks: {},
          copiedCode: null,
        }),
      BlocksStyleX: () =>
        BlocksIndex({
          renderer,
          category: 'all',
          codeBlocks: {},
          copiedCode: null,
        }),
      BlocksStyleXTable: () =>
        BlocksStyleXTable({
          renderer,
          table: TanStackTableFeature.init(),
          pleatTable: TanStackTablePleatFeature.init(),
        }),
      Block: () =>
        Block({
          blocks: BlocksFeature.init(),
          styleXSidebar: SidebarStyleX.init(),
          styleXFeatured: BlocksStyleXFeature.init(),
          pleatSidebar: SidebarPleat.init(),
          pleatFeatured: BlocksPleatFeature.init(),
          tailwindFeatured: BlocksTailwindFeature.init(),
        }),
      ComponentDocs: ({ component }) =>
        ComponentCatalog.hasCatalogPage(component)
          ? CatalogDocs({ docs: ComponentCatalog.init(component) })
          : NotFound(),
      GettingStarted: () => GettingStarted({ codeBlock: CodeBlock.init() }),
      Theming: () => Theming({ codeBlock: CodeBlock.init() }),
      LintRules: () => LintDocs({ codeBlock: CodeBlock.init(), rule: '' }),
      LintRule: ({ rule }) => LintDocs({ codeBlock: CodeBlock.init(), rule }),
      NotFound: () => NotFound(),
    }),
  )
