import { authoredPage } from '@/docs/components/pages/authored-page'
import { treeListExamples } from '@/docs/components/pages/tree-list/shared'
import { treeListTailwindPreviewProgram } from '@/docs/components/pages/tree-list/tailwind'

export const treeListPage = authoredPage({
  slug: 'tree-list',
  title: 'Tree List',
  kind: 'submodel',
  previewProgram: treeListTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Expandable tree view with roving focus, arrow-key traversal, and typeahead — for file browsers, navigation, and settings hierarchies.',
    architecture:
      'TreeList owns expanded-state overrides, roving focus, and a typeahead buffer in one child Model, resolves every keyboard intent in the view against the item graph, and reports leaf activation via a SelectedTreeListItem OutMessage for parent domain logic.',
    apiHref: 'https://foldkit.dev/ui/tree-list',
    composition:
      'Parent Model\n└── TreeList Model\n    ├── expanded overrides\n    ├── roving focus + typeahead\n    └── per-render item data\n        └── label / startContent / endContent / children',
    styling:
      'Item data is a view concern; expansion and focus follow stable item ids across renders. Choose `lineGuides` to draw connector lines between parent and child rows, `noGuides` for indentation alone, and `density` for row padding.',
    accessibility:
      'Renders a real `tree`/`treeitem`/`group` hierarchy with aria-expanded, aria-selected, aria-level, and aria-posinset/aria-setsize. Focus is roving (single tab stop), and disabled items stay focusable so screen reader users can discover them.',
    keyboard: [
      [
        'ArrowDown / ArrowUp',
        'Moves focus to the previous or next visible item.',
      ],
      [
        'ArrowRight',
        'Expands a collapsed branch, or moves to its first child.',
      ],
      ['ArrowLeft', 'Collapses an expanded branch, or moves to its parent.'],
      ['Home / End', 'Moves focus to the first or last visible item.'],
      [
        'Enter / Space',
        'Activates the item (link/button) or toggles expansion.',
      ],
      ['Type characters', 'Typeahead focuses the next matching item.'],
    ],
    examples: treeListExamples('tailwind'),
    stylexExamples: treeListExamples('stylex'),
    pleatExamples: treeListExamples('pleat'),
  },
})
