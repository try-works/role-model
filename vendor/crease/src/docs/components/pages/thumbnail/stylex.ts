import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  thumbnailFixtures,
  type ThumbnailItem,
} from '@/docs/components/pages/thumbnail/shared'
import { className } from '@/stylex/style'
import { tokens } from '../../../../stylex/tokens.stylex'
import * as Thumbnail from '@/stylex/thumbnail'
import * as Lightbox from '@/stylex/lightbox'
import * as Preview from './state'

const styles = stylex.create({
  column: { gap: '1rem', display: 'flex', flexDirection: 'column' },
  section: { gap: '0.25rem', display: 'flex', flexDirection: 'column' },
  row: {
    gap: '0.75rem',
    alignItems: 'flex-end',
    display: 'flex',
    flexWrap: 'wrap',
  },
  rowCenter: { gap: '0.75rem', alignItems: 'center', display: 'flex' },
  item: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  caption: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
})

const itemView = <Msg>(
  item: ThumbnailItem,
  emit: (message: Preview.Message) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  Thumbnail.thumbnail(
    {
      ...(item.src === undefined ? {} : { src: item.src }),
      ...(item.alt === undefined ? {} : { alt: item.alt }),
      label: item.label,
      ...(item.isLoading === true ? { isLoading: true } : {}),
      ...(item.isDisabled === true ? { isDisabled: true } : {}),
      ...(item.hasRemove === true
        ? {
            onRemove: emit(
              Preview.Message.RemovedThumbnail({ label: item.label }),
            ),
          }
        : {}),
      ...(item.hasClick === true
        ? {
            onClick: emit(
              Preview.Message.OpenedThumbnail({ label: item.label }),
            ),
          }
        : {}),
      ...(item.showRemoveOn === 'always'
        ? { showRemoveOn: 'always' as const }
        : {}),
    },
    h,
  )

export const thumbnailStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = thumbnailFixtures[exampleIndex] ?? thumbnailFixtures[0]
  const preview = model as Preview.Model
  const emit = (message: Preview.Message): Msg =>
    onMessageJson(JSON.stringify(message))
  const caption = (text: string) =>
    h.span([h.Class(className(styles.caption))], [text])
  const itemBlock = (item: ThumbnailItem) =>
    item.caption === undefined
      ? itemView(item, emit, h)
      : h.div(
          [h.Class(className(styles.item))],
          [itemView(item, emit, h), caption(item.caption)],
        )
  if (fixture.layout === 'single')
    return itemView(preview.items[0] ?? { label: '' }, emit, h)
  if (fixture.layout === 'sections') {
    const sections = [
      {
        label: fixture.items[0]?.caption ?? 'Enabled',
        items: preview.items.filter(item => !item.isDisabled),
      },
      {
        label: fixture.items[2]?.caption ?? 'Disabled',
        items: preview.items.filter(item => item.isDisabled),
      },
    ]
    return h.div(
      [h.Class(className(styles.column))],
      sections.map(section =>
        h.div(
          [h.Class(className(styles.section))],
          [
            caption(section.label),
            h.div(
              [h.Class(className(styles.rowCenter))],
              section.items.map(item => itemView(item, emit, h)),
            ),
          ],
        ),
      ),
    )
  }
  return h.div(
    [h.Class(className(styles.column))],
    [
      caption(fixture.heading ?? ''),
      h.div(
        [h.Class(className(styles.row))],
        preview.items.map(item => itemBlock(item)),
      ),
      ...(preview.items.some(item => item.hasClick)
        ? [
            Lightbox.lightbox(
              {
                model: preview.lightbox,
                toParentMessage: message =>
                  emit(
                    Preview.Message.GotThumbnailLightboxMessage({ message }),
                  ),
                media: preview.items.map(item => ({
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
}
