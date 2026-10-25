import { authoredPage } from '@/docs/components/pages/authored-page'
import { fieldExamples } from '@/docs/components/pages/field/shared'
import { fieldTailwindPreviewProgram } from '@/docs/components/pages/field/tailwind'
export const fieldPage = authoredPage({
  slug: 'field',
  title: 'Field',
  kind: 'recipe',
  previewProgram: fieldTailwindPreviewProgram,
  definition: {
    kind: 'recipe',
    description:
      'Composes a label, control, description, and validation feedback into a consistent accessible field.',
    architecture:
      'Field is a stateless feature composition helper with no submitted value or child Model. controlField derives deterministic control, label, description, and error IDs from one stable id, guarantees their structure, and passes typed parts to the parent-rendered control. Validation values and Commands remain parent-owned.',
    apiHref: 'https://foldkit.dev/ui/input',
    composition:
      'FieldGroup\n└── Field\n    ├── FieldLabel / FieldTitle\n    ├── control\n    ├── FieldDescription\n    └── FieldError',
    styling:
      'Use vertical fields for most forms, horizontal fields for compact binary choices, and responsive orientation only inside a FieldGroup container.',
    accessibility:
      'Prefer controlField so label, description, and alert IDs cannot drift. Forward its typed controlId, describedBy, invalid, and disabled values to the control. Low-level parts remain available for unusual compositions but require manual linkage.',
    examples: fieldExamples('tailwind'),
    stylexExamples: fieldExamples('stylex'),
    pleatExamples: fieldExamples('pleat'),
  },
})
