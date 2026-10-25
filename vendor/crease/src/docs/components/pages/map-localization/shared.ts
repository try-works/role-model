import { pleatExamples } from '@/docs/components/pleat-source'
import type { DocsExample } from '@/docs/components/page-definition'
import { mapDocsExamples } from '@/docs/components/pages/map/source'
export const mapLocalizationFixtures = [
  {
    title: 'Localized map',
    description:
      'Start in English and switch map labels and controls to German, French, or local names.',
  },
  {
    title: 'Control translations',
    description:
      'Provide custom translations for controls and status messages in your application.',
  },
] as const
const mapLocalizationExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
) => mapDocsExamples('map-localization', mapLocalizationFixtures, renderer)

export const mapLocalizationExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, mapLocalizationExamplesFor(renderer))
