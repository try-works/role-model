import { authoredPage } from '@/docs/components/pages/authored-page'
import { contextMenuExamples } from '@/docs/components/pages/context-menu/shared'
import { contextMenuTailwindPreviewProgram } from '@/docs/components/pages/context-menu/tailwind'

export const contextMenuPage = authoredPage({
  slug: 'context-menu',
  title: 'Context Menu',
  kind: 'submodel',
  previewProgram: contextMenuTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Opens a typed action menu at the pointer coordinates of a secondary click.',
    architecture:
      'Context Menu is a thin adapter over the shared Dropdown Menu behavior and typed factory. Pointer coordinates are transient child state; CSS viewport clamps position the menu without reading browser globals during render. The parent consumes Selected output and maps returned Commands.',
    apiHref: 'https://foldkit.dev/ui/menu',
    composition:
      'Context target\n└── secondary-click Message with x/y\n    └── menu child Model\n        ├── coordinate anchor\n        ├── active item\n        └── typed selection output',
    styling:
      'Use context menus as accelerators, not the only route to important actions. The dashed preview target makes the activation region explicit.',
    accessibility:
      'A pointer context menu needs equivalent visible controls elsewhere. The focused target supports Shift+F10 and the Context Menu key; once open, disabled traversal, typeahead, selection, and Escape reuse the shared menu behavior.',
    keyboard: [
      [
        'Shift+F10 / context-menu key',
        'Browsers may dispatch the context-menu event from the focused target.',
      ],
      ['Arrow Up / Down', 'Moves among enabled actions.'],
      ['Enter', 'Selects the active action.'],
      ['Escape', 'Closes the menu.'],
    ],
    examples: contextMenuExamples('tailwind'),
    stylexExamples: contextMenuExamples('stylex'),
    pleatExamples: contextMenuExamples('pleat'),
  },
})
