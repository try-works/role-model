import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
import type { BannerStatus } from '@/lib/banner'

export type BannerSpec = Readonly<{
  status: BannerStatus
  title: string
  description?: string
  /** Renders a secondary sm Button inside endContent. */
  endActionLabel?: string
  isDismissable?: boolean
  container?: 'section'
  elevation?: 'med'
  /** collapsible={{defaultIsOpen: true}} — banner starts expanded. */
  defaultIsOpen?: boolean
  /** Renders astryx's "Changed settings:" detail list as children. */
  hasDetailChildren?: boolean
}>

export type BannerFixture = Readonly<{
  title: string
  description: string
  banners: ReadonlyArray<BannerSpec>
  /** astryx Showcase constrains the stack to 800px. */
  maxWidth?: number
}>

/* Example set ported from Meta Astryx
   packages/cli/assets/templates/blocks/components/Banner/*.tsx + *.doc.mjs —
   same demos, same copy. BannerShowcase and BannerStatuses are both named
   'Banner — Statuses' upstream; the second keeps its doc text but gets a
   distinguishing page title here. */
export const bannerFixtures: Readonly<
  [BannerFixture, ...Array<BannerFixture>]
> = [
  {
    title: 'Banner — Statuses',
    description:
      'All four status banners stacked: info, success, warning, and error. A quick visual reference for choosing the right status.',
    maxWidth: 800,
    banners: [
      { status: 'info', title: 'A new software update is available.' },
      { status: 'success', title: 'Your changes have been saved.' },
      {
        status: 'warning',
        title: 'Your trial expires in 3 days.',
        description: 'Upgrade to keep access to all features.',
      },
      {
        status: 'error',
        title: 'Payment failed.',
        description: 'Update your billing information to continue.',
      },
    ],
  },
  {
    title: 'Banner — Statuses (detailed)',
    description:
      'All 4 banner statuses: info, success, warning, and error. Use to show persistent messages like updates, confirmations, cautions, or problems at the top of a page or section.',
    banners: [
      {
        status: 'info',
        title: 'A new software update is available',
        description:
          'Version 2.4.1 includes performance improvements and bug fixes.',
      },
      {
        status: 'success',
        title: 'Changes saved',
        description: 'Your profile information has been updated successfully.',
      },
      {
        status: 'warning',
        title: 'Storage almost full',
        description: 'You have used 90% of your available storage.',
      },
      {
        status: 'error',
        title: 'Build failed',
        description: '3 tests did not pass. Check the logs for details.',
      },
    ],
  },
  {
    title: 'Banner — Dismiss',
    description:
      'Let the user close a banner after reading it. Use for maintenance notices, feature tips, or any non-critical message the user can acknowledge.',
    banners: [
      {
        status: 'success',
        title: 'Deployment complete',
        description: 'Version 3.2.0 is now live in production.',
        isDismissable: true,
      },
      {
        status: 'warning',
        title: 'Scheduled maintenance tonight',
        description:
          'The system will be briefly unavailable from 2:00–3:00 AM.',
        isDismissable: true,
      },
      {
        status: 'info',
        title: 'New feature available',
        description: 'Try the new dashboard layout in Settings.',
        isDismissable: true,
      },
    ],
  },
  {
    title: 'Banner — Action',
    description:
      'Add a button to a banner so the user can act on the message. Use for trial expirations, payment failures, or anything that needs a response.',
    banners: [
      {
        status: 'info',
        title: 'Your trial expires in 3 days',
        description: 'Upgrade now to keep access to all features.',
        endActionLabel: 'Upgrade',
      },
      {
        status: 'warning',
        title: 'API key expires soon',
        description:
          'Generate a new key before December 1 to avoid service interruption.',
        endActionLabel: 'Renew key',
      },
      {
        status: 'error',
        title: 'Payment failed',
        description: 'We could not process your last payment.',
        endActionLabel: 'Retry',
      },
    ],
  },
  {
    title: 'Banner — Collapsible',
    description:
      'Combine an action button, dismiss control, and a collapsible detail area in one banner. Children sit behind the toggle by default; `collapsible={{defaultIsOpen: true}}` starts it open, and `collapsible={false}` drops the toggle entirely. Use for complex notifications like config changes or deployment summaries.',
    banners: [
      {
        status: 'warning',
        title: 'Configuration changes detected',
        description: 'Review the changes before they take effect.',
        endActionLabel: 'Review',
        isDismissable: true,
        defaultIsOpen: true,
        hasDetailChildren: true,
      },
    ],
  },
  {
    title: 'Banner — Floating',
    description:
      'A floating banner raised with `elevation="med"`. Banners are inline by default; raise one when it should read as an overlay above content.',
    banners: [
      {
        status: 'info',
        title: 'You have unsaved changes',
        description:
          'A raised banner reads as an overlay floating above the page.',
        elevation: 'med',
      },
    ],
  },
  {
    title: 'Banner — Full Width',
    description:
      'A full-width banner with no border radius for page-level notifications. Use at the top of a page for site-wide announcements or maintenance alerts.',
    banners: [
      {
        status: 'warning',
        title: 'Scheduled downtime',
        description:
          'All services will be unavailable on Sunday from 2:00–4:00 AM.',
        container: 'section',
        isDismissable: true,
      },
      {
        status: 'info',
        title: 'Welcome to the new dashboard',
        description: 'We have redesigned the layout based on your feedback.',
        container: 'section',
        endActionLabel: 'Take a tour',
      },
    ],
  },
]

// ---------- generated example source ----------

const DETAIL_CHILDREN = `h.div([h.Class('flex flex-col gap-2')], [
          h.p([h.Class('text-sm text-muted-foreground')], ['Changed settings:']),
          h.ul([h.Class('list-disc space-y-1 pl-5 text-sm')], [
            h.li([], ['Authentication method updated']),
            h.li([], ['Rate limits modified']),
          ]),
        ])`

const bannerSource = (
  banner: BannerSpec,
  index: number,
  tag: string,
): string => {
  const args = [
    `model: model.banners[${String(index)}]!`,
    `toParentMessage: message => GotBannerMessage({ index: ${String(index)}, message })`,
    `id: 'banner-${tag.toLowerCase()}-${String(index)}'`,
    `status: '${banner.status}'`,
    `title: '${banner.title.replaceAll("'", "\\'")}'`,
    ...(banner.description === undefined
      ? []
      : [`description: '${banner.description.replaceAll("'", "\\'")}'`]),
    ...(banner.endActionLabel === undefined
      ? []
      : [
          `endContent: [Button.button({ variant: 'secondary', size: 'sm', children: ['${banner.endActionLabel}'] }, h)]`,
        ]),
    ...(banner.isDismissable === true ? ['isDismissable: true'] : []),
    ...(banner.container === undefined
      ? []
      : [`container: '${banner.container}'`]),
    ...(banner.elevation === undefined
      ? []
      : [`elevation: '${banner.elevation}'`]),
    ...(banner.hasDetailChildren === true
      ? [`children: [\n        ${DETAIL_CHILDREN},\n      ]`]
      : []),
  ]
  return `Banner.banner({
        ${args.join(',\n        ')},
      }, h)`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = bannerFixtures[index] ?? bannerFixtures[0]
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const uiDir = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const usesButton = fixture.banners.some(
    banner => banner.endActionLabel !== undefined,
  )
  const stackAttrs =
    renderer !== 'tailwind'
      ? `[h.Class(stylex.props(styles.stack).className ?? '')${fixture.maxWidth === undefined ? '' : `, h.Style({ maxWidth: '${String(fixture.maxWidth)}px' })`}]`
      : `[h.Class('flex flex-col gap-3')${fixture.maxWidth === undefined ? '' : `, h.Style({ maxWidth: '${String(fixture.maxWidth)}px' })`}]`
  return foldkitApplication({
    title: `Banner — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Banner from '@/${uiDir}/banner'${usesButton ? `\nimport * as Button from '@/${uiDir}/button'` : ''}${
      renderer !== 'tailwind'
        ? `\nimport * as stylex from '@stylexjs/stylex'\n\nconst styles = stylex.create({\n  stack: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },\n  page: { marginInline: 'auto', maxWidth: '48rem', padding: '2rem', width: '100%' },\n})`
        : ''
    }`,
    model: `export const Model = S.Struct({
  banners: S.Array(Banner.Model),
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotBannerMessage = taggedStruct('GotBannerMessage${tag}', { index: S.Number, message: Banner.Message });
export const Message = S.Union([GotBannerMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    banners: [
      ${fixture.banners
        .map(
          banner =>
            `Banner.init(${banner.defaultIsOpen === true ? '{ defaultIsOpen: true }' : ''})`,
        )
        .join(',\n      ')},
    ],
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotBannerMessage${tag}': {
      const banners = model.banners.map((banner, i) =>
        i === message.index ? Banner.update(banner, message.message).model : banner,
      );
      return { model: { ...model, banners } };
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Banner — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? "stylex.props(styles.page).className ?? ''" : "'mx-auto w-full max-w-3xl p-8'"})], [
    h.div(${stackAttrs}, [
      ${fixture.banners.map((banner, i) => bannerSource(banner, i, tag)).join(',\n      ')},
    ]),
  ]),
})`,
  })
}

const bannerExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  bannerFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const bannerExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, bannerExamplesFor(renderer))
