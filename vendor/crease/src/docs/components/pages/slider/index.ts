import { authoredPage } from '@/docs/components/pages/authored-page'
import { sliderExamples } from '@/docs/components/pages/slider/shared'
import { sliderTailwindPreviewProgram } from '@/docs/components/pages/slider/tailwind'

export const sliderPage = authoredPage({
  slug: 'slider',
  title: 'Slider',
  kind: 'submodel',
  previewProgram: sliderTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Selects a numeric value from a bounded range through pointer and keyboard interaction.',
    architecture:
      'Slider keeps drag/focus mechanics in a child Model and reports value changes as OutMessages. The parent delegates Messages, maps Commands, stores the emitted value, and lifts pointer/Escape subscriptions.',
    apiHref: 'https://foldkit.dev/ui/slider',
    styling:
      'Show a visible label or value when precision matters. The range recipe supports horizontal and vertical tracks without layout animation. Thumbs move independently across the full scale and may cross; the fill spans the lowest and highest values.',
    accessibility:
      'Each thumb exposes slider semantics, normalized bounds, current value, and an accessible name. formatValue supplies meaningful aria-valuetext; named controls participate in form submission.',
    keyboard: [
      ['Arrow keys', 'Changes the value by one step.'],
      ['Home / End', 'Moves to the minimum or maximum.'],
      [
        'Escape',
        'Cancels an active pointer drag through the lifted subscription.',
      ],
    ],
    examples: sliderExamples('tailwind'),
    stylexExamples: sliderExamples('stylex'),
    pleatExamples: sliderExamples('pleat'),
  },
})
