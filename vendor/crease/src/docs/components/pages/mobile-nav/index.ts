import { authoredPage } from '@/docs/components/pages/authored-page'
import { mobileNavExamples } from '@/docs/components/pages/mobile-nav/shared'
import { mobileNavTailwindPreviewProgram } from '@/docs/components/pages/mobile-nav/tailwind'

export const mobileNavPage = authoredPage({
  slug: 'mobile-nav',
  title: 'Mobile Nav',
  kind: 'submodel',
  previewProgram: mobileNavTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A mobile navigation drawer that slides in from a viewport edge, plus a hamburger toggle that opens it.',
    architecture:
      'MobileNav composes the Dialog submodel with a resolved side (' +
      "'start' | 'end' | 'auto'" +
      "): auto inspects the toggle's viewport position at open time and slides in from the same edge. The toggle is a standalone button bound to the dialog by aria-controls.",
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/mobile-nav.ts',
    styling:
      'A full-height panel 320px wide with a blurred scrim, a compact header row with a close control, and a scrollable nav body; start/end slide transforms mirror for RTL.',
    accessibility:
      'The Dialog supplies focus containment and Escape dismissal. Without a visible title the label falls back to sr-only text; the toggle exposes aria-controls and aria-expanded bound to the drawer.',
    keyboard: [
      ['Escape', 'Closes the drawer and restores focus to the toggle.'],
      ['Tab', 'Cycles focus within the open drawer.'],
    ],
    examples: mobileNavExamples('tailwind'),
    stylexExamples: mobileNavExamples('stylex'),
    pleatExamples: mobileNavExamples('pleat'),
  },
})
