import { authoredPage } from '@/docs/components/pages/authored-page'
import { selectableCardExamples } from '@/docs/components/pages/selectable-card/shared'
import { selectableCardTailwindPreviewProgram } from '@/docs/components/pages/selectable-card/tailwind'

export const selectableCardPage = authoredPage({
  slug: 'selectable-card',
  title: 'Selectable Card',
  kind: 'helper',
  previewProgram: selectableCardTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'A card that toggles between selected and unselected states with an accent border.',
    architecture:
      'Selectable Card is a stateless render helper: the parent Model owns `isSelected` and the card emits the configured `onChange` message when toggled — by pointer, Space, or Enter on the hidden checkbox.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/selectable-card.ts',
    styling:
      "Selected cards draw an inset 2px ring in the variant's hue, which composes on top of `elevation` so a selected card keeps its shadow. Chromatic `variant`s ring in the matching chart color.",
    accessibility:
      'The required `label` names the hidden checkbox input. Space toggles it natively and Enter is wired as an additional toggle.',
    examples: selectableCardExamples('tailwind'),
    stylexExamples: selectableCardExamples('stylex'),
    pleatExamples: selectableCardExamples('pleat'),
  },
})
