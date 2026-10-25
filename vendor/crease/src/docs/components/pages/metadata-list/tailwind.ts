import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  metadataListFixtures,
  type MetadataListItemSpec,
} from '@/docs/components/pages/metadata-list/shared'
import * as Badge from '@/ui/badge'
import * as MetadataList from '@/ui/metadata-list'

const GotMetadataListMessage = defineMessageUnion({
  GotMetadataListMessage: { message: MetadataList.Message },
})
type GotMetadataListMessage = typeof GotMetadataListMessage.Type
const MetadataListPreviewModel = S.Struct({
  _docsPage: S.Literal('metadata-list'),
  list: MetadataList.Model,
})
type MetadataListPreviewModel = typeof MetadataListPreviewModel.Type

const itemChildren = <Msg>(
  item: MetadataListItemSpec,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html | string> =>
  item.tokens === undefined
    ? [item.value ?? '']
    : [
        h.div(
          [h.Class('flex items-center gap-1')],
          [
            ...item.tokens.map(token =>
              Badge.badge({ variant: 'secondary', children: [token] }, h),
            ),
          ],
        ),
      ]

export const metadataListTailwindPreviewProgram = definePreviewProgram<
  MetadataListPreviewModel,
  GotMetadataListMessage
>({
  Model: MetadataListPreviewModel,
  Message: GotMetadataListMessage,
  init: () => ({ _docsPage: 'metadata-list', list: MetadataList.init() }),
  update: (model, message) => {
    const listOp__ = MetadataList.update(model.list, message.message)
    return { model: { ...model, list: listOp__.model } }
  },
  view: (index, model, h) => {
    const fixture = metadataListFixtures[index] ?? metadataListFixtures[0]
    const layout = MetadataList.resolveLayout({
      ...(fixture.columns === undefined ? {} : { columns: fixture.columns }),
      ...(fixture.orientation === undefined
        ? {}
        : { orientation: fixture.orientation }),
    })
    return h.div(
      [h.Class('mx-auto w-full max-w-2xl')],
      [
        MetadataList.metadataList(
          {
            model: model.list,
            toParentMessage: message =>
              GotMetadataListMessage.GotMetadataListMessage({ message }),
            id: `docs-metadata-list-${String(index)}`,
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
  },
})
