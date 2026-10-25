import { authoredPage } from '@/docs/components/pages/authored-page'
import { tabsExamples } from '@/docs/components/pages/tabs/shared'
import { tabsTailwindPreviewProgram } from '@/docs/components/pages/tabs/tailwind'
export const tabsPage = authoredPage({
  slug: 'tabs',
  title: 'Tabs',
  kind: 'submodel',
  previewProgram: tabsTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Switches between related panels while coordinating roving focus, keyboard navigation, and an application-owned selected value.',
    architecture:
      'Bind the domain value once with Tabs.create<Value>(). The child Model owns only roving focus and activation mode; the parent or route owns the selected value and passes it back every render. Delegate child Messages through the bound update, map Commands, and persist the typed Selected OutMessage.',
    apiHref: 'https://foldkit.dev/ui/tabs',
    composition: 'Tabs\n├── TabsList\n│   └── TabsTrigger\n└── TabsContent',
    styling:
      'Use the default contained treatment for settings and the line variant for section-level navigation. Keep labels short enough to scan as one set.',
    accessibility:
      'Foldkit owns deterministic tab/tabpanel relationships and roving focus. Disabled tabs are skipped, manual mode separates focus from activation, and horizontal RTL order mirrors arrow navigation. ariaLabel distinguishes the set when nearby headings are insufficient.',
    keyboard: [
      ['Arrow keys', 'Moves focus between enabled tabs.'],
      ['Home / End', 'Moves to the first or last enabled tab.'],
      ['Enter / Space', 'Selects a focused tab in manual activation mode.'],
    ],
    examples: tabsExamples('tailwind'),
    stylexExamples: tabsExamples('stylex'),
    pleatExamples: tabsExamples('pleat'),
  },
})
