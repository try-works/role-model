import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { bannerFixtures } from '@/docs/components/pages/banner/shared'
import * as Banner from '@/pleat/banner'
import * as Button from '@/pleat/button'
import { className } from '@/pleat/style'

const styles = {
  frame: Style.make({
    gap: '0.75rem',
    marginInline: 'auto',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '48rem',
    width: '100%',
  }),
  detailStack: Style.make({
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
  }),
  detailText: Style.make({
    margin: 0,
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  detailList: Style.make({
    margin: 0,
    display: 'block',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    listStyleType: 'disc',
    paddingInlineStart: '1.25rem',
  }),
  detailLi: Style.make({ marginBottom: '0.25rem' }),
}

const detailChildren = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class(className(styles.detailStack))],
    [
      h.p(
        [h.Class(className(reset.text, styles.detailText))],
        ['Changed settings:'],
      ),
      h.ul(
        [h.Class(className(reset.list, styles.detailList))],
        [
          h.li(
            [h.Class(className(styles.detailLi))],
            ['Authentication method updated'],
          ),
          h.li([], ['Rate limits modified']),
        ],
      ),
    ],
  )

export const bannerPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = bannerFixtures[exampleIndex] ?? bannerFixtures[0]
  const previewModel = model as { banners: ReadonlyArray<Banner.Model> }
  return h.div(
    [
      h.Class(className(styles.frame)),
      ...(fixture.maxWidth === undefined
        ? []
        : [h.Style({ maxWidth: `${String(fixture.maxWidth)}px` })]),
    ],
    fixture.banners.map((spec, i) => {
      const banner = previewModel.banners[i]
      if (banner === undefined) {
        return h.empty
      }
      return Banner.banner(
        {
          model: banner,
          toParentMessage: message =>
            onMessageJson(
              JSON.stringify({
                _tag: 'GotBannerMessage',
                index: i,
                message,
              }),
            ),
          id: `docs-banner-${String(exampleIndex)}-${String(i)}`,
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
}
