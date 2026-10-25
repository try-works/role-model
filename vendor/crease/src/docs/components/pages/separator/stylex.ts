import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  listItems,
  menuItems,
  separatorCopy,
  separatorFixtures,
} from '@/docs/components/pages/separator/shared'
import * as Separator from '@/stylex/separator'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import { className } from '@/stylex/style'
import { tokens } from '../../../../stylex/tokens.stylex'

const styles = stylex.create({
  card: {
    gap: '1rem',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    maxWidth: '24rem',
  },
  header: { gap: '0.375rem', display: 'flex', flexDirection: 'column' },
  title: { fontWeight: 500, lineHeight: 1 },
  muted: { color: tokens.mutedForeground },
  verticalRow: {
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    height: '1.25rem',
  },
  menuRow: {
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  menuItem: { gap: '0.25rem', display: 'flex', flexDirection: 'column' },
  heading: { fontWeight: 500 },
  note: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  hiddenBelowMd: {
    gap: '0.25rem',
    display: { default: 'none', '@media (min-width: 768px)': 'flex' },
    flexDirection: 'column',
  },
  menuItemStretch: { alignSelf: 'stretch' },
  hiddenBelowMdSep: {
    alignSelf: 'stretch',
    display: { default: 'none', '@media (min-width: 768px)': 'block' },
  },
  listStack: {
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    maxWidth: '24rem',
    width: '100%',
  },
  listRow: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
})

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

export const separatorStyleXPreview: ExamplePreviewProvider = <Msg>(
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
