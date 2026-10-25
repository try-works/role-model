import { authoredPage } from '@/docs/components/pages/authored-page'
import { statExamples } from '@/docs/components/pages/stat/shared'
import { statTailwindPreviewProgram } from '@/docs/components/pages/stat/tailwind'

export const statPage = authoredPage({
  slug: 'stat',
  title: 'Stat',
  kind: 'helper',
  previewProgram: statTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'A single KPI: a muted label, a prominent value, and an optional delta trend or supporting copy.',
    architecture:
      'Stat is a stateless render helper. `delta` and `description` give the supporting row, `media` takes any Html for a sparkline or chart slot under the stat.',
    apiHref: 'https://github.com/Potti1234/creaseui/blob/main/src/ui/stat.ts',
    accessibility:
      'The delta glyph is decorative; the direction is also announced as text ("trending up") for screen readers.',
    examples: statExamples('tailwind'),
    stylexExamples: statExamples('stylex'),
    pleatExamples: statExamples('pleat'),
  },
})
