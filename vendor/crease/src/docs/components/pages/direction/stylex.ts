import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import * as Button from '@/stylex/button'
import * as Direction from '@/stylex/direction'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import { tokens } from '../../../../stylex/tokens.stylex'
const styles = stylex.create({
  row: { gap: '0.75rem', alignItems: 'center', display: 'flex' },
  token: {
    display: 'inline-block',
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
  },
  count: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
})
export const directionStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (json: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  index === 0
    ? Direction.direction(
        {
          direction: 'rtl',
          layoutStyle: styles.row as ComponentLayoutStyle,
          children: [
            Button.button(
              {
                onClick: onMessageJson(
                  JSON.stringify({ _tag: 'ClickedPreview' }),
                ),
                children: ['التالي', '←'],
              },
              h,
            ),
            h.span(
              [h.Class(stylex.props(styles.count).className ?? '')],
              [
                `Clicked ${(model as { interactionCount: number }).interactionCount} times`,
              ],
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
                layoutStyle: styles.token as ComponentLayoutStyle,
                children: ['v0.163.0'],
              },
              h,
            ),
          ],
        },
        h,
      )
