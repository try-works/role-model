import { authoredPage } from '@/docs/components/pages/authored-page'
import { fileInputExamples } from '@/docs/components/pages/file-input/shared'
import { fileInputTailwindPreviewProgram } from '@/docs/components/pages/file-input/tailwind'

export const fileInputPage = authoredPage({
  slug: 'file-input',
  title: 'File Input',
  kind: 'submodel',
  previewProgram: fileInputTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'A file select/dropzone with accept, size, and count validation, in dropzone or compact input modes.',
    architecture:
      'File Input is a submodel wrapping @foldkit/ui FileDrop: its Model owns drag state plus validation config; accepted files report ChangedValue OutMessages to the parent.',
    apiHref:
      'https://github.com/Potti1234/creaseui/blob/main/src/ui/file-input.ts',
    styling:
      'Dropzone renders a dashed bordered area that tints on drag-over; compact mode renders a browse button with the selected file names.',
    accessibility:
      'The trigger is a labelled button that activates a visually-hidden native file input; validation failures surface as error status text.',
    examples: fileInputExamples('tailwind'),
    stylexExamples: fileInputExamples('stylex'),
    pleatExamples: fileInputExamples('pleat'),
  },
})
