import { interactionPreviewProgram } from '@/docs/components/pages/authored-page'
import * as Button from '@/ui/button'
import * as Direction from '@/ui/direction'
export const directionTailwindPreviewProgram = interactionPreviewProgram(
  'direction',
  (index, interaction, h, interactionCount) =>
    index === 0
      ? Direction.direction(
          {
            direction: 'rtl',
            class: 'flex items-center gap-3',
            children: [
              Button.button(
                { onClick: interaction, children: ['التالي', '←'] },
                h,
              ),
              h.span(
                [h.Class('text-sm text-muted-foreground')],
                [`Clicked ${interactionCount} times`],
              ),
            ],
          },
          h,
        )
      : Direction.direction(
          {
            direction: 'rtl',
            children: [
              'الإصدار ',
              Direction.direction(
                {
                  direction: 'ltr',
                  class: 'inline-block font-mono',
                  children: ['v0.163.0'],
                },
                h,
              ),
            ],
          },
          h,
        ),
)
