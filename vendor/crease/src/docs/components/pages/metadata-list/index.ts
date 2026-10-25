import { authoredPage } from '@/docs/components/pages/authored-page'
import { metadataListExamples } from '@/docs/components/pages/metadata-list/shared'
import { metadataListTailwindPreviewProgram } from '@/docs/components/pages/metadata-list/tailwind'

export const metadataListPage = authoredPage({
  slug: 'metadata-list',
  title: 'Metadata List',
  kind: 'submodel',
  previewProgram: metadataListTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A read-only list of labeled values — names, statuses, owners, dates — rendered as a semantic dl/dt/dd grid.',
    architecture:
      'Metadata List is a submodel: a tiny Model carries whether a capped list is expanded (Show more), and the view renders a dl grid whose layout is resolved by `resolveLayout` — single column, multi column, numeric columns, or horizontal. `metadataListItem` renders each dt/dd pair; pass `stacked` from `resolveLayout(...).isStacked` so items match the list layout.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/metadata-list.ts',
    composition:
      'Parent Model\n├── Metadata List child Model (isOpen)\n└── metadataList view\n    ├── optional title\n    ├── dl of metadataListItem pairs\n    └── show more/less toggle when maxNumOfItems caps the list',
    styling:
      'Items are two-column rows (auto label, minmax value) for `single`, an auto-fill card grid for `multi`, a vertical stack for stacked labels, and a wrapping row for `horizontal`.',
    accessibility:
      'Terms and descriptions use real dt/dd elements; the show-more toggle exposes aria-expanded and aria-controls on the list.',
    examples: metadataListExamples('tailwind'),
    stylexExamples: metadataListExamples('stylex'),
    pleatExamples: metadataListExamples('pleat'),
  },
})
