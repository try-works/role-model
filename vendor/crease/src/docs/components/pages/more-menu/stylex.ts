import { reset } from '@/stylex/reset'
import { Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  fixtureOptions,
  moreMenuFixtures,
} from '@/docs/components/pages/more-menu/shared'
import * as Icon from '@/lib/icon'
import * as MoreMenu from '@/stylex/more-menu'
import { className } from '@/stylex/style'

const styles = stylex.create({
  frame: { gap: '0.75rem', display: 'grid', justifyItems: 'center' },
  status: {
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
})

export const moreMenuStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = moreMenuFixtures[exampleIndex] ?? moreMenuFixtures[0]
  const previewModel = model as {
    menu: MoreMenu.Model
    maybeLastAction: Option.Option<string>
  }
  return h.div(
    [h.Class(className(styles.frame))],
    [
      MoreMenu.moreMenu(
        {
          model: previewModel.menu,
          toParentMessage: message =>
            onMessageJson(
              JSON.stringify({ _tag: 'GotMoreMenuMessage', message }),
            ),
          items: fixtureOptions(fixture, name => Icon.icon(name, {}, h)),
          ...(fixture.variant === undefined
            ? {}
            : { variant: fixture.variant }),
          ...(fixture.label === undefined ? {} : { label: fixture.label }),
        },
        h,
      ),
      h.p(
        [h.Role('status'), h.Class(className(reset.text, styles.status))],
        [
          Option.match(previewModel.maybeLastAction, {
            onNone: () => 'No action selected.',
            onSome: action => `Selected: ${action}`,
          }),
        ],
      ),
    ],
  )
}
