import { authoredPage } from '@/docs/components/pages/authored-page'
import { gridExamples } from '@/docs/components/pages/grid/shared'
import { gridTailwindPreviewProgram } from '@/docs/components/pages/grid/tailwind'

export const gridPage = authoredPage({
  slug: 'grid',
  title: 'Grid',
  kind: 'helper',
  previewProgram: gridTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Lays out children in a CSS grid — fixed equal-width columns or responsive min-width tracks — with optional column/row spans via GridSpan.',
    architecture:
      'Grid is a stateless render helper. The columns prop accepts a count or { minWidth, max, repeat } — responsive templates compile to repeat(auto-fill|auto-fit, minmax(…)) inline styles, and GridSpan maps to grid-column/grid-row spans. Gap props follow the CreaseUI spacing scale (1 step = 4px).',
    apiHref: 'https://github.com/Potti1234/creaseui/blob/main/src/ui/grid.ts',
    styling:
      'Prefer the columns/gap props over ad-hoc classes. Wrap children in GridSpan for multi-column or multi-row placement; the span itself fills its grid cell.',
    accessibility:
      'Grid applies no semantics of its own — it only orders content visually. Keep DOM order meaningful and choose a semantic element with `as` when the grid is a list or landmark.',
    examples: gridExamples('tailwind'),
    stylexExamples: gridExamples('stylex'),
    pleatExamples: gridExamples('pleat'),
  },
})
