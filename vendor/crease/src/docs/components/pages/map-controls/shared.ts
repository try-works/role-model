import { pleatExamples } from '@/docs/components/pleat-source'
import type { DocsExample } from '@/docs/components/page-definition'
import { mapDocsExamples } from '@/docs/components/pages/map/source'
export const mapControlsFixtures = [
  {
    title: 'Navigation controls',
    description:
      'Zoom, reset north, or enter fullscreen with keyboard-accessible buttons.',
  },
  {
    title: 'Location and fullscreen',
    description:
      'Move controls to another corner and request your location on demand.',
  },
] as const
const mapControlsExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
) => mapDocsExamples('map-controls', mapControlsFixtures, renderer)

export const mapControlsExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, mapControlsExamplesFor(renderer))
