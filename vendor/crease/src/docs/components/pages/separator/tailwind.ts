import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  listItems,
  menuItems,
  separatorCopy,
  separatorFixtures,
} from '@/docs/components/pages/separator/shared'
import * as Separator from '@/ui/separator'

const NoOp = taggedStruct('NoOp<Separator>')
const PreviewMessage = S.Union([NoOp])
type PreviewMessage = typeof PreviewMessage.Type
const PreviewModel = S.Struct({ _docsPage: S.Literal('separator') })
type PreviewModel = typeof PreviewModel.Type

const card = (
  copy: { title: string; subtitle: string; description: string },
  rtl: boolean,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  h.div(
    [
      h.Class('flex max-w-sm flex-col gap-4 text-sm'),
      ...(rtl ? [h.Dir('rtl')] : []),
    ],
    [
      h.div(
        [h.Class('flex flex-col gap-1.5')],
        [
          h.div([h.Class('leading-none font-medium')], [copy.title]),
          h.div([h.Class('text-muted-foreground')], [copy.subtitle]),
        ],
      ),
      Separator.separator({}, h),
      h.div([], [copy.description]),
    ],
  )

export const separatorTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: () => ({ _docsPage: 'separator' }),
  update: model => ({ model }),
  view: (index, _model, h) => {
    const fixture = separatorFixtures[index] ?? separatorFixtures[0]
    switch (fixture.kind) {
      case 'demo':
      case 'rtl':
        return card(separatorCopy(fixture.kind), fixture.kind === 'rtl', h)
      case 'vertical':
        return h.div(
          [h.Class('flex h-5 items-center gap-4 text-sm')],
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
            [
              h.Class(
                hidden
                  ? 'hidden flex-col gap-1 md:flex'
                  : 'flex flex-col gap-1',
              ),
            ],
            [
              h.span([h.Class('font-medium')], [heading]),
              h.span([h.Class('text-xs text-muted-foreground')], [note]),
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
          [h.Class('flex items-center gap-2 text-sm md:gap-4')],
          [
            item(settings.heading, settings.note, false),
            Separator.separator(
              { orientation: 'vertical', class: 'self-stretch' },
              h,
            ),
            item(account.heading, account.note, false),
            Separator.separator(
              {
                orientation: 'vertical',
                class: 'hidden self-stretch md:block',
              },
              h,
            ),
            item(help.heading, help.note, true),
          ],
        )
      }
      case 'list':
        return h.div(
          [h.Class('flex w-full max-w-sm flex-col gap-2 text-sm')],
          listItems('list').flatMap((entry, i) => [
            ...(i === 0 ? [] : [Separator.separator({}, h)]),
            h.dl(
              [h.Class('flex items-center justify-between')],
              [
                h.dt([], [entry.item]),
                h.dd([h.Class('text-muted-foreground')], [entry.value]),
              ],
            ),
          ]),
        )
    }
  },
})
