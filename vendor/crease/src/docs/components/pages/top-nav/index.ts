import { authoredPage } from '@/docs/components/pages/authored-page'
import { topNavExamples } from '@/docs/components/pages/top-nav/shared'
import { topNavTailwindPreviewProgram } from '@/docs/components/pages/top-nav/tailwind'

export const topNavPage = authoredPage({
  slug: 'top-nav',
  title: 'Top Nav',
  kind: 'submodel',
  previewProgram: topNavTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Horizontal application header with a brand heading, link items, hover-or-click dropdown menus, and a mega menu with a featured card.',
    architecture:
      'TopNav owns per-menu NavMenu state (hover intent, pin/dismiss, focus ownership) keyed by menu position, and reports item and menu-item activation via SelectedTopNavItem / SelectedTopNavMenuItem OutMessages plus ChangedTopNavMenuOpen for open-state tracking.',
    apiHref: 'https://foldkit.dev/ui/top-nav',
    composition:
      'Parent Model\n└── TopNav Model\n    ├── menus: per-trigger NavMenu models\n    ├── startItems / centerItems entries\n    │   └── item | menu | megaMenu\n    └── heading / endContent view data',
    styling:
      'Entry data is a view concern (label, href, icon, selected/disabled); menu open state follows the Model. `startContent`/`centerContent`/`endContent` accept arbitrary Html for search inputs, icon buttons, or CTAs.',
    accessibility:
      'Renders a `nav` landmark with an aria-label. Menu triggers expose aria-haspopup="menu" + aria-expanded; panels are role="menu" (dropdowns) or role="group" (mega menu) anchored below the nav, and Escape closes and refocuses the trigger.',
    keyboard: [
      [
        'Enter / Space',
        'Opens the focused menu and moves focus to its first item.',
      ],
      ['Escape', 'Closes the open menu and refocuses its trigger.'],
      ['Tab', 'Moves through menu items in document order.'],
    ],
    examples: topNavExamples('tailwind'),
    stylexExamples: topNavExamples('stylex'),
    pleatExamples: topNavExamples('pleat'),
  },
})
