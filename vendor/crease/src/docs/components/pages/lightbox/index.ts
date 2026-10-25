import { authoredPage } from '@/docs/components/pages/authored-page'
import { lightboxExamples } from '@/docs/components/pages/lightbox/shared'
import { lightboxTailwindPreviewProgram } from '@/docs/components/pages/lightbox/tailwind'

export const lightboxPage = authoredPage({
  slug: 'lightbox',
  title: 'Lightbox',
  kind: 'submodel',
  previewProgram: lightboxTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A fullscreen media viewer with gallery navigation, captions, and optional zoom + pan.',
    architecture:
      'Lightbox composes the Dialog submodel with its own media state: index, zoom level, and pan offset are transient child fields; pointer, keyboard, and navigation messages all flow through Lightbox.update.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/lightbox.ts',
    styling:
      'The scrim keeps a single dark surface behind the media; controls sit on translucent circles at the edges and corners so they stay readable over any image.',
    accessibility:
      'The nested Dialog supplies Escape dismissal and focus containment. The current media alt text doubles as the dialog label; prev/next controls disable at the gallery bounds, and arrow keys pan a zoomed image or navigate when unzoomed.',
    keyboard: [
      ['Escape', 'Closes the lightbox and restores focus to the trigger.'],
      [
        'Left / Right arrows',
        'Steps to the previous or next media item when not zoomed; pans horizontally when zoomed.',
      ],
      ['Up / Down arrows', 'Pans the zoomed image vertically.'],
      ['+ / −', 'Zooms in or out when hasZoom is enabled.'],
      ['Double-click', 'Toggles between 1x and 2x zoom on the active image.'],
    ],
    examples: lightboxExamples('tailwind'),
    stylexExamples: lightboxExamples('stylex'),
    pleatExamples: lightboxExamples('pleat'),
  },
})
