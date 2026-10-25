import { authoredPage } from '@/docs/components/pages/authored-page'
import { visuallyHiddenExamples } from '@/docs/components/pages/visually-hidden/shared'
import { visuallyHiddenTailwindPreviewProgram } from '@/docs/components/pages/visually-hidden/tailwind'

export const visuallyHiddenPage = authoredPage({
  slug: 'visually-hidden',
  title: 'Visually Hidden',
  kind: 'helper',
  previewProgram: visuallyHiddenTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Renders content invisible to sighted users while remaining exposed to assistive technology — icon-only labels, live regions, and hidden structural headings.',
    architecture:
      'VisuallyHidden is a stateless render helper emitting the canonical clip block (1px absolute box, clip rect, nowrap). The `as` prop picks the element — span by default, div for block content or aria-live regions, heading tags for structural landmarks.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/visually-hidden.ts',
    styling:
      'The clip styles cannot be overridden — hiding is the entire contract. Pass a block element with `as` when wrapping block content.',
    accessibility:
      'This is an accessibility primitive: use it for icon-button labels, polite/assertive live regions announcing visual-only changes, and headings that give AT users navigation landmarks.',
    examples: visuallyHiddenExamples('tailwind'),
    stylexExamples: visuallyHiddenExamples('stylex'),
    pleatExamples: visuallyHiddenExamples('pleat'),
  },
})
