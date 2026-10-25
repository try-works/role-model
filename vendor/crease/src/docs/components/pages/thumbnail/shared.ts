import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

/* Same-origin inline data URIs matching astryx's Thumbnail blocks. */
export const NIGHT_FOREST =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAwFBMVEX18+H08uDy8d/y8N/v7t/m5NXl49Tk4tPc3NDX1cnW1cnW1cjW1MjV1MjV1MfR0cXIyLzEw7m8vLC3t68wM0QvM0MvM0IvMkIuMkEtMEErLz8iJjkhJTggJTcgJDcfJDYfIzYeIjUcITMbHzIWHiwYGzIXGjEWGjAWGTAVGS8VGC8UGC4UGC0UFy4TFy0TFywTFi0SFiwRFSsQFSkNFR4QFCoPFCkPFCgPEykOEygOEigNEicNEScMESYIDw8ECgr+gzZIAAABqElEQVR42uWQ61aCQBRGD5GylNBMKS9FZgNdNE0cyUvB+79VM8MoF9Fgplau2j/8nO8c9hqAD0ngDwjeJYH1lrfBWoCtYDboNu/Zv7qQYNap1bpCN1gxFh1dNe5WAsCScWqoWttbChAKvHZZ0W6XQoIFpW8ooFmLCG2Rl1BgaZAU5Ac8yg0RlC9nngCRQDFuhQRzinWmkCuYk3lxQoFrlskVqlcTMcEFvYIKoFbNfmEFuIypWaGGkt66tqZuEbjAHZl6SQVF1WqNvpDAHVktXTvR9JbgDZii1+tZI7cYMJXkCASvksB4L5VxHmAsibzgRRIYbjgfCgFDSeBZkh8W1HMIniSBR0mOQPCQA3RgBk4M5DhNZwdEcbKgLXy5iDiZg5gApRYbqTql2FZgMxAKeEWSNUFYx3s2SfU28HPWItrpySSwE2cEdqrYtxgmxgHGScFmHrAGk8SxczIxZnNC1McFOGshShyb4yxB9sI3CXDGnH0MLsD7F5LvvptEgH12Zg1Pn2WuHsjvrwt8308t+nwxT38sgiAE8/RTeagH+vx/F8SeF0Ja8Ak14ia/LgmpZQAAAABJRU5ErkJggg=='
export const MISTY_VALLEY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAwFBMVEWPnaqJmKSIlaKHlaGGlaKGk6CEkp6Ckp+Cj5uAj51/jZp6i5h8ipd7iZZ4hpR1g5FzhpdzhJN0g5FuhZdsgpVqgZRpgJNpf5JmfpFufYxufYtlfJBpe4tke49neo1ieo5kd4tndoZidopheY1geIxfd4tmdYVddYpcdIlbc4hgcoNebn5ZcodYcYZXb4VVboRUbYNTbIJaantWaXxRa4FQaYBPaH9NZ35UZXZQY3dMZn1LZXxKZHxMYHRKXnIoOEh3WzsBAAABeElEQVR42u3T11oCQQyG4R9FEREFqVJEgh17xbZ7/3cl29gpmQGeeOh7OF+Ss8G3EL6E8CmEdyG8CeFVCC9CeBTCgxDuhXAnhFsh3AjhSgiXQrgQwtlayHrB6TqIyHzCREMTH4rpbxip5nnkRintEUNF0oc8yqnP6Oey3ueQSnlHN6P0ro0Mi4BOSu8dA1mygnbC7G0NMdKEVszuLQXx4oZmhO3NDLlEEY05R280PDGbgD0RaBeI/Bdg7weBMkDLwF4PtBOcwH0gCJZf0DPYdd8Jo8K177hgZbjW+RN2hWffusBVnMR+XE5yfMRx5MPtOOOI0Xd+9ot/rTOiVrtepuabwcDwNFgP6przSH0dqKiOUhUfvaKcO8yVncyM0sK+psSyK4qpPUvRwlUUYrusgoaviG27YMFXNz38I0nc8PNPAFtC2BFClRFWV4cDU5g4WEE0hJ4q1PU8sgmMF0LOmKN2TBOh21RjRsxms3C5WYwrCIX+D/zBgV8HCFv4gVKf1AAAAABJRU5ErkJggg=='
export const GOLDEN_SUNSET =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAkFBMVEX/+uv/7sj6tFr3sVn1r1nzrVjxq1jvqVftp1frpVbpo1bnoVXln1XjnVThm1TfmVPdl1PblVLZk1LXkVLVj1HTjVHRi1DPiVDNh0/LhU/Jg07HgU7Ff03DfU3Be0y/eUy9d0u7dUu5c0u2cEq0bkqybEmwakmuaEisZkiqZEeoYkemYEakXkaiXEVgLjQ8HCjaJlMkAAABI0lEQVR42u3Mx3qDMBSE0Z/03nsvdhxjcnn/twsYjISR5MUkO5+V9N2ZYUPEpogtEdsidkTsitgTsS/iQMShiCMRxyJORJyKOBNxLuJCxKWIKxHXIm5E3Iq4E3Ev4kHEo4gnEc8iXkS8inhLymrJBO8J2UIiw0dc5sRDfEbVRWr1o/pbMMWox9yz6zcLIzMbBTD2VaHu7fr1gjXGA3w5baj5+H0w6x09TDpdaP7rDZhn0sd3y89Y9fcHbPnoYdroZ2w6dQNmg6OHfG4QyrsBC8gdZpVQxtqF4M1mjepFURThTLNgMYsePxaX2WqY6D8GSm2grK2slbGBciHZ9hOE2smNpTuxenhieCdeH06E7qTqvYnImWTbbUSPlKL1wHrgTwZ+AWq+3H5MpRkwAAAAAElFTkSuQmCC'
export const SNOWY_PEAKS =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAAwFBMVEX////6/P/4+//g7vjf7fbf7fTe7fje7fTe7PTd7Pjc7Pfd7PTc6/Xc6/Pb6/fb6/Xb6vTa6/fa6/Xa6vfZ6vfZ6vba6vTZ6fXY6vfY6vbY6ffY6fXX6fbX6fTW6fbX6PXW6PbW6PTV6PbV6PXU6PbV5/XU5/bU5/TU5vXT5/bS5/XT5vTS5vXS5vTR5vXR5fXQ5fXP5fXP5PXO5PXO5PTN5PTN4/TM4/TL4/TM4vTL4vTK4vTO3OqqvtKbrsFcfGgMVnjaAAAC7klEQVR42u2Ta3eaQBCGp0kbTbBBMWDMoiCWEOsFtV4SdcP//1edYQUWwSye9kNOT58POVlm3mdmUWG/3+9et5vVYj6bjoMgGE9n88Vqs33d7SsBcX67WmI+EKBhudpWNcBu94bzlyGO9weEj0uES9zhbVcFSPMYdxzmOKi4xACbNa0/DgY91rGIDusNgjFdY72tAKzXq0U4pTyGm80m/iXDNFys1psqApwf4nwc32x+J9DRYbhDuMRrqIF5vD+zKK0R5LBYfIvFcqUEBZPRsNex9IaW0NCtTm84mqDglxIIQ3z/uEBDqydoDVrBH4d4CyUwowUsA+fXa4I67mBYtAJeQglM4jeg0wLfBLSCLt5COFcC4xffYVZ8gVSABos5/sskVAOjYNjvWrqWxGOFplvd/jD4OZkpgSAYiA1yAtpgGIzGEyW0wYCZeqOeGer1hm6yQUXBD8+1uySofU2okaBre97zSA34nuswk74GqYC+CCZzXM9/VgO+77o2M+LPUcTpUzSYXS3/DB7m4ztomrhEjb7LeAPbdb0KgOe5fTIY6Y8B51O+Xynvgeu6js2Yaep6Q6DrpsmY7biVABthXdPEFfRj3sBTl9nl8JNzLMANSGEahm5QGuNn8/zEAE8xD0g7hrfbdHgqhxO5J/B4BEMtBOv43+M5YkHuCTxk0HwuDGfgvNAAbZljQ/sMnEOhAVoSPKFVCuYBThvgXiKdcF8GlwRZB+Tz8IEhLhca4C6F8yusH0TDXYFjPjEkj+E2gecm8NsT+IkgaQBVQ6F80gA3Ai4uANkl+I0ElYlDjNwAhXyp4Zg/Cg4FAS+dwAsLiPq7PAGuEc5LJ3B+LUjLSf2Q1aGk4V1uyJVTQdYAqgZ5v7T+nu0IuXwmkAwf1yE3IJuQjZDLkiBpAK5o4BUEV6UNh5J8SR1y9VzDoZgvqasFV2frByFQNCgFX/6Q/4J/SxDJTy84/DVBFEmlSw6fRhBFUumiw2cRRJFUuuzwG+qew9oBo+n5AAAAAElFTkSuQmCC'

export type ThumbnailItem = Readonly<{
  src?: string
  alt?: string
  label: string
  caption?: string
  isLoading?: boolean
  isDisabled?: boolean
  hasRemove?: boolean
  showRemoveOn?: 'always' | 'hover'
  hasClick?: boolean
}>

export type ThumbnailFixture = Readonly<{
  title: string
  description: string
  /** Caption heading rendered above the row, matching astryx's supporting text. */
  heading?: string
  layout: 'single' | 'row' | 'sections'
  items: ReadonlyArray<ThumbnailItem>
}>

export const thumbnailFixtures: Readonly<
  [ThumbnailFixture, ...Array<ThumbnailFixture>]
> = [
  {
    title: 'Thumbnail',
    description: 'A thumbnail with an image and label.',
    layout: 'single',
    items: [
      {
        src: SNOWY_PEAKS,
        alt: 'Snowy mountain peaks',
        label: 'snowy-peaks.jpg',
      },
    ],
  },
  {
    title: 'Thumbnail — States',
    description:
      'All visual states side by side: image loaded, placeholder, skeleton loading, and upload overlay. Demonstrates the full lifecycle of a thumbnail from empty to loaded.',
    heading: 'Lifecycle: empty → uploading → processing → loaded',
    layout: 'row',
    items: [
      { label: 'report.pdf', caption: 'Placeholder' },
      { label: 'uploading.jpg', isLoading: true, caption: 'Skeleton' },
      {
        src: MISTY_VALLEY,
        alt: 'Misty mountain valley',
        isLoading: true,
        label: 'misty-valley.jpg',
        caption: 'Uploading',
      },
      {
        src: MISTY_VALLEY,
        alt: 'Misty mountain valley',
        label: 'misty-valley.jpg',
        caption: 'Loaded',
      },
    ],
  },
  {
    title: 'Thumbnail — Gallery',
    description:
      'A row of clickable thumbnails with labels that open a detail view. Use for image attachment lists where users need to preview and manage uploads.',
    heading: 'Click to preview, dismiss to remove',
    layout: 'row',
    items: [
      {
        src: NIGHT_FOREST,
        alt: 'Forest at night under a crescent moon',
        label: 'forest-night.jpg',
        hasClick: true,
        hasRemove: true,
      },
      {
        src: MISTY_VALLEY,
        alt: 'Misty mountain valley',
        label: 'misty-valley.jpg',
        hasClick: true,
        hasRemove: true,
      },
      {
        src: GOLDEN_SUNSET,
        alt: 'Golden sunset over mountains',
        label: 'golden-sunset.jpg',
        hasClick: true,
        hasRemove: true,
      },
      {
        src: SNOWY_PEAKS,
        alt: 'Snowy mountain peaks',
        label: 'snowy-peaks.jpg',
        hasClick: true,
        hasRemove: true,
      },
    ],
  },
  {
    title: 'Thumbnail — Removable',
    description:
      'Thumbnails with a remove button overlay. The close button uses APCA luminance detection to stay visible on both dark and light images.',
    heading: 'Remove button adapts contrast to image luminance',
    layout: 'row',
    items: [
      {
        src: NIGHT_FOREST,
        alt: 'Forest at night under a crescent moon',
        label: 'forest-night.jpg',
        hasRemove: true,
        showRemoveOn: 'always',
      },
      {
        src: MISTY_VALLEY,
        alt: 'Misty mountain valley',
        label: 'misty-valley.jpg',
        hasRemove: true,
        showRemoveOn: 'always',
      },
      {
        src: GOLDEN_SUNSET,
        alt: 'Golden sunset over mountains',
        label: 'golden-sunset.jpg',
        hasRemove: true,
        showRemoveOn: 'always',
      },
      {
        src: SNOWY_PEAKS,
        alt: 'Snowy mountain peaks',
        label: 'snowy-peaks.jpg',
        hasRemove: true,
        showRemoveOn: 'always',
      },
    ],
  },
  {
    title: 'Thumbnail — Disabled',
    description:
      'Thumbnails in the disabled state with reduced opacity. The remove button and click handler are suppressed when disabled.',
    layout: 'sections',
    items: [
      {
        src: GOLDEN_SUNSET,
        alt: 'Golden sunset over mountains',
        label: 'golden-sunset.jpg',
        hasRemove: true,
        showRemoveOn: 'always',
        caption: 'Enabled',
      },
      {
        label: 'document.pdf',
        hasRemove: true,
        showRemoveOn: 'always',
        caption: 'Enabled',
      },
      {
        src: GOLDEN_SUNSET,
        alt: 'Golden sunset over mountains',
        label: 'golden-sunset.jpg',
        isDisabled: true,
        hasRemove: true,
        caption: 'Disabled',
      },
      {
        label: 'document.pdf',
        isDisabled: true,
        hasRemove: true,
        caption: 'Disabled',
      },
    ],
  },
]

const DATA_URIS: Record<string, string> = {
  NIGHT_FOREST,
  MISTY_VALLEY,
  GOLDEN_SUNSET,
  SNOWY_PEAKS,
}

const uriConstName = (src: string): string =>
  Object.entries(DATA_URIS).find(([, v]) => v === src)?.[0] ?? 'SNOWY_PEAKS'

const itemSource = (item: ThumbnailItem): string => {
  const props = [
    ...(item.src === undefined ? [] : [`src: ${uriConstName(item.src)}`]),
    ...(item.alt === undefined ? [] : [`alt: '${item.alt}'`]),
    `label: '${item.label}'`,
    ...(item.isLoading === true ? ['isLoading: true'] : []),
    ...(item.isDisabled === true ? ['isDisabled: true'] : []),
    ...(item.hasRemove === true ? ['onRemove: NoOp()'] : []),
    ...(item.hasClick === true ? ['onClick: NoOp()'] : []),
    ...(item.showRemoveOn === 'always' ? [`showRemoveOn: 'always'`] : []),
  ]
  return `Thumbnail.thumbnail({ ${props.join(', ')} }, h)`
}

const thumbnailImports = (isStyleX: boolean): string =>
  [
    ...(isStyleX
      ? [
          `import * as stylex from '@stylexjs/stylex'

const styles = stylex.create({ column: { display: 'flex', flexDirection: 'column', gap: '1rem' }, section: { display: 'flex', flexDirection: 'column', gap: '0.25rem' }, row: { display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }, rowCenter: { display: 'flex', gap: '0.75rem', alignItems: 'center' }, item: { display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'center' }, caption: { fontSize: '0.75rem', lineHeight: '1rem', color: 'var(--muted-foreground)' } })`,
        ]
      : []),
    `const NIGHT_FOREST = '${NIGHT_FOREST}'`,
    `const MISTY_VALLEY = '${MISTY_VALLEY}'`,
    `const GOLDEN_SUNSET = '${GOLDEN_SUNSET}'`,
    `const SNOWY_PEAKS = '${SNOWY_PEAKS}'`,
  ].join('\n')

const itemBlock = (item: ThumbnailItem, isStyleX: boolean): string => {
  const thumb = itemSource(item)
  if (item.caption === undefined) return thumb
  return `h.div(
          [h.Class(${isStyleX ? "stylex.props(styles.item).className ?? ''" : "'flex flex-col items-center gap-1'"})],
          [
            ${thumb},
            h.span([h.Class(${isStyleX ? "stylex.props(styles.caption).className ?? ''" : "'text-xs text-muted-foreground'"})], ['${item.caption}']),
          ],
        )`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = thumbnailFixtures[index] ?? thumbnailFixtures[0]
  if (fixture.items.some(item => item.hasClick || item.hasRemove))
    return interactiveSource(fixture, renderer)
  const isStyleX = renderer !== 'tailwind'
  const componentImports = thumbnailImports(isStyleX)
  const sectionLabel = (text: string) =>
    `h.span([h.Class(${isStyleX ? "stylex.props(styles.caption).className ?? ''" : "'text-xs text-muted-foreground'"})], ['${text}'])`
  const rowWrap = (items: ReadonlyArray<ThumbnailItem>, centered = false) =>
    `h.div(
        [h.Class(${isStyleX ? `stylex.props(styles.${centered ? 'rowCenter' : 'row'}).className ?? ''` : `'flex ${centered ? 'items-center' : 'items-end flex-wrap'} gap-3'`})],
        [
          ${items.map(item => itemBlock(item, isStyleX)).join(',\n          ')},
        ],
      )`

  const viewBody =
    fixture.layout === 'single'
      ? itemSource(fixture.items[0] ?? { label: '' })
      : fixture.layout === 'sections'
        ? `h.div(
      [h.Class(${isStyleX ? "stylex.props(styles.column).className ?? ''" : "'flex flex-col gap-4'"})],
      [
        h.div(
          [h.Class(${isStyleX ? "stylex.props(styles.section).className ?? ''" : "'flex flex-col gap-1'"})],
          [${sectionLabel(fixture.items[0]?.caption ?? 'Enabled')}, ${rowWrap(fixture.items.slice(0, 2), true)}],
        ),
        h.div(
          [h.Class(${isStyleX ? "stylex.props(styles.section).className ?? ''" : "'flex flex-col gap-1'"})],
          [${sectionLabel(fixture.items[2]?.caption ?? 'Disabled')}, ${rowWrap(fixture.items.slice(2), true)}],
        ),
      ],
    )`
        : `h.div(
      [h.Class(${isStyleX ? "stylex.props(styles.column).className ?? ''" : "'flex flex-col gap-4'"})],
      [
        ${sectionLabel(fixture.heading ?? '')},
        ${rowWrap(fixture.items)},
      ],
    )`

  return staticComponentApplication({
    componentName: 'Thumbnail',
    componentSlug: 'thumbnail',
    renderer,
    exampleName: fixture.title,
    componentImports,
    viewBody,
  })
}

const interactiveSource = (
  fixture: ThumbnailFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const skin = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const cls = (tw: string, sx: string) =>
    renderer !== 'tailwind'
      ? `stylex.props(styles.${sx}).className ?? ''`
      : `'${tw}'`
  const items = fixture.items
    .map(
      item =>
        `{ ${Object.entries(item)
          .map(
            ([key, value]) =>
              `${key}: ${key === 'src' ? uriConstName(String(value)) : JSON.stringify(value)}`,
          )
          .join(', ')} }`,
    )
    .join(',\n  ')
  return foldkitApplication({
    title: fixture.title,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, type Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import * as Thumbnail from '@/${skin}/thumbnail'
import * as Lightbox from '@/${skin}/lightbox'
${thumbnailImports(renderer !== 'tailwind')}`,
    model: `const Item = S.Struct({
  src: S.optionalKey(S.String), alt: S.optionalKey(S.String), label: S.String,
  caption: S.optionalKey(S.String), isLoading: S.optionalKey(S.Boolean),
  isDisabled: S.optionalKey(S.Boolean), hasRemove: S.optionalKey(S.Boolean),
  showRemoveOn: S.optionalKey(S.Literals(['always', 'hover'])),
  hasClick: S.optionalKey(S.Boolean),
})
export const Model = S.Struct({ items: S.Array(Item), lightbox: Lightbox.Model })
export type Model = typeof Model.Type`,
    messages: `export const Message = defineMessageUnion({
  OpenedThumbnail: { label: S.String },
  RemovedThumbnail: { label: S.String },
  GotLightboxMessage: { message: Lightbox.Message },
})
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: {
  items: [${items}],
  lightbox: Lightbox.init({ id: 'thumbnail-preview', mediaCount: ${String(fixture.items.length)} }),
} })`,
    update: `const mapLightbox = (model: Model, result: ReturnType<typeof Lightbox.update>): Update.Return<Model, Message> => ({
  model: { ...model, lightbox: result.model },
  commands: Command.mapMessages(result.commands ?? [], message => Message.GotLightboxMessage({ message })),
})
export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
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
      return { model: { ...model, items, lightbox: {
        ...model.lightbox, mediaCount: Math.max(1, items.length),
        index: Math.min(model.lightbox.index, Math.max(0, items.length - 1)),
      } } }
    }
    case 'GotLightboxMessage':
      return mapLightbox(model, Lightbox.update(model.lightbox, message.message))
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const itemView = (item: Model['items'][number]) => Thumbnail.thumbnail({
    ...item,
    ...(item.hasClick ? { onClick: Message.OpenedThumbnail({ label: item.label }) } : {}),
    ...(item.hasRemove ? { onRemove: Message.RemovedThumbnail({ label: item.label }) } : {}),
  }, h)
  const row = (items: Model['items']) => h.div([h.Class(${cls('flex flex-wrap items-end gap-3', 'row')})], items.map(itemView))
  return {
    title: '${fixture.title}',
    body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
      h.div([h.Class(${cls('flex flex-col gap-4', 'column')})], [
        ${
          fixture.layout === 'sections'
            ? `h.span([h.Class(${cls('text-xs text-muted-foreground', 'caption')})], ['Enabled']),
        row(model.items.filter(item => !item.isDisabled)),
        h.span([h.Class(${cls('text-xs text-muted-foreground', 'caption')})], ['Disabled']),
        row(model.items.filter(item => item.isDisabled)),`
            : `h.span([h.Class(${cls('text-xs text-muted-foreground', 'caption')})], [${JSON.stringify(fixture.heading ?? '')}]),
        row(model.items),`
        }
        ...(model.items.some(item => item.hasClick) ? [Lightbox.lightbox({
          model: model.lightbox,
          toParentMessage: message => Message.GotLightboxMessage({ message }),
          media: model.items.map(item => ({ src: item.src ?? '', alt: item.alt ?? item.label, caption: item.label })),
        }, h)] : []),
      ]),
    ]),
  }
}`,
  })
}

const thumbnailExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  thumbnailFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const thumbnailExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, thumbnailExamplesFor(renderer))
