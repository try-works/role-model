import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  listItems,
  menuItems,
  separatorCopy,
  separatorFixtures,
} from '@/docs/components/pages/separator/shared'
import * as Separator from '@/pleat/separator'
import type { ComponentLayoutStyle } from '@/pleat/contracts'
import { className } from '@/pleat/style'
import { tokens } from '../../../../pleat/tokens'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  card: Style.make({
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    maxWidth: '24rem',
  }),
  header: Style.make({
    gap: '0.375rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  title: Style.make({ fontWeight: 500, lineHeight: 1 }),
  muted: Style.make({ color: tokens.mutedForeground }),
  verticalRow: Style.make({
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    height: '1.25rem',
  }),
  menuRow: Style.make({
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  menuItem: Style.make({
    gap: '0.25rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  heading: Style.make({ fontWeight: 500 }),
  note: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  }),
  hiddenBelowMd: Style.make({
    gap: '0.25rem',
    display: 'none',
    flexDirection: 'column',
  }).pipe(Style.when(When.minWidth('768px'), { display: 'flex' })),
  menuItemStretch: layoutStyle({ alignSelf: 'stretch' }),
  hiddenBelowMdSep: Style.make({ alignSelf: 'stretch', display: 'none' }).pipe(
    Style.when(When.minWidth('768px'), { display: 'block' }),
  ),
  listStack: Style.make({
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    maxWidth: '24rem',
    width: '100%',
  }),
  listRow: Style.make({
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  }),
}

const card = <Msg>(
  copy: { title: string; subtitle: string; description: string },
  rtl: boolean,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class(className(styles.card)), ...(rtl ? [h.Dir('rtl')] : [])],
    [
      h.div(
        [h.Class(className(styles.header))],
        [
          h.div([h.Class(className(styles.title))], [copy.title]),
          h.div([h.Class(className(styles.muted))], [copy.subtitle]),
        ],
      ),
      Separator.separator({}, h),
      h.div([], [copy.description]),
    ],
  )

export const separatorPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = separatorFixtures[exampleIndex] ?? separatorFixtures[0]
  switch (fixture.kind) {
    case 'demo':
    case 'rtl':
      return card(separatorCopy(fixture.kind), fixture.kind === 'rtl', h)
    case 'vertical':
      return h.div(
        [h.Class(className(styles.verticalRow))],
        [
          h.div([], ['Blog']),
          Separator.separator({ orientation: 'vertical' }, h),
          h.div([], ['Docs']),
          Separator.separator({ orientation: 'vertical' }, h),
          h.div([], ['Source']),
        ],
      )
    case 'menu': {
      const item = (heading: string, note: string, hidden: boolean): Html =>
        h.div(
          [h.Class(className(hidden ? styles.hiddenBelowMd : styles.menuItem))],
          [
            h.span([h.Class(className(styles.heading))], [heading]),
            h.span([h.Class(className(styles.note))], [note]),
          ],
        )
      const [settings, account, help] = menuItems('menu')
      if (
        settings === undefined ||
        account === undefined ||
        help === undefined
      ) {
        return h.div([], [])
      }
      return h.div(
        [h.Class(className(styles.menuRow))],
        [
          item(settings.heading, settings.note, false),
          Separator.separator(
            { orientation: 'vertical', layoutStyle: styles.menuItemStretch },
            h,
          ),
          item(account.heading, account.note, false),
          Separator.separator(
            {
              orientation: 'vertical',
              layoutStyle: styles.hiddenBelowMdSep as ComponentLayoutStyle,
            },
            h,
          ),
          item(help.heading, help.note, true),
        ],
      )
    }
    case 'list':
      return h.div(
        [h.Class(className(styles.listStack))],
        listItems('list').flatMap((entry, i) => [
          ...(i === 0 ? [] : [Separator.separator({}, h)]),
          h.dl(
            [h.Class(className(reset.text, styles.listRow))],
            [
              h.dt([], [entry.item]),
              h.dd(
                [h.Class(className(reset.text, styles.muted))],
                [entry.value],
              ),
            ],
          ),
        ]),
      )
  }
}
