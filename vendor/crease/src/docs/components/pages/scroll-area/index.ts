import { authoredPage } from '@/docs/components/pages/authored-page'
import { scrollAreaExamples } from '@/docs/components/pages/scroll-area/shared'
import { scrollAreaTailwindPreviews } from '@/docs/components/pages/scroll-area/tailwind'
const tailwindExamples = scrollAreaExamples('tailwind').map(
  (example, index) => ({
    ...example,
    staticPreview: (scrollAreaTailwindPreviews[index] ??
      scrollAreaTailwindPreviews[0])!,
  }),
)
export const scrollAreaPage = authoredPage({
  slug: 'scroll-area',
  title: 'Scroll Area',
  kind: 'helper',
  previewMode: 'static',
  definition: {
    kind: 'helper',
    description:
      'Provides a focusable overflow region with restrained native scrollbar styling.',
    architecture:
      'Scroll Area is stateless and uses native scrolling. Scroll position remains browser-owned unless the application explicitly models restoration.',
    apiHref: 'https://foldkit.dev/core/preserve-scroll',
    styling:
      'Always give the area a bounded height or width. Choose only the overflow axes the content actually needs.',
    accessibility:
      'Give meaningful standalone regions an ariaLabel. The default tabindex makes keyboard scrolling available without custom key handlers.',
    examples: tailwindExamples,
    stylexExamples: scrollAreaExamples('stylex'),
    pleatExamples: scrollAreaExamples('pleat'),
  },
})
