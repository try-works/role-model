import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  galleryMedia,
  lightboxFixtures,
  mediaFor,
} from '@/docs/components/pages/lightbox/shared'
import type * as LightboxModel from '@/stylex/lightbox'
import * as Button from '@/stylex/button'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import * as Lightbox from '@/stylex/lightbox'
import { foundationTokens } from '../../../../stylex/foundations-tokens.stylex'
import { className } from '@/stylex/style'

const styles = stylex.create({
  thumb: {
    padding: 0,
    borderRadius: foundationTokens.radiusMd,
    overflow: 'hidden',
    cursor: 'pointer',
  },
  triggerButton: {
    backgroundClip: 'padding-box',
  },
  thumbGrid: {
    gap: '0.5rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    width: '8.5rem',
  },
  thumbImg: {
    aspectRatio: '1 / 1',
    display: 'block',
    objectFit: 'cover',
    height: '100%',
    width: '100%',
  },
})

type PreviewModel = Readonly<{
  lightbox: LightboxModel.Model
}>

const msg = <Msg>(
  onMessageJson: (json: string) => Msg,
  tag: string,
  fields?: Record<string, unknown>,
): Msg => onMessageJson(JSON.stringify({ _tag: tag, ...fields }))

export const lightboxStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = lightboxFixtures[exampleIndex]
  if (fixture === undefined) return undefined
  const preview = model as PreviewModel
  const trigger =
    fixture.kind === 'gallery'
      ? h.div(
          [h.Class(className(styles.thumbGrid))],
          galleryMedia.map((item, index) =>
            h.button(
              [
                h.Type('button'),
                h.AriaLabel(item.alt),
                h.OnClick(
                  msg(onMessageJson, 'ClickedOpenLightboxAt', { index }),
                ),
                h.Class(className(reset.button, styles.thumb)),
              ],
              [
                h.img([
                  h.Src(item.src),
                  h.Alt(item.alt),
                  h.Class(className(reset.media, styles.thumbImg)),
                ]),
              ],
            ),
          ),
        )
      : Button.button(
          {
            variant: 'outline',
            onClick: msg(onMessageJson, 'ClickedOpenLightboxPreview'),
            layoutStyle: styles.triggerButton as ComponentLayoutStyle,
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
          model: preview.lightbox,
          toParentMessage: (message: Lightbox.Message): Msg =>
            msg(onMessageJson, 'GotLightboxPreviewMessage', { message }),
          media,
          ...(fixture.kind === 'zoom' ? { hasZoom: true } : {}),
          ...(fixture.kind === 'video' ? { hasAutoPlay: true } : {}),
        },
        h,
      ),
    ],
  )
}
