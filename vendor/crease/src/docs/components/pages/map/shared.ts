import { pleatExamples } from '@/docs/components/pleat-source'
import type { DocsExample } from '@/docs/components/page-definition'
import { mapDocsExamples } from '@/docs/components/pages/map/source'
export const mapFixtures = [
  {
    title: 'Basic map',
    description:
      'Start with the OpenFreeMap Positron basemap and explore Munich.',
  },
  {
    title: 'Controlled viewport',
    description:
      'Pan and zoom, read the viewport, then reset it from the application model.',
  },
] as const
const mapExamplesFor = (renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat') =>
  mapDocsExamples('map', mapFixtures, renderer)

export const mapExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, mapExamplesFor(renderer))
