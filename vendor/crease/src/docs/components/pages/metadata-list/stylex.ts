import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  metadataListFixtures,
  type MetadataListItemSpec,
} from '@/docs/components/pages/metadata-list/shared'
import * as Badge from '@/stylex/badge'
import * as MetadataList from '@/stylex/metadata-list'
import { className } from '@/stylex/style'

const styles = stylex.create({
  frame: {
    marginInline: 'auto',
    maxWidth: '42rem',
    width: '100%',
  },
  tokenRow: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
  },
})

const itemChildren = <Msg>(
  item: MetadataListItemSpec,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html | string> =>
  item.tokens === undefined
    ? [item.value ?? '']
    : [
        h.div(
          [h.Class(className(styles.tokenRow))],
          [
            ...item.tokens.map(token =>
              Badge.badge({ variant: 'secondary', children: [token] }, h),
            ),
          ],
        ),
      ]

export const metadataListStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = metadataListFixtures[exampleIndex] ?? metadataListFixtures[0]
  const previewModel = model as { list: MetadataList.Model }
  const layout = MetadataList.resolveLayout({
    ...(fixture.columns === undefined ? {} : { columns: fixture.columns }),
    ...(fixture.orientation === undefined
      ? {}
      : { orientation: fixture.orientation }),
  })
  return h.div(
    [h.Class(className(styles.frame))],
    [
      MetadataList.metadataList(
        {
          model: previewModel.list,
          toParentMessage: message =>
            onMessageJson(
              JSON.stringify({ _tag: 'GotMetadataListMessage', message }),
            ),
          id: `docs-metadata-list-${String(exampleIndex)}`,
          ...(fixture.columns === undefined
            ? {}
            : { columns: fixture.columns }),
          ...(fixture.orientation === undefined
            ? {}
            : { orientation: fixture.orientation }),
          ...(fixture.maxNumOfItems === undefined
            ? {}
            : { maxNumOfItems: fixture.maxNumOfItems }),
          children: fixture.items.map(item =>
            MetadataList.metadataListItem(
              {
                label: item.label,
                stacked: layout.isStacked,
                children: itemChildren(item, h),
              },
              h,
            ),
          ),
        },
        h,
      ),
    ],
  )
}
