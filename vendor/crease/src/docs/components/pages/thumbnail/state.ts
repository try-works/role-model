import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

import { thumbnailFixtures } from './shared'
import * as Lightbox from '@/lib/lightbox'

const Item = S.Struct({
  src: S.optionalKey(S.String),
  alt: S.optionalKey(S.String),
  label: S.String,
  caption: S.optionalKey(S.String),
  isLoading: S.optionalKey(S.Boolean),
  isDisabled: S.optionalKey(S.Boolean),
  hasRemove: S.optionalKey(S.Boolean),
  showRemoveOn: S.optionalKey(S.Literals(['always', 'hover'])),
  hasClick: S.optionalKey(S.Boolean),
})

export const Model = S.Struct({
  _docsPage: S.Literal('thumbnail'),
  items: S.Array(Item),
  lightbox: Lightbox.Model,
})
export type Model = typeof Model.Type
export const Message = defineMessageUnion({
  OpenedThumbnail: { label: S.String },
  RemovedThumbnail: { label: S.String },
  GotThumbnailLightboxMessage: { message: Lightbox.Message },
})
export type Message = typeof Message.Type

export const init = (index: number): Model => {
  const fixture = thumbnailFixtures[index] ?? thumbnailFixtures[0]
  return {
    _docsPage: 'thumbnail',
    items: fixture.items,
    lightbox: Lightbox.init({
      id: `docs-thumbnail-${String(index)}-preview`,
      mediaCount: fixture.items.length,
    }),
  }
}

const mapLightbox = (
  model: Model,
  result: ReturnType<typeof Lightbox.update>,
) => ({
  model: { ...model, lightbox: result.model },
  commands: Command.mapMessages(result.commands ?? [], message =>
    Message.GotThumbnailLightboxMessage({ message }),
  ),
})

export const update = (model: Model, message: Message) => {
  switch (message._tag) {
    case 'OpenedThumbnail': {
      const index = model.items.findIndex(item => item.label === message.label)
      const item = model.items[index]
      if (!item?.hasClick || item.isDisabled || item.isLoading) return { model }
      return mapLightbox(model, Lightbox.open(model.lightbox, index))
    }
    case 'RemovedThumbnail': {
      const item = model.items.find(item => item.label === message.label)
      if (!item?.hasRemove || item.isDisabled) return { model }
      const items = model.items.filter(item => item.label !== message.label)
      return {
        model: {
          ...model,
          items,
          lightbox: {
            ...model.lightbox,
            mediaCount: Math.max(1, items.length),
            index: Math.min(
              model.lightbox.index,
              Math.max(0, items.length - 1),
            ),
          },
        },
      }
    }
    case 'GotThumbnailLightboxMessage':
      return mapLightbox(
        model,
        Lightbox.update(model.lightbox, message.message),
      )
  }
}
