import { authoredPage } from '@/docs/components/pages/authored-page'
import { tableExamples } from '@/docs/components/pages/table/shared'
import { tableTailwindPreviewProgram } from '@/docs/components/pages/table/tailwind'

export const tablePage = authoredPage({
  slug: 'table',
  title: 'Table',
  kind: 'helper',
  previewProgram: tableTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Presents structured data in semantic rows and columns with responsive horizontal overflow.',
    architecture:
      'Table is stateless. Sorting, filtering, pagination, and selected rows belong to the parent Model; this component only renders semantic table parts.',
    apiHref: 'https://foldkit.dev/ui/overview',
    composition:
      'Table\n├── TableCaption\n├── TableHeader → TableRow → TableHead\n├── TableBody → TableRow → TableCell\n└── TableFooter',
    styling:
      'Keep column alignment stable and avoid forcing data into a table when a stacked list is clearer on narrow screens.',
    accessibility:
      'Use TableHead for header cells and add a caption when the table needs an accessible name or explanation.',
    examples: tableExamples('tailwind'),
    stylexExamples: tableExamples('stylex'),
    pleatExamples: tableExamples('pleat'),
  },
})
