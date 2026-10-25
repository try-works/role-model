import { authoredPage } from '@/docs/components/pages/authored-page'
import { dataTableExamples } from '@/docs/components/pages/data-table/shared'
import { dataTableTailwindPreviewProgram } from '@/docs/components/pages/data-table/tailwind'

export const dataTablePage = authoredPage({
  slug: 'data-table',
  title: 'Data Table',
  kind: 'recipe',
  previewProgram: dataTableTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'A typed, controlled data-grid recipe with filtering, sorting, selection, column visibility, formatting, and pagination.',
    architecture:
      'The application owns rows and typed column definitions. DataTable.Model stores interaction state—filter text, sort choice, page size, selected row keys, and hidden column keys—and its pure update is delegated by the parent.',
    apiHref: 'https://foldkit.dev/guide/state',
    composition:
      'Parent Model\n├── domain rows\n└── DataTable interaction Model\n    ├── filter query\n    ├── sort key + direction\n    ├── page + page size\n    ├── selected row keys\n    └── hidden column keys\nView inputs\n└── typed columns, keys, formatting',
    styling:
      'Column definitions own alignment styles and cell formatting. The table keeps an overflow boundary; place it in a width-aware container on narrow screens.',
    accessibility:
      'Use a descriptive table label, stable row keys, and text equivalents for formatted values. Sortable headers expose aria-sort and remain keyboard-operable buttons.',
    keyboard: [
      [
        'Tab',
        'Moves through the filter, sortable headers, and pagination controls.',
      ],
      ['Enter / Space', 'Changes sort direction or activates pagination.'],
    ],
    examples: dataTableExamples('tailwind'),
    stylexExamples: dataTableExamples('stylex'),
    pleatExamples: dataTableExamples('pleat'),
  },
})
