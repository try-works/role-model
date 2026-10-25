import { pleatExamples } from '@/docs/components/pleat-source'
import type { DocsExample } from '@/docs/components/page-definition'
import { mapDocsExamples } from '@/docs/components/pages/map/source'
export const mapArcFixtures = [
  {
    title: 'City connection',
    description: 'Connect Munich and Paris with a sampled curve.',
  },
  {
    title: 'Reverse curvature',
    description:
      'Change curvature and color to distinguish another connection.',
  },
] as const
const mapArcExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
) => mapDocsExamples('map-arc', mapArcFixtures, renderer)

export const mapArcExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, mapArcExamplesFor(renderer))
