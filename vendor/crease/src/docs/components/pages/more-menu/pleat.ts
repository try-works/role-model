import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import { Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  fixtureOptions,
  moreMenuFixtures,
} from '@/docs/components/pages/more-menu/shared'
import * as Icon from '@/lib/icon'
import * as MoreMenu from '@/pleat/more-menu'
import { className } from '@/pleat/style'

const styles = {
  frame: Style.make({
    gap: '0.75rem',
    display: 'grid',
    justifyItems: 'center',
  }),
  status: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}

export const moreMenuPleatPreview: ExamplePreviewProvider = <Msg>(
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
