import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { fieldStatusFixtures } from '@/docs/components/pages/field-status/shared'
import * as FieldStatus from '@/stylex/field-status'
import { className } from '@/stylex/style'

const styles = stylex.create({
  stack: {
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '28rem',
    width: '100%',
  },
})

export const fieldStatusStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = fieldStatusFixtures[exampleIndex] ?? fieldStatusFixtures[0]
  return h.div(
    [h.Class(className(styles.stack))],
    [
      ...fixture.items.map(item =>
        FieldStatus.fieldStatus(
          {
            type: item.type,
            message: item.message,
            ...(item.variant === undefined ? {} : { variant: item.variant }),
          },
          h,
        ),
      ),
    ],
  )
}
