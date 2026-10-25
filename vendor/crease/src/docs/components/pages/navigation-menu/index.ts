import { authoredPage } from '@/docs/components/pages/authored-page'
import { navigationMenuExamples } from '@/docs/components/pages/navigation-menu/shared'
import { navigationMenuTailwindPreviewProgram } from '@/docs/components/pages/navigation-menu/tailwind'

export const navigationMenuPage = authoredPage({
  slug: 'navigation-menu',
  title: 'Navigation Menu',
  kind: 'recipe',
  previewProgram: navigationMenuTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'Composes parent-controlled route links with optional Foldkit Popover disclosure behavior and finite responsive layouts.',
    architecture:
      'Route/current item stays in the parent or router and is passed to semantic link helpers each render. Only disclosures receive a Popover child Model. Layout and direction are finite view inputs; link data never enters interaction state.',
    apiHref: 'https://foldkit.dev/ui/popover',
    composition:
      'nav landmark\n└── ul\n    ├── li → active/current link\n    └── li → disclosure trigger\n        └── Popover child Model → navigation links',
    styling:
      'Use ordinary links for destinations and reserve disclosures for small link collections. Choose responsive for a stacked narrow fallback or scroll for deliberate horizontal overflow.',
    accessibility:
      'The helpers render nav, list, list-item, link, and aria-current semantics. Name multiple navigation landmarks distinctly. Unlike Radix Navigation Menu, disclosures deliberately use canonical Popover press/focus behavior; optional hover intent only opens and outside/Escape dismissal remains canonical.',
    keyboard: [
      [
        'Tab / Shift+Tab',
        'Moves through links and disclosure triggers in document order.',
      ],
      ['Enter', 'Follows a link or opens the focused disclosure.'],
      ['Escape', 'Closes an open disclosure and restores its trigger focus.'],
    ],
    examples: navigationMenuExamples('tailwind'),
    stylexExamples: navigationMenuExamples('stylex'),
    pleatExamples: navigationMenuExamples('pleat'),
  },
})
