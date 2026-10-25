import { authoredPage } from '@/docs/components/pages/authored-page'
import { collapsibleExamples } from '@/docs/components/pages/collapsible/shared'
import { collapsibleTailwindPreviewProgram } from '@/docs/components/pages/collapsible/tailwind'

export const collapsiblePage = authoredPage({
  slug: 'collapsible',
  title: 'Collapsible',
  kind: 'helper',
  previewProgram: collapsibleTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Shows or hides one region of content from a controlled disclosure button.',
    architecture:
      'Collapsible adapts Foldkit’s stateless Disclosure helper. Store isOpen in the parent Model and return the next value through onToggle; no child submodel is needed.',
    apiHref: 'https://foldkit.dev/ui/disclosure',
    styling:
      'Use the renderer-specific typed trigger and content styling hooks for the two rendered regions. Height animation is coordinated by the primitive without hidden application state.',
    accessibility:
      'The trigger and panel receive linked disclosure attributes, including expanded state and panel identity. Keep the trigger label meaningful in both states.',
    keyboard: [
      ['Enter / Space', 'Toggles the disclosure from its focused trigger.'],
    ],
    examples: collapsibleExamples('tailwind'),
    stylexExamples: collapsibleExamples('stylex'),
    pleatExamples: collapsibleExamples('pleat'),
  },
})
