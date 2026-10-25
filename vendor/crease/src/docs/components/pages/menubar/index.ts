import { authoredPage } from '@/docs/components/pages/authored-page'
import { menubarExamples } from '@/docs/components/pages/menubar/shared'
import { menubarTailwindPreviewProgram } from '@/docs/components/pages/menubar/tailwind'

export const menubarPage = authoredPage({
  slug: 'menubar',
  title: 'Menubar',
  kind: 'submodel',
  previewProgram: menubarTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Coordinates several persistent top-level application menus with typed child actions.',
    architecture:
      'A thin Menubar Model owns only the roving top-level focus index and focus Command. Each label owns an independent Dropdown Menu Model for open state, disabled traversal, typeahead, submenu routing, and dismissal. The parent folds Menubar MovedTo facts to switch menus and typed menu Selected facts to application actions.',
    apiHref: 'https://foldkit.dev/ui/menu',
    composition:
      'Parent Menubar state\n├── active top-level index\n├── File Dropdown Menu Model\n├── Edit Dropdown Menu Model\n└── View Dropdown Menu Model\n    └── each emits typed Action OutMessage',
    styling:
      "Hover and keyboard focus highlight a trigger. Use each menu's parent-owned isSelected and onSelect inputs to underline the last activated category independently of roving focus. Menubars suit desktop-style applications with stable command categories; provide an alternative navigation pattern on narrow consumer layouts.",
    accessibility:
      'The wrapper exposes a named menubar and each child retains menu/menuitem semantics. Horizontal arrows move between top-level menus; vertical arrows remain inside the active child.',
    keyboard: [
      ['Arrow Left / Right', 'Moves to and opens the adjacent top-level menu.'],
      ['Arrow Up / Down', 'Moves within the current child menu.'],
      ['Enter / Space', 'Opens a menu or selects an action.'],
      ['Escape', 'Closes the active menu.'],
    ],
    examples: menubarExamples('tailwind'),
    stylexExamples: menubarExamples('stylex'),
    pleatExamples: menubarExamples('pleat'),
  },
})
