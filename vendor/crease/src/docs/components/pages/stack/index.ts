import { authoredPage } from '@/docs/components/pages/authored-page'
import { stackExamples } from '@/docs/components/pages/stack/shared'
import { stackTailwindPreviews } from '@/docs/components/pages/stack/tailwind'

const tailwindExamples = stackExamples('tailwind').map((example, index) => ({
  ...example,
  staticPreview: (stackTailwindPreviews[index] ?? stackTailwindPreviews[0])!,
}))

export const stackPage = authoredPage({
  slug: 'stack',
  title: 'Stack',
  kind: 'helper',
  previewMode: 'static',
  definition: {
    kind: 'helper',
    description:
      'Arranges children horizontally or vertically with consistent spacing and alignment. HStack and VStack are direction presets; StackItem opts individual children into fill or static sizing.',
    architecture:
      'Stack is a stateless render helper. Direction resolves hAlign/vAlign onto the flex main and cross axes; justify and align are direction-neutral aliases. Gap and padding follow the CreaseUI spacing scale (1 step = 4px) and map 1:1 onto the Tailwind spacing scale.',
    apiHref: 'https://github.com/Potti1234/creaseui/blob/main/src/ui/stack.ts',
    styling:
      'Use gap for item spacing and the padding props for inner padding. Renderer-specific layout inputs (class in Tailwind, layoutStyle in StyleX) are for positioning in the parent only.',
    accessibility:
      'Stack applies no semantics of its own. Choose a meaningful element with `as` (nav, ul, form, …) when the children form a landmark or list.',
    examples: tailwindExamples,
    stylexExamples: stackExamples('stylex'),
    pleatExamples: stackExamples('pleat'),
  },
})
