import { Schema as S } from 'effect'
import { Command } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import type { Html } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  type LightboxFixture,
  galleryMedia,
  lightboxFixtures,
  mediaCountFor,
  mediaFor,
} from '@/docs/components/pages/lightbox/shared'
import * as Button from '@/ui/button'
import * as Lightbox from '@/ui/lightbox'

const LightboxPreviewMessage = defineMessageUnion({
  ClickedOpenLightboxPreview: {},
  ClickedOpenLightboxAt: { index: S.Number },
  GotLightboxPreviewMessage: { message: Lightbox.Message },
})
type LightboxPreviewMessage = typeof LightboxPreviewMessage.Type

const LightboxPreviewModel = S.Struct({
  _docsPage: S.Literal('lightbox'),
  lightbox: Lightbox.Model,
})
type LightboxPreviewModel = typeof LightboxPreviewModel.Type

export const lightboxTailwindPreviewProgram = definePreviewProgram<
  LightboxPreviewModel,
  LightboxPreviewMessage
>({
  Model: LightboxPreviewModel,
  Message: LightboxPreviewMessage,
  init: index => {
    const fixture = lightboxFixtures[index] ?? lightboxFixtures[0]!
    return {
      _docsPage: 'lightbox',
      lightbox: Lightbox.init({
        id: `docs-lightbox-${String(index)}`,
        mediaCount: mediaCountFor(fixture.kind),
      }),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'ClickedOpenLightboxPreview': {
        const result = Lightbox.open(model.lightbox)
        return {
          model: { ...model, lightbox: result.model },
          commands: Command.mapMessages(result.commands ?? [], next =>
            LightboxPreviewMessage.GotLightboxPreviewMessage({ message: next }),
          ),
        }
      }
      case 'ClickedOpenLightboxAt': {
        const result = Lightbox.open(model.lightbox, message.index)
        return {
          model: { ...model, lightbox: result.model },
          commands: Command.mapMessages(result.commands ?? [], next =>
            LightboxPreviewMessage.GotLightboxPreviewMessage({ message: next }),
          ),
        }
      }
      case 'GotLightboxPreviewMessage': {
        const result = Lightbox.update(model.lightbox, message.message)
        return {
          model: { ...model, lightbox: result.model },
          commands: Command.mapMessages(result.commands ?? [], next =>
            LightboxPreviewMessage.GotLightboxPreviewMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => {
    const fixture = lightboxFixtures[index] ?? lightboxFixtures[0]!
    const trigger =
      fixture.kind === 'gallery'
        ? h.div(
            [h.Class('grid w-[136px] grid-cols-2 gap-2')],
            galleryMedia.map((item, at) =>
              h.button(
                [
                  h.Type('button'),
                  h.AriaLabel(item.alt),
                  h.OnClick(
                    LightboxPreviewMessage.ClickedOpenLightboxAt({ index: at }),
                  ),
                  h.Class('overflow-hidden rounded-md'),
                ],
                [
                  h.img([
                    h.Src(item.src),
                    h.Alt(item.alt),
                    h.Class('aspect-square w-full object-cover'),
                  ]),
                ],
              ),
            ),
          )
        : Button.button(
            {
              variant: 'outline',
              onClick: LightboxPreviewMessage.ClickedOpenLightboxPreview(),
              children: [fixture.triggerLabel],
            },
            h,
          )
    const media = mediaFor(fixture.kind)
    return h.div(
      [],
      [
        trigger,
        Lightbox.lightbox(
          {
            model: model.lightbox,
            toParentMessage: (
              message: Lightbox.Message,
            ): LightboxPreviewMessage =>
              LightboxPreviewMessage.GotLightboxPreviewMessage({ message }),
            media,
            ...(fixture.kind === 'zoom' ? { hasZoom: true } : {}),
            ...(fixture.kind === 'video' ? { hasAutoPlay: true } : {}),
          },
          h,
        ),
      ],
    )
  },
})
