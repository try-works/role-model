import { authoredPage } from '@/docs/components/pages/authored-page'
import { overflowListExamples } from '@/docs/components/pages/overflow-list/shared'
import { overflowListTailwindPreviewProgram } from '@/docs/components/pages/overflow-list/tailwind'

export const overflowListPage = authoredPage({
  slug: 'overflow-list',
  title: 'Overflow List',
  kind: 'submodel',
  previewProgram: overflowListTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A responsive row (or wrapped rows) of items that collapses the ones that do not fit behind an overflow indicator.',
    architecture:
      'Overflow List is a submodel: a hidden measurement row and a ResizeObserver mount report how many items fit; the Model tracks the visible count, rows, row height, and hidden indices, and emits OverflowChanged whenever the collapsed set changes. `collapseFrom` picks which end loses items; `overflowRenderer` renders the +N indicator over the collapsed set.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/overflow-list.ts',
    composition:
      'Parent Model\n├── Overflow List child Model\n├── optional menu Model for dropdown indicators\n└── overflowList view\n    ├── hidden measure container (all items + max-width indicator)\n    └── visible container (measured items + live indicator)',
    styling:
      'Items are spaced by the CreaseUI spacing-step `gap` scale (0–10 → 0–40px). `maxRows` wraps content instead of clipping and needs `overflow: hidden` on the parent to read correctly.',
    accessibility:
      'The measurement row is aria-hidden and inert; collapsed items are removed from the visible row rather than visually hidden, so the indicator is the only path to them.',
    examples: overflowListExamples('tailwind'),
    stylexExamples: overflowListExamples('stylex'),
    pleatExamples: overflowListExamples('pleat'),
  },
})
