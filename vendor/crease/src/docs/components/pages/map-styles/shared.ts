import { pleatExamples } from '@/docs/components/pleat-source'
import type { DocsExample } from '@/docs/components/page-definition'
import { mapDocsExamples } from '@/docs/components/pages/map/source'
export const mapStylesFixtures = [
  {
    title: 'Basemap styles',
    description:
      'Switch between Positron, Liberty, Bright, and Dark without losing map state.',
  },
  {
    title: 'Custom palette',
    description:
      'Switch between cool and warm palettes using the Crease UI semantic map colors.',
  },
] as const
const mapStylesExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
) => mapDocsExamples('map-styles', mapStylesFixtures, renderer)

export const mapStylesExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, mapStylesExamplesFor(renderer))
