import { authoredPage } from '@/docs/components/pages/authored-page'
import { moreMenuExamples } from '@/docs/components/pages/more-menu/shared'
import { moreMenuTailwindPreviewProgram } from '@/docs/components/pages/more-menu/tailwind'

export const moreMenuPage = authoredPage({
  slug: 'more-menu',
  title: 'More Menu',
  kind: 'submodel',
  previewProgram: moreMenuTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description: 'A three-dot overflow trigger that opens a menu of actions.',
    architecture:
      'More Menu is a submodel wrapper over Dropdown Menu: it re-exports the same Model, Message, OutMessage, init, and update, flattens action, divider, and section options into menu items, and renders an icon-only ghost trigger.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/more-menu.ts',
    composition:
      'Parent Model\n├── More Menu child Model (Dropdown Menu model)\n└── moreMenu view\n    ├── ellipsis icon trigger\n    └── items / dividers / labeled sections',
    styling:
      "Trigger variants are the Button variants (`ghost` by default); sizes sm/md/lg map onto the icon button sizes. `variant: 'destructive'` marks a dangerous item.",
    accessibility:
      'The icon-only trigger always needs an accessible name — `label` defaults to "More options" and doubles as the menu\'s aria-label. Menu keyboard behavior is inherited from Dropdown Menu.',
    keyboard: [
      ['Enter / Space', 'Opens the menu or selects the active action.'],
      ['Arrow Up / Down', 'Moves among enabled items.'],
      ['Escape', 'Closes the menu.'],
    ],
    examples: moreMenuExamples('tailwind'),
    stylexExamples: moreMenuExamples('stylex'),
    pleatExamples: moreMenuExamples('pleat'),
  },
})
