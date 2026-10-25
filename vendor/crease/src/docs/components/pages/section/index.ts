import { authoredPage } from '@/docs/components/pages/authored-page'
import { sectionExamples } from '@/docs/components/pages/section/shared'
import { sectionTailwindPreviews } from '@/docs/components/pages/section/tailwind'

const tailwindExamples = sectionExamples('tailwind').map((example, index) => ({
  ...example,
  staticPreview: (sectionTailwindPreviews[index] ??
    sectionTailwindPreviews[0])!,
}))

export const sectionPage = authoredPage({
  slug: 'section',
  title: 'Section',
  kind: 'helper',
  previewMode: 'static',
  definition: {
    kind: 'helper',
    description:
      'A padded page section with surface variants (section, muted, transparent) and optional edge dividers for separating stacked regions.',
    architecture:
      'Section is a stateless render helper emitting a single <section>. Padding follows the CreaseUI spacing scale with the theme default of step 4 (16px); per-edge overrides cascade edge → axis → all.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/section.ts',
    styling:
      'Use variant for background and dividers for separation between adjacent same-variant sections. The padding props accept the spacing scale; combine with Section or Stack children for inner rhythm.',
    accessibility:
      'Section renders a <section> landmark — give landmark regions an accessible heading inside so they are navigable by assistive technology.',
    examples: tailwindExamples,
    stylexExamples: sectionExamples('stylex'),
    pleatExamples: sectionExamples('pleat'),
  },
})
