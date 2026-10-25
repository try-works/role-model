export type LintDocsRenderer = 'tailwind' | 'stylex' | 'pleat'

export type LintCaseSetup =
  | 'strict'
  | 'tailwind'
  | 'stylex'
  | 'pleat'
  | 'constrained'
  | 'css'
  | 'theme'
  | 'doctor'
  | 'scope'

export type LintCase = Readonly<{
  rule: string
  id: string
  title: string
  description: string
  renderers: ReadonlyArray<LintDocsRenderer>
  setup: LintCaseSetup
  file: string
  bad: string
  good: string
  expect: string
}>

const HEADER = "import type { Html, HtmlBuilder } from 'foldkit/html'\n"

export const ALL_RENDERERS: ReadonlyArray<LintDocsRenderer> = [
  'tailwind',
  'stylex',
  'pleat',
]

const strict = (
  rule: string,
  id: string,
  title: string,
  description: string,
  bad: string,
  good: string,
  expect: string,
  renderers: ReadonlyArray<LintDocsRenderer> = ALL_RENDERERS,
): LintCase => ({
  rule,
  id,
  title,
  description,
  renderers,
  setup: 'strict',
  file: 'src/feature.ts',
  bad: `${HEADER}${bad}`,
  good: `${HEADER}${good}`,
  expect,
})

const authoring = (
  rule: string,
  id: string,
  setup: LintCaseSetup,
  renderer: LintDocsRenderer,
  file: string,
  title: string,
  description: string,
  bad: string,
  good: string,
  expect: string,
): LintCase => ({
  rule,
  id,
  title,
  description,
  renderers: [renderer],
  setup,
  file,
  bad: `${HEADER}${bad}`,
  good: `${HEADER}${good}`,
  expect,
})

export const LINT_CASES: ReadonlyArray<LintCase> = [
  strict(
    'no-raw-controls',
    'raw-button',
    'A hand-built save button',
    'A raw h.button has no focus ring, no variants and no disabled styling, so it drifts from every other button in the app.',
    `import { stack } from '@design/stack'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  stack({ children: [h.button([], ['Save changes'])] }, h)
`,
    `import { button } from '@design/button'
import { stack } from '@design/stack'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  stack({ children: [button({ children: ['Save changes'] }, h)] }, h)
`,
    'button',
  ),
  strict(
    'no-raw-composition',
    'raw-layout',
    'Raw layout and headings',
    'h.div, h.h1 and h.p carry no spacing, type scale or color tokens; every screen ends up with its own margins and font sizes.',
    `export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div([], [h.h1([], ['Billing']), h.p([], ['Manage your plan.'])])
`,
    `import { copy, stack } from '@design/index'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  stack({ children: [copy({ children: ['Manage your plan.'] }, h)] }, h)
`,
    'div',
  ),
  strict(
    'no-unapproved-renderer',
    'implementation-export',
    'Calling the implementation behind a component',
    'renderButton is the unstyled behavior layer the installed Button is built on. Calling it directly renders a button with none of the variant styling.',
    `import { renderButton } from '@design/behavior/button'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  renderButton({ children: ['Delete'] }, h)
`,
    `import { button } from '@design/button'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ variant: 'outline', children: ['Delete'] }, h)
`,
    'renderButton',
  ),
  strict(
    'no-application-styles',
    'inline-style',
    'Styling a component from app code',
    'Inline styles and classes set by the app override the theme: the color no longer follows dark mode and the spacing no longer matches the scale.',
    `import { stack } from '@design/stack'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  stack(
    { children: [], attributes: [h.Style({ color: 'red', padding: '13px' })] },
    h,
  )
`,
    `import { stack } from '@design/stack'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  stack({ children: [] }, h)
`,
    'Style',
  ),
  strict(
    'component-contract',
    'unknown-variant',
    'A variant the component does not have',
    'variant: "shiny" is not one of the installed variants, so the button silently falls back to its default look.',
    `import { button } from '@design/button'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ variant: 'shiny', children: ['Upgrade'] }, h)
`,
    `import { button } from '@design/button'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ variant: 'outline', children: ['Upgrade'] }, h)
`,
    'shiny',
  ),
  strict(
    'component-contract',
    'layout-padding',
    'Padding passed as placement',
    'layoutStyle may only place a component in its parent. Padding changes the inside of the component and breaks its sizing.',
    `import { button } from '@design/button'
import { layoutStyle } from '@design/contracts'

const place = layoutStyle({ padding: '24px' })

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ layoutStyle: place, children: ['Continue'] }, h)
`,
    `import { button } from '@design/button'
import { layoutStyle } from '@design/contracts'

const place = layoutStyle({ marginInlineStart: 'auto' })

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ layoutStyle: place, children: ['Continue'] }, h)
`,
    'padding',
  ),
  strict(
    'no-unverifiable-ui',
    'opaque-spread',
    'Props the lint cannot see',
    'Spreading an untyped object hides which variant and layout a component gets, so none of the other rules can check it.',
    `import { button } from '@design/button'

export const view = <Msg>(h: HtmlBuilder<Msg>, props: any): Html =>
  button({ ...props, children: ['Save'] }, h)
`,
    `import { button } from '@design/button'

export const view = <Msg>(h: HtmlBuilder<Msg>, isPrimary: boolean): Html =>
  button({ variant: isPrimary ? 'default' : 'outline', children: ['Save'] }, h)
`,
    '',
  ),
  authoring(
    'no-component-restyle',
    'color-class',
    'tailwind',
    'tailwind',
    'src/app/billing.ts',
    'Recoloring a button with classes',
    'bg-red-500 and text-white bypass the destructive variant: no hover, focus or dark-mode colors.',
    `import { button } from '@/ui/button'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ class: 'bg-red-500 text-white', children: ['Cancel plan'] }, h)
`,
    `import { button } from '@/ui/button'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ variant: 'destructive', class: 'mt-4', children: ['Cancel plan'] }, h)
`,
    'bg-red-500',
  ),
  authoring(
    'require-static-class',
    'runtime-class',
    'tailwind',
    'tailwind',
    'src/app/billing.ts',
    'Building a class at runtime',
    'A class built by a function can contain anything, so the restyle and color rules cannot inspect it.',
    `import { button } from '@/ui/button'

const spacing = (isCompact: boolean): string => (isCompact ? 'mt-2' : 'mt-6')

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ class: spacing(true), children: ['Cancel plan'] }, h)
`,
    `import { button } from '@/ui/button'

export const view = <Msg>(h: HtmlBuilder<Msg>, isDanger: boolean): Html =>
  button({ variant: isDanger ? 'destructive' : 'default', children: ['Cancel plan'] }, h)
`,
    '',
  ),
  ...ALL_RENDERERS.map(renderer =>
    authoring(
      'no-foldkit-inline-style',
      `inline-style-${renderer}`,
      renderer,
      renderer,
      `src/${renderer === 'tailwind' ? 'ui' : renderer}/notice.ts`,
      'Inline styles in component source',
      'h.Style writes a style attribute that ignores the theme and cannot be checked by the styling rules.',
      `export const notice = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div([h.Style({ color: '#b91c1c', padding: '12px' })], ['Payment failed'])
`,
      `export const notice = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div([h.DataAttribute('slot', 'notice')], ['Payment failed'])
`,
      '',
    ),
  ),
  authoring(
    'stylex-component-contract',
    'class-on-stylex',
    'stylex',
    'stylex',
    'src/app/billing.ts',
    'Tailwind classes on a StyleX component',
    'StyleX components ignore class strings; placement goes through a static layoutStyle.',
    `import { button } from '@/stylex/button'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ class: 'w-full', children: ['Continue'] }, h)
`,
    `import * as stylex from '@stylexjs/stylex'
import { button } from '@/stylex/button'

const styles = stylex.create({ fullWidth: { width: '100%' } })

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ layoutStyle: styles.fullWidth, children: ['Continue'] }, h)
`,
    '',
  ),
  authoring(
    'stylex-component-contract',
    'class-on-pleat',
    'pleat',
    'pleat',
    'src/app/billing.ts',
    'Tailwind classes on a Pleat component',
    'Pleat components ignore class strings; placement goes through layoutStyle().',
    `import { button } from '@/pleat/button'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ class: 'w-full', children: ['Continue'] }, h)
`,
    `import { button } from '@/pleat/button'
import { layoutStyle } from '@/pleat/contracts'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ layoutStyle: layoutStyle({ width: '100%' }), children: ['Continue'] }, h)
`,
    '',
  ),
  authoring(
    'no-stylex-escape',
    'raw-stylex',
    'constrained',
    'stylex',
    'src/demo/board-constrained.ts',
    'Raw StyleX in a constrained page',
    'stylex.create and stylex.props let a page invent its own colors and spacing instead of using the composition primitives.',
    `import * as stylex from '@stylexjs/stylex'
import { stack } from '@/stylex/composition'

const styles = stylex.create({ title: { color: 'red' } })

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  stack({ attributes: [...Object.values(stylex.props(styles.title))], children: [] }, h)
`,
    `import { stack } from '@/stylex/composition'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  stack({ gap: 'md', children: [] }, h)
`,
    '',
  ),
  authoring(
    'prefer-composition-primitives',
    'raw-div',
    'constrained',
    'stylex',
    'src/demo/board-constrained.ts',
    'Raw layout in a constrained page',
    'h.div and h.ul layouts skip the shared gap and surface scale.',
    `export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div([], ['Revenue'])
`,
    `import { stack } from '@/stylex/composition'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  stack({ gap: 'md', children: ['Revenue'] }, h)
`,
    'div',
  ),
  authoring(
    'pleat-prop-limits',
    'raw-color',
    'pleat',
    'pleat',
    'src/pleat/notice.ts',
    'A raw color in a Pleat style',
    'A hex color does not change with the theme: in dark mode it stays dark red on a dark surface. Pleat components read colors from tokens.',
    `import { Style } from '@pleat/core'

export const styles = { root: Style.make({ color: '#b91c1c' }) }
`,
    `import { Style } from '@pleat/core'
import { tokens } from './tokens'

export const styles = { root: Style.make({ color: tokens.destructive }) }
`,
    'color',
  ),
  authoring(
    'no-raw-colors',
    'palette-class',
    'tailwind',
    'tailwind',
    'src/ui/notice.ts',
    'A palette color in a component',
    'text-red-700 is a fixed palette color: it ignores the theme, so in dark mode it stays dark red on a dark surface.',
    `export const notice = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div([h.Class('text-red-700')], ['Payment failed'])
`,
    `export const notice = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div([h.Class('text-destructive')], ['Payment failed'])
`,
    '',
  ),
  authoring(
    'no-arbitrary-values',
    'arbitrary-width',
    'tailwind',
    'tailwind',
    'src/ui/notice.ts',
    'An arbitrary size in a component',
    'w-[45px] sits off the spacing scale, so it is wider than the size-9 controls next to it.',
    `export const notice = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div([h.Class('w-[45px]')], ['!'])
`,
    `export const notice = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div([h.Class('size-9')], ['!'])
`,
    '',
  ),
]
