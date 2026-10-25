import { authoredPage } from '@/docs/components/pages/authored-page'
import { fieldStatusExamples } from '@/docs/components/pages/field-status/shared'
import { fieldStatusTailwindPreviewProgram } from '@/docs/components/pages/field-status/tailwind'

export const fieldStatusPage = authoredPage({
  slug: 'field-status',
  title: 'Field Status',
  kind: 'helper',
  previewProgram: fieldStatusTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'A validation message shown under form controls, in warning, error, and success types.',
    architecture:
      'Field Status is a stateless render helper. The parent supplies the status type, message text, and variant; the component renders the colored strip — `attached` overlaps the control above it inside a Field, `detached` floats below with a leading status icon.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/field-status.ts',
    styling:
      '`attached` is the default and visually merges with the control above via a 6px overlap and bottom radii; `detached` is a standalone tinted strip for custom controls.',
    accessibility:
      'Detached messages lead with a status icon so meaning is not conveyed by color alone. CreaseUI renders these messages statically; applications should provide a live region when dynamic status changes need to be announced.',
    examples: fieldStatusExamples('tailwind'),
    stylexExamples: fieldStatusExamples('stylex'),
    pleatExamples: fieldStatusExamples('pleat'),
  },
})
