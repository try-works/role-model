import { authoredPage } from '@/docs/components/pages/authored-page'
import { carouselExamples } from '@/docs/components/pages/carousel/shared'
import { carouselTailwindPreviewProgram } from '@/docs/components/pages/carousel/tailwind'
export const carouselPage = authoredPage({
  slug: 'carousel',
  title: 'Carousel',
  kind: 'submodel',
  previewProgram: carouselTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Presents an ordered set of slides with swipe, button, and keyboard navigation powered by Embla.',
    architecture:
      'Embla exclusively owns snap, drag, and loop mechanics inside one shared OnMount resource. The serializable child Model stores only its observed selection; WentTo Messages synchronize that fact with the parent, and unmount destroys Embla and every listener.',
    apiHref: 'https://foldkit.dev/core/on-mount',
    composition:
      'Carousel region\n├── CarouselContent (Embla OnMount stream)\n│   └── CarouselItem[]\n├── previous button\n└── next button',
    styling:
      'Reserve enough surrounding space for the controls and choose itemSize deliberately. Plugins, including autoplay, are disabled when reduced motion is requested; any autoplay UI must also provide a visible pause control.',
    accessibility:
      'The region and slides expose carousel/slide descriptions, slide positions, and named direction controls. Keyboard navigation can be disabled only when another complete input path exists.',
    keyboard: [
      ['Arrow keys', 'Moves to the previous or next snap on the active axis.'],
      ['Home / End', 'Moves to the first or last snap.'],
    ],
    examples: carouselExamples('tailwind'),
    stylexExamples: carouselExamples('stylex'),
    pleatExamples: carouselExamples('pleat'),
  },
})
