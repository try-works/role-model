import { pleatExamples } from '@/docs/components/pleat-source'
import type { DocsExample } from '@/docs/components/page-definition'
import { mapDocsExamples } from '@/docs/components/pages/map/source'
export const mapMarkerFixtures = [
  {
    title: 'Markers and labels',
    description:
      'Place labeled landmarks and focus or hover a marker to see its tooltip.',
  },
  {
    title: 'Draggable marker',
    description:
      'Drag the marker and store its coordinates from MapMarkerDragged.',
  },
] as const
const mapMarkerExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
) => mapDocsExamples('map-marker', mapMarkerFixtures, renderer)

export const mapMarkerExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, mapMarkerExamplesFor(renderer))
