import { authoredPage } from '@/docs/components/pages/authored-page'
import { resizableExamples } from '@/docs/components/pages/resizable/shared'
import { resizableTailwindPreviewProgram } from '@/docs/components/pages/resizable/tailwind'
export const resizablePage = authoredPage({
  slug: 'resizable',
  title: 'Resizable',
  kind: 'submodel',
  previewProgram: resizableTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Lets users allocate space between adjacent panels with pointer or keyboard input.',
    architecture:
      'Resizable owns drag state and the first panel percentage in a child Model. Wrap its Messages and delegate through Resizable.update; unlike Slider, pointer tracking stays on the rendered group and requires no global subscription.',
    apiHref: 'https://foldkit.dev/ui/resizable',
    composition:
      'Resizable panel group\n├── first panel\n├── separator handle\n└── second panel',
    styling:
      'Give the group an explicit block size and pass its pixel extent so pointer deltas map accurately to percentages. Set domain-appropriate minimum and maximum sizes.',
    accessibility:
      'The focusable separator exposes orientation, current percentage, bounds, and disabled state. Keyboard resizing is available without pointer precision.',
    keyboard: [
      ['Arrow keys', 'Nudges the split in the axis direction.'],
      ['Home / End', 'Moves the split to its configured minimum or maximum.'],
    ],
    examples: resizableExamples('tailwind'),
    stylexExamples: resizableExamples('stylex'),
    pleatExamples: resizableExamples('pleat'),
  },
})
