import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  toastFixtures,
  type ToastFixture,
} from '@/docs/components/pages/toast/shared'
import * as Button from '@/stylex/button'
import * as Toast from '@/stylex/toast'
import { className } from '@/stylex/style'

const styles = stylex.create({
  wrap: { gap: '0.5rem', display: 'flex', flexWrap: 'wrap' },
  wrapCenter: { justifyContent: 'center' },
})

interface PreviewShape {
  readonly notifications: Toast.Model
  readonly pendingPromiseId?: unknown
}

export const toastStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const preview = model as PreviewShape
  const fixture: ToastFixture = toastFixtures[exampleIndex] ?? toastFixtures[0]
  const offset = toastFixtures
    .slice(0, exampleIndex)
    .reduce((total, candidate) => total + candidate.buttons.length, 0)
  return h.div(
    [
      h.Class(
        className(
          styles.wrap,
          ...(fixture.wrap === 'center' ? [styles.wrapCenter] : []),
        ),
      ),
    ],
    fixture.buttons
      .map((button, index) =>
        Button.button(
          {
            onClick: onMessageJson(
              JSON.stringify({
                _tag: 'ClickedToastButton',
                index: offset + index,
              }),
            ),
            variant: 'outline',
            children: [button.label],
          },
          h,
        ),
      )
      .concat([
        Toast.toast(
          {
            model: preview.notifications,
            toParentMessage: message =>
              onMessageJson(
                JSON.stringify({
                  _tag: 'GotToastPreviewMessage',
                  message,
                }),
              ),
            ariaLabel: 'Toast notifications',
            stacked: fixture.stacked !== false,
          },
          h,
        ),
      ]),
  )
}
