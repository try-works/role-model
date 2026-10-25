import type { HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  thumbnailFixtures,
  type ThumbnailItem,
} from '@/docs/components/pages/thumbnail/shared'
import * as Thumbnail from '@/ui/thumbnail'
import * as Lightbox from '@/ui/lightbox'
import * as Preview from './state'

const itemView = (item: ThumbnailItem, h: HtmlBuilder<Preview.Message>) =>
  Thumbnail.thumbnail(
    {
      ...(item.src === undefined ? {} : { src: item.src }),
      ...(item.alt === undefined ? {} : { alt: item.alt }),
      label: item.label,
      ...(item.isLoading === true ? { isLoading: true } : {}),
      ...(item.isDisabled === true ? { isDisabled: true } : {}),
      ...(item.hasRemove === true
        ? { onRemove: Preview.Message.RemovedThumbnail({ label: item.label }) }
        : {}),
      ...(item.hasClick === true
        ? { onClick: Preview.Message.OpenedThumbnail({ label: item.label }) }
        : {}),
      ...(item.showRemoveOn === 'always'
        ? { showRemoveOn: 'always' as const }
        : {}),
    },
    h,
  )

const caption = <Msg>(text: string, h: HtmlBuilder<Msg>) =>
  h.span([h.Class('text-xs text-muted-foreground')], [text])

const itemBlock = (item: ThumbnailItem, h: HtmlBuilder<Preview.Message>) =>
  item.caption === undefined
    ? itemView(item, h)
    : h.div(
        [h.Class('flex flex-col items-center gap-1')],
        [itemView(item, h), caption(item.caption, h)],
      )

const rowWrap = (
  items: ReadonlyArray<ThumbnailItem>,
  h: HtmlBuilder<Preview.Message>,
) =>
  h.div(
    [h.Class('flex flex-wrap items-end gap-3')],
    items.map(item => itemBlock(item, h)),
  )

export const thumbnailTailwindPreviewProgram = definePreviewProgram<
  Preview.Model,
  Preview.Message
>({
  Model: Preview.Model,
  Message: Preview.Message,
  init: Preview.init,
  update: Preview.update,
  view: (index, model, h) => {
    const fixture = thumbnailFixtures[index] ?? thumbnailFixtures[0]
    if (fixture.layout === 'single')
      return itemView(model.items[0] ?? { label: '' }, h)
    if (fixture.layout === 'sections') {
      const sections = [
        {
          label: fixture.items[0]?.caption ?? 'Enabled',
          items: model.items.filter(item => !item.isDisabled),
        },
        {
          label: fixture.items[2]?.caption ?? 'Disabled',
          items: model.items.filter(item => item.isDisabled),
        },
      ]
      return h.div(
        [h.Class('flex flex-col gap-4')],
        sections.map(section =>
          h.div(
            [h.Class('flex flex-col gap-1')],
            [
              caption(section.label, h),
              h.div(
                [h.Class('flex items-center gap-3')],
                section.items.map(item => itemView(item, h)),
              ),
            ],
          ),
        ),
      )
    }
    return h.div(
      [h.Class('flex flex-col gap-4')],
      [
        caption(fixture.heading ?? '', h),
        rowWrap(model.items, h),
        ...(model.items.some(item => item.hasClick)
          ? [
              Lightbox.lightbox(
                {
                  model: model.lightbox,
                  toParentMessage: message =>
                    Preview.Message.GotThumbnailLightboxMessage({ message }),
                  media: model.items.map(item => ({
                    src: item.src ?? '',
                    alt: item.alt ?? item.label,
                    caption: item.label,
                  })),
                },
                h,
              ),
            ]
          : []),
      ],
    )
  },
})
