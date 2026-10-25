import { authoredPage } from '@/docs/components/pages/authored-page'
import { badgeExamples } from '@/docs/components/pages/badge/shared'
import { badgeTailwindPreviewProgram } from '@/docs/components/pages/badge/tailwind'

export const badgePage = authoredPage({
  slug: 'badge',
  title: 'Badge',
  kind: 'helper',
  previewProgram: badgeTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Displays a compact status, category, or count next to related content.',
    architecture:
      'Badge is a stateless render helper. Its content comes from the parent Model and it returns Html directly.',
    apiHref: 'https://foldkit.dev/ui/overview',
    styling:
      'Choose a semantic variant and keep labels short. Use renderer-specific layout inputs only for local positioning.',
    accessibility:
      'Badge text should make sense without color. Do not use a badge as the only label for an interactive control.',
    examples: badgeExamples('tailwind'),
    stylexExamples: badgeExamples('stylex'),
    pleatExamples: badgeExamples('pleat'),
  },
})
