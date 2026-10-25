import { authoredPage } from '@/docs/components/pages/authored-page'
import { thumbnailExamples } from '@/docs/components/pages/thumbnail/shared'
import { thumbnailTailwindPreviewProgram } from '@/docs/components/pages/thumbnail/tailwind'

export const thumbnailPage = authoredPage({
  slug: 'thumbnail',
  title: 'Thumbnail',
  kind: 'helper',
  previewProgram: thumbnailTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'A small media frame for a file: image, placeholder, skeleton, or upload overlay, with optional click, remove, and disabled states.',
    architecture:
      'Thumbnail is a stateless render helper. `onClick` wraps the image in a real button, `onRemove` overlays a dismiss slot, and `showRemoveOn` chooses between always-visible and hover-revealed (`hover` is the default). `isLoading`/`isError` are model-owned props.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/thumbnail.ts',
    accessibility:
      'The frame is a labelled group; the image is aria-hidden when `alt` is empty, and `label`/`alt` combine into the accessible name.',
    examples: thumbnailExamples('tailwind'),
    stylexExamples: thumbnailExamples('stylex'),
    pleatExamples: thumbnailExamples('pleat'),
  },
})
