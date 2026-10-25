import { Style } from '@pleat/core'
import { className } from '@/pleat/style'
import type { HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import * as Button from '@/pleat/button'
import * as Direction from '@/pleat/direction'
import type { ComponentLayoutStyle } from '@/pleat/contracts'
import { tokens } from '../../../../pleat/tokens'
const styles = {
  row: Style.make({ gap: '0.75rem', alignItems: 'center', display: 'flex' }),
  token: Style.make({
    display: 'inline-block',
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
  }),
  count: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}
export const directionPleatPreview: ExamplePreviewProvider = <Msg>(
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
              [h.Class(className(styles.count))],
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
