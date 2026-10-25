import { authoredPage } from '@/docs/components/pages/authored-page'
import { inputOtpExamples } from '@/docs/components/pages/input-otp/shared'
import { inputOtpTailwindPreviewProgram } from '@/docs/components/pages/input-otp/tailwind'

export const inputOtpPage = authoredPage({
  slug: 'input-otp',
  title: 'Input OTP',
  kind: 'helper',
  previewProgram: inputOtpTailwindPreviewProgram,
  definition: {
    kind: 'helper',
    description:
      'Captures a short verification code through one accessible input rendered as distinct visual slots.',
    architecture:
      'Input OTP is controlled and stateless. Store the normalized code string in the parent Model; onInput emits only characters accepted by pattern up to length.',
    apiHref: 'https://foldkit.dev/ui/input',
    styling:
      'The visual slots are presentation. Keep the hidden native input as the sole editable control and use separator only to clarify meaningful groups.',
    accessibility:
      'The slots are aria-hidden while the real input carries the label, invalid state, autocomplete hint, and keyboard behavior.',
    keyboard: [
      [
        'Typing / paste',
        'Filters input through pattern and truncates it to length.',
      ],
      ['Backspace', 'Removes the preceding character from the native input.'],
    ],
    examples: inputOtpExamples('tailwind'),
    stylexExamples: inputOtpExamples('stylex'),
    pleatExamples: inputOtpExamples('pleat'),
  },
})
