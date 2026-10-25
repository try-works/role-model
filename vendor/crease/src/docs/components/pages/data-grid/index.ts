import { authoredPage } from '@/docs/components/pages/authored-page'
import { dataGridExamples } from '@/docs/components/pages/data-grid/shared'
import { dataGridTailwindPreviewProgram } from '@/docs/components/pages/data-grid/tailwind'

export const dataGridPage = authoredPage({
  slug: 'data-grid',
  title: 'Data Grid',
  kind: 'submodel',
  previewProgram: dataGridTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A dense, editable spreadsheet-style grid with virtualized rows, cell focus and range selection, keyboard navigation, sorting, filtering, column visibility, and a per-variant cell editor.',
    architecture:
      'The application owns rows and typed column definitions. DataGrid.Model stores interaction state—focused and editing cells, draft values, selection ranges, sorting, filters, hidden columns, and viewport metrics—and its pure update is delegated by the parent with the same column config.',
    apiHref: 'https://foldkit.dev/guide/state',
    composition:
      'Parent Model\n├── domain rows\n└── DataGrid interaction Model\n    ├── focused / editing cell + draft value\n    ├── selection anchor + end\n    ├── sorting + filters\n    ├── hidden columns + row height\n    └── viewport scroll state\nView inputs\n└── typed columns (variant, width, accessors), row key, createRow',
    styling:
      'Give the grid a flex column parent with a bounded height—it fills the remaining space and keeps the add-row footer pinned while rows scroll.',
    accessibility:
      'The grid exposes grid/row/columnheader/gridcell roles with roving aria-selected state. Cells activate on Enter and editors commit on Enter, cancel on Escape, and move on Tab.',
    keyboard: [
      ['Arrow keys', 'Moves the focused cell.'],
      ['Shift + Arrow keys', 'Extends the selection range.'],
      ['Enter', 'Starts editing the focused cell; commits while editing.'],
      ['Escape', 'Cancels the in-progress edit or clears the selection.'],
      ['Tab', 'Commits the edit and moves to the next column.'],
      ['Ctrl/Cmd + A', 'Selects all rows.'],
    ],
    examples: dataGridExamples('tailwind'),
    stylexExamples: dataGridExamples('stylex'),
    pleatExamples: dataGridExamples('pleat'),
  },
})
