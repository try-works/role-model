import { authoredPage } from '@/docs/components/pages/authored-page'
import { progressExamples } from '@/docs/components/pages/progress/shared'
import { progressTailwindPreviewProgram } from '@/docs/components/pages/progress/tailwind'

export const progressPage = authoredPage({
  slug: 'progress',
  title: 'Progress',
  kind: 'helper',
  previewProgram: progressTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Shows the completion of a task as a determinate or indeterminate horizontal indicator.',
    architecture:
      'Progress is a stateless projection of a value in the parent Model. Commands update that value; the view only renders it.',
    apiHref: 'https://foldkit.dev/ui/overview',
    styling:
      'The root owns the track and the indicator uses a transform, keeping updates compositor-friendly.',
    accessibility:
      'The component exposes progressbar semantics and clamps determinate values to 0–100. Indeterminate progress omits aria-valuenow.',
    examples: progressExamples('tailwind'),
    stylexExamples: progressExamples('stylex'),
    pleatExamples: progressExamples('pleat'),
  },
})
