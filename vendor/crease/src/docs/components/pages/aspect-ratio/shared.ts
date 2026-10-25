import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

const IMAGE_URL = 'https://avatar.vercel.sh/creaseui'

export type AspectRatioFixture = Readonly<{
  title: string
  description: string
  ratioExpr: string
  direction?: 'rtl'
  caption?: string
  widthClass: { tailwind: string; styled: 'w12' | 'w10' | 'w24' }
}>

export const aspectRatioFixtures: Readonly<
  [AspectRatioFixture, ...Array<AspectRatioFixture>]
> = [
  {
    title: 'Square',
    description: 'A 1:1 ratio keeps avatars and artwork square.',
    ratioExpr: '1 / 1',
    widthClass: {
      tailwind: 'w-full max-w-48 overflow-hidden rounded-lg bg-muted',
      styled: 'w12',
    },
  },
  {
    title: 'Portrait',
    description: 'A 9:16 ratio for portrait media.',
    ratioExpr: '9 / 16',
    widthClass: {
      tailwind: 'w-full max-w-40 overflow-hidden rounded-lg bg-muted',
      styled: 'w10',
    },
  },
  {
    title: 'RTL',
    description: 'dir="rtl" with a figure caption for right-to-left layouts.',
    ratioExpr: '16 / 9',
    direction: 'rtl',
    caption: 'منظر طبيعي جميل',
    widthClass: { tailwind: 'w-full max-w-sm', styled: 'w24' },
  },
]

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = aspectRatioFixtures[index] ?? aspectRatioFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const componentImports = isStyleX
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'`
    : ''
  const styles = isStyleX
    ? `\nconst styles = stylex.create({
  frame: { maxWidth: '${fixture.widthClass.styled === 'w12' ? '12rem' : fixture.widthClass.styled === 'w10' ? '10rem' : '24rem'}', width: '100%'${fixture.widthClass.styled === 'w24' ? '' : `, borderRadius: 'var(--radius)', backgroundColor: 'var(--muted)', overflow: 'hidden'`} },
  ratioBox: { borderRadius: 'var(--radius)', backgroundColor: 'var(--muted)', overflow: 'hidden', width: '100%', height: '100%' },
  content: { borderRadius: 'var(--radius)', objectFit: 'cover', width: '100%', height: '100%' },
  caption: { marginTop: '0.5rem', textAlign: 'center', fontSize: '0.875rem', lineHeight: '1.25rem', color: 'var(--muted-foreground)' },
})\n`
    : ''
  const imgExpr = `h.img([h.Src('${IMAGE_URL}'), h.Alt('Photo'), h.Class(${
    isStyleX
      ? 'className(styles.content)'
      : `'rounded-lg object-cover w-full h-full grayscale dark:brightness-20'`
  })])`
  const caption = fixture.caption
    ? `,\n      h.figcaption([h.Class(${isStyleX ? 'className(styles.caption)' : `'mt-2 text-center text-sm text-muted-foreground'`})], ['${fixture.caption}'])`
    : ''
  const viewBody = `h.figure(
      [h.Class(${isStyleX ? 'className(styles.frame)' : `'${fixture.widthClass.tailwind}'`})${fixture.direction === 'rtl' ? ", h.Dir('rtl')" : ''}],
      [
        AspectRatio.aspectRatio({
          ratio: ${fixture.ratioExpr},
          ${renderer === 'tailwind' ? `class: 'rounded-lg bg-muted overflow-hidden',\n          children: [${imgExpr}],` : `children: [h.div([h.Class(className(styles.ratioBox))], [${imgExpr}])],`}
        }, h)${caption}
      ],
    )`

  return staticComponentApplication({
    componentName: 'AspectRatio',
    componentSlug: 'aspect-ratio',
    renderer,
    exampleName: fixture.title,
    componentImports: `${componentImports}${styles}`,
    viewBody,
  })
}

const aspectRatioExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  aspectRatioFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const aspectRatioExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, aspectRatioExamplesFor(renderer))
