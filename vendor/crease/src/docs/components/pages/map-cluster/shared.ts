import { pleatExamples } from '@/docs/components/pleat-source'
import type { DocsExample } from '@/docs/components/page-definition'
import { mapDocsExamples } from '@/docs/components/pages/map/source'
export const mapClusterFixtures = [
  {
    title: 'Clustered locations',
    description:
      'Click a cluster to expand its 120 deterministic Munich locations.',
  },
  {
    title: 'Custom cluster styling',
    description:
      'Change the cluster radius and colors to suit your data density.',
  },
] as const
const mapClusterExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
) => mapDocsExamples('map-cluster', mapClusterFixtures, renderer)

export const mapClusterExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, mapClusterExamplesFor(renderer))
