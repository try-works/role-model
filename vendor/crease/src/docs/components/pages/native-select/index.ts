import { authoredPage } from '@/docs/components/pages/authored-page'
import { nativeSelectExamples } from '@/docs/components/pages/native-select/shared'
import { nativeSelectTailwindPreviewProgram } from '@/docs/components/pages/native-select/tailwind'

export const nativeSelectPage = authoredPage({
  slug: 'native-select',
  title: 'Native Select',
  kind: 'helper',
  previewProgram: nativeSelectTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Styles the browser-native select while keeping its familiar platform interaction and form behavior.',
    architecture:
      'Native Select is a controlled stateless helper. Keep the selected string in the parent Model and replace it with the value emitted by onChange.',
    apiHref: 'https://foldkit.dev/ui/select',
    styling:
      'Use the native control when platform behavior and compact forms matter more than custom listbox composition.',
    accessibility:
      'Provide label text for visible forms. Foldkit links label and description content to the select and forwards invalid and disabled state.',
    keyboard: [
      ['Arrow keys', 'Moves through the browser-native option list.'],
      ['Space / Enter', 'Opens the platform picker where supported.'],
    ],
    examples: nativeSelectExamples('tailwind'),
    stylexExamples: nativeSelectExamples('stylex'),
    pleatExamples: nativeSelectExamples('pleat'),
  },
})
