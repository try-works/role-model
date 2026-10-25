import { authoredPage } from '@/docs/components/pages/authored-page'
import { typographyExamples } from '@/docs/components/pages/typography/shared'
import { typographyTailwindPreviewProgram } from '@/docs/components/pages/typography/tailwind'

export const typographyPage = authoredPage({
  slug: 'typography',
  title: 'Typography',
  kind: 'recipe',
  previewProgram: typographyTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'Applies a consistent prose hierarchy to headings, paragraphs, quotations, code, and supporting text.',
    architecture:
      'Typography is a source-owned collection of stateless semantic helpers. Content remains ordinary Html and requires no component model.',
    apiHref: 'https://foldkit.dev/ui/overview',
    styling:
      'The helpers encode the documentation type scale. Prefer semantic elements through the matching helper and use renderer-specific layout inputs for contextual alignment or width.',
    accessibility:
      'Choose heading levels according to document outline, not visual size. Inline code and blockquotes retain their native semantics.',
    examples: typographyExamples('tailwind'),
    stylexExamples: typographyExamples('stylex'),
    pleatExamples: typographyExamples('pleat'),
  },
})
