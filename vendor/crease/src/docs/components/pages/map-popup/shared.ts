import { pleatExamples } from '@/docs/components/pleat-source'
import type { DocsExample } from '@/docs/components/page-definition'
import { mapDocsExamples } from '@/docs/components/pages/map/source'
export const mapPopupFixtures = [
  {
    title: 'Marker popup',
    description:
      'Open a place popup by clicking its marker and close it with the close button.',
  },
  {
    title: 'Standalone popup',
    description:
      'Anchor a popup anywhere on the map and reopen it from the application.',
  },
] as const
const mapPopupExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
) => mapDocsExamples('map-popup', mapPopupFixtures, renderer)

export const mapPopupExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, mapPopupExamplesFor(renderer))
