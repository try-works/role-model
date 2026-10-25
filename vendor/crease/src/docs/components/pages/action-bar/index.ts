import { authoredPage } from '@/docs/components/pages/authored-page'
import { actionBarExamples } from '@/docs/components/pages/action-bar/shared'
import { actionBarTailwindPreviewProgram } from '@/docs/components/pages/action-bar/tailwind'

export const actionBarPage = authoredPage({
  slug: 'action-bar',
  title: 'Action Bar',
  kind: 'helper',
  previewProgram: actionBarTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Floats a contextual toolbar for multi-selection actions — select rows in a table, then act on the batch.',
    architecture:
      'Action Bar is presentation plus two mounts: Escape dismissal and roving-tabindex arrow navigation inside the group. Selection state stays in the parent Model; open/close and item clicks are plain messages.',
    apiHref: 'https://foldkit.dev/ui/overview',
    accessibility:
      'The bar exposes a toolbar landmark with its orientation. Arrow keys move between items and Escape clears the selection.',
    examples: actionBarExamples('tailwind'),
    stylexExamples: actionBarExamples('stylex'),
    pleatExamples: actionBarExamples('pleat'),
  },
})
