import { authoredPage } from '@/docs/components/pages/authored-page'
import { indicatorExamples } from '@/docs/components/pages/indicator/shared'
import { indicatorTailwindPreviewProgram } from '@/docs/components/pages/indicator/tailwind'

export const indicatorPage = authoredPage({
  slug: 'indicator',
  title: 'Indicator',
  kind: 'helper',
  previewProgram: indicatorTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Decorative selection indicators — the check mark, checkbox box, and radio circle a control renders inside itself.',
    architecture:
      'Indicator is a set of stateless render helpers. The owning control supplies the state, size, and disabled flag; indicators stay aria-hidden while the host carries the role and accessible name.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/indicator.ts',
    styling:
      'Hover tints engage when the host row opts in with the `group/indicator` class (Tailwind) or when the indicator itself is hovered (StyleX).',
    accessibility:
      'Each indicator is aria-hidden: the parent control must keep the checkbox/radio role, checked state, and label.',
    examples: indicatorExamples('tailwind'),
    stylexExamples: indicatorExamples('stylex'),
    pleatExamples: indicatorExamples('pleat'),
  },
})
