import { pleatExamples } from '@/docs/components/pleat-source'
import type { DocsExample } from '@/docs/components/page-definition'
import { mapDocsExamples } from '@/docs/components/pages/map/source'
export const mapGeojsonFixtures = [
  {
    title: 'Region overlay',
    description: 'Click the central Munich region to inspect its properties.',
  },
  {
    title: 'Blank map and outlines',
    description:
      'Use a tile-free canvas for a focused geographic visualization.',
  },
] as const
const mapGeojsonExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
) => mapDocsExamples('map-geojson', mapGeojsonFixtures, renderer)

export const mapGeojsonExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, mapGeojsonExamplesFor(renderer))
