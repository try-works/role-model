import { authoredPage } from '@/docs/components/pages/authored-page'
import { colorPickerExamples } from '@/docs/components/pages/color-picker/shared'
import { colorPickerTailwindPreviewProgram } from '@/docs/components/pages/color-picker/tailwind'

export const colorPickerPage = authoredPage({
  slug: 'color-picker',
  title: 'Color Picker',
  kind: 'submodel',
  previewProgram: colorPickerTailwindPreviewProgram,
  definition: {
    kind: 'submodel',
    description:
      'Selects a color through a saturation/value area, hue and alpha sliders, format-aware input, and an eyedropper.',
    architecture:
      'Color Picker keeps HSV state, format, draft input text and drag tracking in a child Model and reports formatted value changes as OutMessages. The parent delegates Messages, maps Commands, stores the emitted string, and lifts the pointer-drag subscription.',
    styling:
      'Use the swatch trigger for compact toolbar placement, triggerButtonVariant for a labeled button, or inline for embedded editors. The panel is a popover surface: keep it 16rem wide and let the area carry the visual weight.',
    accessibility:
      'The area exposes a single slider focus target whose arrow keys nudge saturation horizontally and value vertically; hue and alpha tracks are sliders, and the input is labeled by its format select. Escape closes the popover.',
    keyboard: [
      ['Arrow keys', 'Nudges the focused channel by one unit.'],
      ['Shift + Arrow keys', 'Nudges the focused channel by ten units.'],
      ['PageUp / PageDown', 'Nudges the focused channel by ten units.'],
      ['Escape', 'Cancels the active drag and closes the popover.'],
    ],
    examples: colorPickerExamples('tailwind'),
    stylexExamples: colorPickerExamples('stylex'),
    pleatExamples: colorPickerExamples('pleat'),
  },
})
