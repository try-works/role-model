import { pleatExamples } from '@/docs/components/pleat-source'
import type { DocsExample } from '@/docs/components/page-definition'
import { mapDocsExamples } from '@/docs/components/pages/map/source'
export const mapRouteFixtures = [
  {
    title: 'Route between landmarks',
    description: 'Connect Marienplatz to Odeonsplatz with a GeoJSON line.',
  },
  {
    title: 'Dashed route',
    description: 'Use a dashed line and custom color for a secondary route.',
  },
] as const
const mapRouteExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
) => mapDocsExamples('map-route', mapRouteFixtures, renderer)

export const mapRouteExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, mapRouteExamplesFor(renderer))
