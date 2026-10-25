import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { bannerFixtures } from '@/docs/components/pages/banner/shared'
import * as Banner from '@/ui/banner'
import * as Button from '@/ui/button'

const GotBannerMessage = defineMessageUnion({
  GotBannerMessage: { index: S.Number, message: Banner.Message },
})
type GotBannerMessage = typeof GotBannerMessage.Type
const BannerPreviewModel = S.Struct({
  _docsPage: S.Literal('banner'),
  banners: S.Array(Banner.Model),
})
type BannerPreviewModel = typeof BannerPreviewModel.Type

const detailChildren = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class('flex flex-col gap-2')],
    [
      h.p([h.Class('text-sm text-muted-foreground')], ['Changed settings:']),
      h.ul(
        [h.Class('list-disc space-y-1 pl-5 text-sm')],
        [
          h.li([], ['Authentication method updated']),
          h.li([], ['Rate limits modified']),
        ],
      ),
    ],
  )

export const bannerTailwindPreviewProgram = definePreviewProgram<
  BannerPreviewModel,
  GotBannerMessage
>({
  Model: BannerPreviewModel,
  Message: GotBannerMessage,
  init: index => {
    const fixture = bannerFixtures[index] ?? bannerFixtures[0]
    return {
      _docsPage: 'banner',
      banners: fixture.banners.map(banner =>
        Banner.init({
          ...(banner.defaultIsOpen === true ? { defaultIsOpen: true } : {}),
        }),
      ),
    }
  },
  update: (model, message) => ({
    model: {
      ...model,
      banners: model.banners.map((banner, i) =>
        i === message.index
          ? Banner.update(banner, message.message).model
          : banner,
      ),
    },
  }),
  view: (index, model, h) => {
    const fixture = bannerFixtures[index] ?? bannerFixtures[0]
    return h.div(
      [
        h.Class('mx-auto flex w-full max-w-3xl flex-col gap-3'),
        ...(fixture.maxWidth === undefined
          ? []
          : [h.Style({ maxWidth: `${String(fixture.maxWidth)}px` })]),
      ],
      fixture.banners.map((spec, i) => {
        const banner = model.banners[i]
        if (banner === undefined) {
          return h.empty
        }
        return Banner.banner(
          {
            model: banner,
            toParentMessage: message =>
              GotBannerMessage.GotBannerMessage({ index: i, message }),
            id: `docs-banner-${String(index)}-${String(i)}`,
            status: spec.status,
            title: spec.title,
            ...(spec.description === undefined
              ? {}
              : { description: spec.description }),
            ...(spec.endActionLabel === undefined
              ? {}
              : {
                  endContent: [
                    Button.button(
                      {
                        variant: 'secondary',
                        size: 'sm',
                        children: [spec.endActionLabel],
                      },
                      h,
                    ),
                  ],
                }),
            ...(spec.isDismissable === true ? { isDismissable: true } : {}),
            ...(spec.container === undefined
              ? {}
              : { container: spec.container }),
            ...(spec.elevation === undefined
              ? {}
              : { elevation: spec.elevation }),
            ...(spec.hasDetailChildren === true
              ? { children: [detailChildren(h)] }
              : {}),
          },
          h,
        )
      }),
    )
  },
})
