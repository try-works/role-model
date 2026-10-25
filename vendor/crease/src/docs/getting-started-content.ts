import type { Html, HtmlBuilder } from 'foldkit/html'
import { sidebarScrollMemory } from '@/docs/sidebar-scroll'

import { COMPONENT_GROUPS, toSlug } from '@/docs/component-metadata'
import * as Code from '@/ui/code'
import * as CodeBlock from '@/ui/code-block'
import * as Heading from '@/ui/heading'
import * as Text from '@/ui/text'
import * as Typography from '@/ui/typography'
import {
  componentDocsPath,
  createPath,
  gettingStartedPath,
  themingPath,
  lintRulePath,
  lintRulesPath,
} from '@/route'
import { LINT_RULE_GROUPS } from '@/docs/lint/rules'
import { renderer, siteOrigin } from '@/site/config'

export type DocsGuideStyles = Readonly<{
  layout: string
  mobile: string
  summary: string
  mobileNavOuter: string
  mobileNav: string
  sidebar: string
  main: string
  content: string
  breadcrumb: string
  lead: string
  section: string
  list: string
  link: string
  navLink: string
  navActive: string
  navGroup: string
  navLabel: string
  navList: string
  toc: string
  tocLabel: string
  tocList: string
  tokenTableWrapper: string
  tokenTable: string
  tokenHead: string
  tokenCell: string
  tokenName: string
}>

export type DocsGuideCodeProps<Msg> = Readonly<{
  model: CodeBlock.Model
  toParentMessage: (message: CodeBlock.Message) => Msg
  sidebarScrolled: Msg
}>

type Guide = 'getting-started' | 'theming'

const CONFIGURATION = `{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/styles.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}`

const THEME_TOKEN_ROWS = [
  ['--background', 'Main page and app surface.'],
  ['--foreground', 'Default text on the main surface.'],
  ['--card', 'Card surface.'],
  ['--card-foreground', 'Text on cards.'],
  ['--popover', 'Menus, popovers, and other floating surfaces.'],
  ['--popover-foreground', 'Text on floating surfaces.'],
  ['--primary', 'Primary actions and selected states.'],
  ['--primary-foreground', 'Text and icons on primary surfaces.'],
  ['--secondary', 'Secondary action surfaces.'],
  ['--secondary-foreground', 'Text on secondary surfaces.'],
  ['--muted', 'Quiet surfaces such as placeholders and code panels.'],
  ['--muted-foreground', 'Supporting text and low emphasis labels.'],
  ['--accent', 'Hover and highlighted surfaces.'],
  ['--accent-foreground', 'Text on accent surfaces.'],
  ['--destructive', 'Destructive actions and error emphasis.'],
  ['--border', 'Dividers and default component borders.'],
  ['--input', 'Form control borders and input surfaces.'],
  ['--ring', 'Keyboard focus rings.'],
  ['--chart-1', 'First chart series.'],
  ['--chart-2', 'Second chart series.'],
  ['--chart-3', 'Third chart series.'],
  ['--chart-4', 'Fourth chart series.'],
  ['--chart-5', 'Fifth chart series.'],
  ['--sidebar', 'Sidebar surface.'],
  ['--sidebar-foreground', 'Default sidebar text and icons.'],
  ['--sidebar-primary', 'Primary actions inside a sidebar.'],
  ['--sidebar-primary-foreground', 'Text and icons on sidebar primary.'],
  ['--sidebar-accent', 'Hover and selected surfaces in a sidebar.'],
  ['--sidebar-accent-foreground', 'Text on sidebar accent surfaces.'],
  ['--sidebar-border', 'Sidebar dividers and component borders.'],
  ['--sidebar-ring', 'Keyboard focus rings inside a sidebar.'],
  ['--radius', 'Base corner radius used to derive component radii.'],
] as const

const TAILWIND_THEME_TOKEN_ROWS = [
  ['--font-sans', 'Sans-serif font stack used by the font-sans utility.'],
  ['--color-background', 'Maps to --background for background utilities.'],
  ['--color-foreground', 'Maps to --foreground for text utilities.'],
  ['--color-card', 'Maps to --card for card surface utilities.'],
  [
    '--color-card-foreground',
    'Maps to --card-foreground for card text utilities.',
  ],
  ['--color-popover', 'Maps to --popover for popover surface utilities.'],
  [
    '--color-popover-foreground',
    'Maps to --popover-foreground for popover text utilities.',
  ],
  ['--color-primary', 'Maps to --primary for primary surface utilities.'],
  [
    '--color-primary-foreground',
    'Maps to --primary-foreground for primary text utilities.',
  ],
  ['--color-secondary', 'Maps to --secondary for secondary surface utilities.'],
  [
    '--color-secondary-foreground',
    'Maps to --secondary-foreground for secondary text utilities.',
  ],
  ['--color-muted', 'Maps to --muted for muted surface utilities.'],
  [
    '--color-muted-foreground',
    'Maps to --muted-foreground for supporting text utilities.',
  ],
  ['--color-accent', 'Maps to --accent for highlighted surface utilities.'],
  [
    '--color-accent-foreground',
    'Maps to --accent-foreground for highlighted text utilities.',
  ],
  ['--color-destructive', 'Maps to --destructive for destructive utilities.'],
  ['--color-border', 'Maps to --border; this also powers border-border.'],
  ['--color-input', 'Maps to --input for form control utilities.'],
  ['--color-ring', 'Maps to --ring for focus ring utilities.'],
  ['--color-chart-1', 'Maps to --chart-1 for the first chart series.'],
  ['--color-chart-2', 'Maps to --chart-2 for the second chart series.'],
  ['--color-chart-3', 'Maps to --chart-3 for the third chart series.'],
  ['--color-chart-4', 'Maps to --chart-4 for the fourth chart series.'],
  ['--color-chart-5', 'Maps to --chart-5 for the fifth chart series.'],
  ['--color-sidebar', 'Maps to --sidebar for sidebar surface utilities.'],
  [
    '--color-sidebar-foreground',
    'Maps to --sidebar-foreground for sidebar text utilities.',
  ],
  [
    '--color-sidebar-primary',
    'Maps to --sidebar-primary for sidebar primary surfaces.',
  ],
  [
    '--color-sidebar-primary-foreground',
    'Maps to --sidebar-primary-foreground for sidebar primary text.',
  ],
  [
    '--color-sidebar-accent',
    'Maps to --sidebar-accent for sidebar highlighted surfaces.',
  ],
  [
    '--color-sidebar-accent-foreground',
    'Maps to --sidebar-accent-foreground for sidebar highlighted text.',
  ],
  [
    '--color-sidebar-border',
    'Maps to --sidebar-border for sidebar border utilities.',
  ],
  [
    '--color-sidebar-ring',
    'Maps to --sidebar-ring for sidebar focus ring utilities.',
  ],
  ['--radius-sm', 'Uses calc(var(--radius) - 4px).'],
  ['--radius-md', 'Uses calc(var(--radius) - 2px).'],
  ['--radius-lg', 'Uses --radius directly.'],
  ['--radius-xl', 'Uses calc(var(--radius) + 4px).'],
] as const

const STYLEX_THEME_TOKEN_ROWS = [
  ['--stylex-destructive-surface', 'Solid destructive surface.'],
  ['--stylex-soft-destructive-surface', 'Low emphasis destructive surface.'],
  [
    '--stylex-soft-destructive-hover',
    'Hover surface for soft destructive actions.',
  ],
  ['--stylex-muted-hover', 'Muted hover surface.'],
  [
    '--stylex-input-surface',
    'Input surface, including its dark mode treatment.',
  ],
  ['--stylex-outline-surface', 'Outline button surface.'],
  ['--stylex-outline-hover', 'Outline button hover surface.'],
] as const

const TAILWIND_THEME = `:root,
.light {
  --background: oklch(0.99 0.01 200);
  --foreground: oklch(0.2 0.03 250);
  --primary: oklch(0.55 0.18 205);
  --primary-foreground: oklch(0.99 0.01 200);
  --radius: 0.75rem;
}

.dark {
  --background: oklch(0.16 0.02 250);
  --foreground: oklch(0.96 0.01 200);
  --primary: oklch(0.72 0.13 190);
  --primary-foreground: oklch(0.16 0.02 250);
}`

type GuideRenderer = 'tailwind' | 'stylex' | 'pleat'

const GUIDE_RENDERER: GuideRenderer =
  renderer === 'stylex' || renderer === 'pleat' ? renderer : 'tailwind'

const RENDERER_NAMES: Readonly<Record<GuideRenderer, string>> = {
  tailwind: 'Tailwind',
  stylex: 'StyleX',
  pleat: 'Pleat',
}

const TSCONFIG_PATHS = `{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}`

const PLEAT_TSCONFIG_PATHS = `{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@pleat/core": ["./src/lib/pleat/core/src/index.ts"],
      "@pleat/foldkit": ["./src/lib/pleat/foldkit/src/index.ts"]
    }
  }
}`

const ENTRY = `// src/entry.ts
import './styles.css'
import { start } from './app/main'

start()`

type RendererSetup = Readonly<{
  requirement: string
  packages: string
  vite: string
  extraConfig?: Readonly<{ intro: string; title: string; code: string }>
  tsconfig: string
  tsconfigIntro: string
  stylesheet: string
  stylesheetIntro: string
  itemPrefix: string
  installDir: string
  installs: ReadonlyArray<readonly [string, string]>
  usage: string
  usageIntro: string
}>

const SETUPS: Readonly<Record<GuideRenderer, RendererSetup>> = {
  tailwind: {
    requirement:
      'The Tailwind renderer styles components with Tailwind CSS 4 utility classes, compiled by the Tailwind Vite plugin.',
    packages: `npm install foldkit @foldkit/ui effect @effect/platform-browser tailwindcss
npm install -D vite typescript @foldkit/vite-plugin @tailwindcss/vite`,
    vite: `import { fileURLToPath } from 'node:url'

import { foldkit } from '@foldkit/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [tailwindcss(), foldkit()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})`,
    tsconfig: TSCONFIG_PATHS,
    tsconfigIntro:
      'Mirror the @ alias in tsconfig.json so TypeScript resolves the installed imports.',
    stylesheet: `/* src/styles.css */
@import "tailwindcss";`,
    stylesheetIntro:
      'Create src/styles.css (components.json points the CLI at it below) and import it from your entry module. The first component you install writes the Crease theme variables and their Tailwind @theme mapping into this file.',
    itemPrefix: '',
    installDir: '@/ui',
    installs: [
      [
        'src/ui/button.ts',
        'The Tailwind Button source: variants, sizes, and view.',
      ],
      [
        'src/lib/button.ts',
        'Shared Button behavior used by all three renderers (button-behavior).',
      ],
      [
        'src/styles.css',
        'crease-theme adds the light and dark theme variables and the @theme inline mapping.',
      ],
      [
        'package.json',
        'Component dependencies such as class-variance-authority.',
      ],
    ],
    usage: `import type { Html, HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'

import * as Button from '@/ui/button'

const Saved = m('Saved')
type Message = ReturnType<typeof Saved>

export const view = (h: HtmlBuilder<Message>): Html =>
  Button.button(
    { children: ['Save changes'], onClick: Saved(), class: 'w-full' },
    h,
  )`,
    usageIntro:
      'Import the installed module, pass typed props and the current HtmlBuilder, and get Html back. class accepts layout utilities such as w-full or self-end; colors, heights and other visual choices come from the variant and size props.',
  },
  stylex: {
    requirement:
      'The StyleX renderer styles components with StyleX, compiled at build time by the StyleX unplugin. It does not need Tailwind.',
    packages: `npm install foldkit @foldkit/ui effect @effect/platform-browser @stylexjs/stylex
npm install -D vite typescript @foldkit/vite-plugin @stylexjs/unplugin`,
    vite: `import { fileURLToPath } from 'node:url'

import { foldkit } from '@foldkit/vite-plugin'
import stylex from '@stylexjs/unplugin'
import { defineConfig } from 'vite'

import { stylexCompilerOptions } from './stylex.config.js'

export default defineConfig({
  plugins: [stylex.vite(stylexCompilerOptions), foldkit()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})`,
    extraConfig: {
      intro:
        'Give the StyleX compiler the same @ alias, and keep its output in CSS layers so the theme base layer stays below component styles.',
      title: 'stylex.config.js',
      code: `import { fileURLToPath } from 'node:url'

export const stylexCompilerOptions = Object.freeze({
  aliases: Object.freeze({
    '@/*': Object.freeze([fileURLToPath(new URL('./src/*', import.meta.url))]),
  }),
  styleResolution: 'property-specificity',
  sxPropName: false,
  useCSSLayers: Object.freeze({
    before: Object.freeze(['base']),
    after: Object.freeze(['utilities']),
    prefix: 'stylex',
  }),
})`,
    },
    tsconfig: TSCONFIG_PATHS,
    tsconfigIntro:
      'Mirror the @ alias in tsconfig.json so TypeScript resolves the installed imports.',
    stylesheet: `/* src/styles.css */
@import './crease-theme.css';`,
    stylesheetIntro:
      'Create a stylesheet that imports the Crease theme and import it from your entry module. The first component you install adds src/crease-theme.css (the crease-theme-css item): the theme variables and a small document base layer, as plain CSS.',
    itemPrefix: 'stylex-',
    installDir: '@/ui/stylex',
    installs: [
      [
        'src/ui/stylex/button.ts',
        'The StyleX Button source: variants, sizes, and view.',
      ],
      [
        'src/ui/stylex/tokens.stylex.ts',
        'StyleX variables that read the theme CSS variables, plus the shared reset, style and contracts helpers.',
      ],
      [
        'src/lib/button.ts',
        'Shared Button behavior used by all three renderers (button-behavior).',
      ],
      [
        'src/crease-theme.css',
        'crease-theme-css: light and dark theme variables and the document base layer.',
      ],
      ['package.json', '@stylexjs/stylex.'],
    ],
    usage: `import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'

import * as Button from '@/ui/stylex/button'

const Saved = m('Saved')
type Message = ReturnType<typeof Saved>

const layout = stylex.create({
  submit: { alignSelf: 'flex-end' },
})

export const view = (h: HtmlBuilder<Message>): Html =>
  Button.button(
    { children: ['Save changes'], onClick: Saved(), layoutStyle: layout.submit },
    h,
  )`,
    usageIntro:
      'Import the installed module from the stylex folder, pass typed props and the current HtmlBuilder, and get Html back. StyleX components take no class prop: place them with layoutStyle, a stylex.create style that only holds parent-layout properties such as alignSelf, margin or width.',
  },
  pleat: {
    requirement:
      'The Pleat renderer styles components with Pleat, a Foldkit-native styling library: styles are typed TypeScript values, so there is no CSS compiler plugin and no Tailwind.',
    packages: `npm install foldkit @foldkit/ui effect @effect/platform-browser
npm install -D vite typescript @foldkit/vite-plugin`,
    vite: `import { fileURLToPath } from 'node:url'

import { foldkit } from '@foldkit/vite-plugin'
import { defineConfig } from 'vite'

const src = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  plugins: [foldkit()],
  resolve: {
    alias: {
      '@pleat/core': src('./src/lib/pleat/core/src/index.ts'),
      '@pleat/foldkit': src('./src/lib/pleat/foldkit/src/index.ts'),
      '@': src('./src'),
    },
  },
})`,
    tsconfig: PLEAT_TSCONFIG_PATHS,
    tsconfigIntro:
      'Pleat is not published to npm. Pleat components install its sources into src/lib/pleat, so map @pleat/core and @pleat/foldkit to them in both Vite and tsconfig.json. Keep the Pleat aliases before @.',
    stylesheet: `/* src/styles.css */
@import './crease-theme.css';`,
    stylesheetIntro:
      'Create a stylesheet that imports the Crease theme and import it from your entry module. The first component you install adds src/crease-theme.css (the crease-theme-css item): the theme variables and a small document base layer, as plain CSS.',
    itemPrefix: 'pleat-',
    installDir: '@/ui/pleat',
    installs: [
      [
        'src/ui/pleat/button.ts',
        'The Pleat Button source: variants, sizes, and view.',
      ],
      [
        'src/ui/pleat/tokens.ts',
        'Pleat tokens bound to the theme CSS variables, plus the shared reset, style and contracts helpers.',
      ],
      ['src/lib/pleat/core', 'The vendored @pleat/core sources (pleat-core).'],
      [
        'src/lib/pleat/foldkit',
        'The vendored @pleat/foldkit sources (pleat-foldkit).',
      ],
      [
        'src/lib/button.ts',
        'Shared Button behavior used by all three renderers (button-behavior).',
      ],
      [
        'src/crease-theme.css',
        'crease-theme-css: light and dark theme variables and the document base layer.',
      ],
      ['package.json', 'csstype, used by the Pleat style types.'],
    ],
    usage: `import type { Html, HtmlBuilder } from 'foldkit/html'
import { m } from 'foldkit/message'

import * as Button from '@/ui/pleat/button'
import { layoutStyle } from '@/ui/pleat/contracts'

const Saved = m('Saved')
type Message = ReturnType<typeof Saved>

const submit = layoutStyle({ alignSelf: 'flex-end' })

export const view = (h: HtmlBuilder<Message>): Html =>
  Button.button(
    { children: ['Save changes'], onClick: Saved(), layoutStyle: submit },
    h,
  )`,
    usageIntro:
      'Import the installed module from the pleat folder, pass typed props and the current HtmlBuilder, and get Html back. Pleat components take no class prop: place them with layoutStyle(...), which only accepts parent-layout properties such as alignSelf, margin or width.',
  },
}

const CSS_THEME_OVERRIDE = `/* src/styles.css */
@import './crease-theme.css';

:root,
.light {
  --background: oklch(0.99 0.01 200);
  --foreground: oklch(0.2 0.03 250);
  --primary: oklch(0.55 0.18 205);
  --primary-foreground: oklch(0.99 0.01 200);
  --radius: 0.75rem;
}

.dark {
  --background: oklch(0.16 0.02 250);
  --foreground: oklch(0.96 0.01 200);
  --primary: oklch(0.72 0.13 190);
  --primary-foreground: oklch(0.16 0.02 250);
}`

const STYLEX_TOKENS_SOURCE = `// src/ui/stylex/tokens.stylex.ts (installed)
export const tokens = stylex.defineVars({
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  primary: 'var(--primary)',
  primaryForeground: 'var(--primary-foreground)',
  // …one StyleX variable per theme role
})

// src/ui/stylex/card.ts (installed)
const styles = stylex.create({
  root: { backgroundColor: tokens.card, borderRadius: tokens.cardRadius },
})`

const PLEAT_TOKENS_SOURCE = `// src/ui/pleat/tokens.ts (installed)
export const tokensTheme = Theme.make(tokensSpec, {
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  primary: 'var(--primary)',
  primaryForeground: 'var(--primary-foreground)',
  // …one Pleat token per theme role
})

Global.theme(tokensTheme)

// src/ui/pleat/card.ts (installed)
const root = Style.make({
  backgroundColor: tokens.card,
  borderRadius: tokens.cardRadius,
})`

const PLEAT_PATCH_SOURCE = `import { Theme } from '@pleat/core'

import { tokens, tokensTheme } from '@/ui/pleat/tokens'

export const terminalTheme = Theme.patch(tokensTheme, tokens, {
  background: '#0a0a0a',
  foreground: '#b9b9c0',
  border: '#26262a',
})`

export const view = <Msg>(
  guide: Guide,
  h: HtmlBuilder<Msg>,
  styles: DocsGuideStyles,
  codeBlock: DocsGuideCodeProps<Msg>,
): Html => {
  const setup = SETUPS[GUIDE_RENDERER]
  const rendererName = RENDERER_NAMES[GUIDE_RENDERER]
  const otherRenderers = (['tailwind', 'stylex', 'pleat'] as const).filter(
    other => other !== GUIDE_RENDERER,
  )
  const title = guide === 'theming' ? 'Theming' : 'Get Started'
  const isGettingStarted = guide === 'getting-started'
  const toc: ReadonlyArray<readonly [string, string]> = isGettingStarted
    ? [
        ['before-you-start', 'Before you start'],
        ['install-dependencies', 'Install dependencies'],
        ['configure-vite', 'Configure Vite'],
        ['add-the-stylesheet', 'Add the stylesheet'],
        ['configure-the-cli', 'Configure the CLI'],
        ['install-components', 'Install components'],
        ['use-components', 'Use components'],
        ['next-steps', 'Next steps'],
      ]
    : [
        ['theme-contract', 'Theme tokens'],
        ...(GUIDE_RENDERER === 'tailwind'
          ? []
          : ([
              [
                'how-components-read-the-theme',
                'How components read the theme',
              ],
            ] as const)),
        ['change-the-theme', 'Change the theme'],
        ['dark-mode', 'Dark mode'],
        ...(GUIDE_RENDERER === 'pleat'
          ? ([['scoped-themes', 'Scoped themes']] as const)
          : []),
        ['component-customization', 'Component customization'],
        ['theme-builder', 'Theme builder'],
      ]
  const description = isGettingStarted
    ? `Set up a Foldkit app for the ${rendererName} renderer, install Crease UI components as source, and use them in your views.`
    : `Customize the ${rendererName} components through the shared semantic theme tokens.`
  const text = (
    children: ReadonlyArray<Html | string>,
    options?: Readonly<{
      type?: Text.TextType
      color?: Text.TextColor
      weight?: Text.TextWeight
      display?: Text.TextDisplay
      as?: Text.TextElement
    }>,
  ): Html =>
    Text.text(
      {
        type: options?.type ?? 'body',
        color: options?.color ?? 'secondary',
        display: options?.display ?? 'block',
        ...(options?.weight === undefined ? {} : { weight: options.weight }),
        ...(options?.as === undefined ? {} : { as: options.as }),
        children,
      },
      h,
    )
  const heading = (
    level: Heading.HeadingLevel,
    children: ReadonlyArray<Html | string>,
    type?: Heading.HeadingType,
  ): Html =>
    Heading.heading(
      {
        level,
        ...(type === undefined ? {} : { type }),
        ...(level === 1
          ? { weight: 'semibold' as const, textWrap: 'balance' as const }
          : {}),
        children,
      },
      h,
    )
  const section = (
    id: string,
    title: string,
    contents: ReadonlyArray<Html | string>,
  ): Html =>
    h.section(
      [h.Id(id), h.Class(styles.section)],
      [heading(2, [title]), ...contents],
    )
  const paragraph = (children: ReadonlyArray<Html | string> | string): Html =>
    Typography.typographyMuted(
      { children: typeof children === 'string' ? [children] : children },
      h,
    )
  const inlineCode = (contents: string): Html =>
    Code.code({ children: [contents] }, h)
  const code = (contents: string, label: string, language: string): Html =>
    CodeBlock.codeBlock(
      {
        model: codeBlock.model,
        toParentMessage: codeBlock.toParentMessage,
        code: contents,
        title: label,
        language,
        hasCopyButton: true,
        width: '100%',
      },
      h,
    )
  const tokenTable = (rows: ReadonlyArray<readonly [string, string]>): Html =>
    h.div(
      [h.Class(styles.tokenTableWrapper)],
      [
        h.table(
          [h.Class(styles.tokenTable)],
          [
            h.thead(
              [],
              [
                h.tr(
                  [],
                  [
                    h.th(
                      [h.Class(styles.tokenHead)],
                      [text(['Token'], { type: 'label', color: 'primary' })],
                    ),
                    h.th(
                      [h.Class(styles.tokenHead)],
                      [text(['Purpose'], { type: 'label', color: 'primary' })],
                    ),
                  ],
                ),
              ],
            ),
            h.tbody(
              [],
              rows.map(([name, purpose]) =>
                h.tr(
                  [],
                  [
                    h.th(
                      [h.Class(`${styles.tokenCell} ${styles.tokenName}`)],
                      [inlineCode(name)],
                    ),
                    h.td(
                      [h.Class(styles.tokenCell)],
                      [text([purpose], { type: 'supporting' })],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    )
  const smallText = (contents: ReadonlyArray<Html | string> | string): Html =>
    Typography.typographySmall(
      { children: typeof contents === 'string' ? [contents] : contents },
      h,
    )
  const link = (href: string, label: string, isCurrent = false): Html =>
    h.a(
      [
        h.Href(href),
        ...(isCurrent ? [h.AriaCurrent('page')] : []),
        h.Class(isCurrent ? styles.navActive : styles.navLink),
      ],
      [text([label], { color: 'inherit' })],
    )
  const componentLink = (name: string): Html =>
    h.li(
      [],
      [
        h.a(
          [h.Href(componentDocsPath(toSlug(name))), h.Class(styles.navLink)],
          [text([name], { color: 'inherit' })],
        ),
      ],
    )
  const guideLinks = () =>
    h.ul(
      [h.Class(styles.navList)],
      [
        h.li([], [link(gettingStartedPath(), 'Get Started', isGettingStarted)]),
        h.li([], [link(themingPath(), 'Theming', !isGettingStarted)]),
        h.li([], [link(lintRulesPath(), 'Lint rules', false)]),
      ],
    )
  const lintLink = (id: string, title: string): Html =>
    h.li(
      [],
      [
        h.a(
          [h.Href(lintRulePath(id)), h.Class(styles.navLink)],
          [text([title], { color: 'inherit' })],
        ),
      ],
    )
  const navGroups = [
    ...COMPONENT_GROUPS.map(group => ({
      label: group.label,
      items: group.components.map(componentLink),
    })),
    ...LINT_RULE_GROUPS.map(group => ({
      label: group.label,
      items: group.rules.map(rule => lintLink(rule.id, rule.title)),
    })),
  ]
  const sidebarGroups = (isMobile: boolean) =>
    navGroups.map(group =>
      h.div(
        [h.Class(styles.navGroup)],
        [
          h.div(
            [h.Class(styles.navLabel)],
            [text([group.label], { type: 'label', color: 'primary' })],
          ),
          h.ul(
            [h.Class(isMobile ? styles.mobileNav : styles.navList)],
            group.items,
          ),
        ],
      ),
    )
  const externalLink = (href: string, label: string): Html =>
    h.a(
      [
        h.Href(href),
        h.Class(styles.link),
        h.Attribute('target', '_blank'),
        h.Attribute('rel', 'noreferrer'),
      ],
      [text([label], { color: 'inherit', display: 'inline' })],
    )
  const contentLink = (href: string, label: string): Html =>
    h.a(
      [h.Href(href), h.Class(styles.link)],
      [text([label], { color: 'inherit', display: 'inline' })],
    )

  const otherGuides = (path: string, label: string): Html =>
    paragraph([
      `This ${label} is for the ${rendererName} renderer. The `,
      ...otherRenderers.flatMap((other, index) => [
        ...(index === 0 ? [] : [' and ']),
        externalLink(
          `${siteOrigin(other)}${path}`,
          `${RENDERER_NAMES[other]} ${label}`,
        ),
      ]),
      ' cover the other renderers. Every component exists in all three with the same props and behavior.',
    ])
  const installTable = (rows: ReadonlyArray<readonly [string, string]>): Html =>
    h.div(
      [h.Class(styles.tokenTableWrapper)],
      [
        h.table(
          [h.Class(styles.tokenTable)],
          [
            h.thead(
              [],
              [
                h.tr(
                  [],
                  [
                    h.th(
                      [h.Class(styles.tokenHead)],
                      [text(['File'], { type: 'label', color: 'primary' })],
                    ),
                    h.th(
                      [h.Class(styles.tokenHead)],
                      [text(['Contents'], { type: 'label', color: 'primary' })],
                    ),
                  ],
                ),
              ],
            ),
            h.tbody(
              [],
              rows.map(([file, contents]) =>
                h.tr(
                  [],
                  [
                    h.th(
                      [h.Class(`${styles.tokenCell} ${styles.tokenName}`)],
                      [inlineCode(file)],
                    ),
                    h.td(
                      [h.Class(styles.tokenCell)],
                      [text([contents], { type: 'supporting' })],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ],
    )
  const nextStep = (href: string, label: string, rest: string): Html =>
    h.li(
      [],
      [
        text([contentLink(href, label), rest], {
          type: 'inherit',
          color: 'inherit',
          as: 'span',
        }),
      ],
    )
  const prefix = setup.itemPrefix

  const pageSections = isGettingStarted
    ? [
        section('before-you-start', 'Before you start', [
          otherGuides(gettingStartedPath(), 'guide'),
          paragraph(
            'Crease UI is a source registry for Foldkit. The shadcn CLI copies the TypeScript files you choose into your application, where you can inspect and edit them. Your app keeps its own Foldkit and Effect versions.',
          ),
          paragraph([
            setup.requirement,
            ' Start with Node.js 22 or newer and a Foldkit Vite app. For the currently validated versions, see the ',
            externalLink(
              'https://github.com/Potti1234/creaseui/blob/main/compatibility.json',
              'compatibility matrix',
            ),
            '.',
          ]),
        ]),
        section('install-dependencies', 'Install dependencies', [
          paragraph(
            `Install Foldkit, Effect and the ${rendererName} tooling. The CLI adds each component's own packages when you install it.`,
          ),
          code(
            setup.packages,
            `Install the ${rendererName} app dependencies`,
            'bash',
          ),
        ]),
        section('configure-vite', 'Configure Vite', [
          paragraph(
            GUIDE_RENDERER === 'pleat'
              ? 'Add the Foldkit plugin and the @ alias. Pleat needs no CSS plugin: @pleat/foldkit turns the typed styles into classes.'
              : `Add the Foldkit plugin, the ${rendererName} plugin and the @ alias.`,
          ),
          code(setup.vite, 'vite.config.ts', 'typescript'),
          ...(setup.extraConfig === undefined
            ? []
            : [
                paragraph(setup.extraConfig.intro),
                code(
                  setup.extraConfig.code,
                  setup.extraConfig.title,
                  'javascript',
                ),
              ]),
          paragraph(setup.tsconfigIntro),
          code(setup.tsconfig, 'tsconfig.json', 'json'),
        ]),
        section('add-the-stylesheet', 'Add the stylesheet', [
          paragraph(setup.stylesheetIntro),
          code(setup.stylesheet, 'Application stylesheet', 'css'),
          code(
            ENTRY,
            'Import the stylesheet from the entry module',
            'typescript',
          ),
          ...(GUIDE_RENDERER === 'tailwind'
            ? []
            : [
                paragraph(
                  'Keep this stylesheet to the theme import and theme variables. Component styling lives in the installed component source, not in global CSS.',
                ),
              ]),
        ]),
        section('configure-the-cli', 'Configure the CLI', [
          paragraph([
            'Add a ',
            inlineCode('components.json'),
            ' at your app root so the CLI knows where to write files and how to resolve imports. Set ',
            inlineCode('tsx'),
            ' to ',
            inlineCode('true'),
            ' because the CLI uses that flag for TypeScript output; Crease UI does not use JSX or React.',
          ]),
          ...(GUIDE_RENDERER === 'tailwind'
            ? []
            : [
                paragraph([
                  'The CLI requires the ',
                  inlineCode('tailwind'),
                  ' block in components.json. Nothing installs Tailwind: the block only tells the CLI where your stylesheet is. ',
                  `${rendererName} components install into a ${GUIDE_RENDERER} folder under the `,
                  inlineCode('ui'),
                  ' alias, here ',
                  inlineCode(setup.installDir),
                  '.',
                ]),
              ]),
          code(CONFIGURATION, 'components.json', 'json'),
        ]),
        section('install-components', 'Install components', [
          paragraph([
            `${rendererName} items are named `,
            inlineCode(`${prefix}<component>`),
            '. Run the CLI from your app directory and pick only the components you need.',
          ]),
          code(
            `npx --yes shadcn@latest add Potti1234/creaseui/${prefix}button --yes\nnpx --yes shadcn@latest add Potti1234/creaseui/${prefix}dialog --yes`,
            `Install the ${rendererName} Button and Dialog`,
            'bash',
          ),
          paragraph(
            'Each item brings its registry dependencies with it. Installing Button writes these files:',
          ),
          installTable(setup.installs),
          paragraph([
            'Stateless components are a single view helper. Interactive components also include their ',
            inlineCode('Model'),
            ', ',
            inlineCode('Message'),
            ', and update logic. Every component page shows its ',
            rendererName,
            ' install command in its Installation section.',
          ]),
        ]),
        section('use-components', 'Use components', [
          heading(3, ['Render a stateless component']),
          paragraph(setup.usageIntro),
          code(
            setup.usage,
            `Render a ${rendererName} Button in a Foldkit view`,
            'typescript',
          ),
          heading(3, ['Compose a stateful component']),
          paragraph([
            'For a dialog, menu, calendar, or other stateful component, keep its ',
            inlineCode('Model'),
            ' in the parent model. Wrap its ',
            inlineCode('Message'),
            ' in your app message union, delegate messages to the component update function, map returned commands back to your app, and embed its view with ',
            inlineCode('h.submodel'),
            '. Keep durable values in the parent and pass them to the component as controlled props.',
          ]),
        ]),
        section('next-steps', 'Next steps', [
          h.ul(
            [h.Class(styles.list)],
            [
              nextStep(
                componentDocsPath('button'),
                'Explore Button',
                ' for stateless rendering and variants.',
              ),
              nextStep(
                componentDocsPath('dialog'),
                'Explore Dialog',
                ' for state, messages, and parent composition.',
              ),
              nextStep(
                themingPath(),
                'Read the Theming guide',
                ` to customize the ${rendererName} colors, radius, and dark mode.`,
              ),
            ],
          ),
        ]),
      ]
    : [
        section('theme-contract', 'Theme tokens', [
          otherGuides(themingPath(), 'theming guide'),
          paragraph(
            'Crease UI styles components with semantic CSS variables. One palette updates buttons, inputs, overlays, charts, and sidebars together, while components keep their behavior and layout.',
          ),
          GUIDE_RENDERER === 'tailwind'
            ? paragraph([
                'Tailwind registry components depend on ',
                inlineCode('crease-theme'),
                '. The CLI writes its light and dark values into the stylesheet named by ',
                inlineCode('tailwind.css'),
                ' in ',
                inlineCode('components.json'),
                ' and maps them to Tailwind utilities.',
              ])
            : paragraph([
                `${rendererName} registry components depend on `,
                inlineCode('crease-theme-css'),
                ', which installs the same variables as plain CSS in ',
                inlineCode('src/crease-theme.css'),
                '. No Tailwind is involved.',
              ]),
          tokenTable(THEME_TOKEN_ROWS),
          ...(GUIDE_RENDERER === 'tailwind'
            ? [
                heading(3, ['Tailwind utility tokens']),
                paragraph(
                  'The @theme inline block publishes color aliases, the sans-serif font token, and four radius utilities. They are generated from the variables above and power classes such as bg-background or rounded-lg.',
                ),
                tokenTable(TAILWIND_THEME_TOKEN_ROWS),
              ]
            : []),
          ...(GUIDE_RENDERER === 'stylex'
            ? [
                heading(3, ['StyleX surface aliases']),
                paragraph(
                  'StyleX components also read these surface aliases. crease-theme.css defines them from the core tokens in both color schemes; override them only when a StyleX surface should differ from the default derivation.',
                ),
                tokenTable(STYLEX_THEME_TOKEN_ROWS),
              ]
            : []),
        ]),
        ...(GUIDE_RENDERER === 'tailwind'
          ? []
          : [
              section(
                'how-components-read-the-theme',
                'How components read the theme',
                GUIDE_RENDERER === 'stylex'
                  ? [
                      paragraph([
                        'The installed ',
                        inlineCode('tokens.stylex.ts'),
                        ' defines one StyleX variable per role, whose value is the matching CSS variable. Components only use these tokens in their ',
                        inlineCode('stylex.create'),
                        ' styles, so changing a CSS variable restyles every component that uses the role.',
                      ]),
                      code(
                        STYLEX_TOKENS_SOURCE,
                        'StyleX tokens bound to the theme variables',
                        'typescript',
                      ),
                    ]
                  : [
                      paragraph([
                        'The installed ',
                        inlineCode('tokens.ts'),
                        ' declares one Pleat token per role with ',
                        inlineCode('Token.make'),
                        ' and gives each the matching CSS variable through ',
                        inlineCode('Theme.make'),
                        '. ',
                        inlineCode('Global.theme'),
                        ' binds them once at the document root. Components only use these tokens in their ',
                        inlineCode('Style.make'),
                        ' styles, so changing a CSS variable restyles every component that uses the role.',
                      ]),
                      code(
                        PLEAT_TOKENS_SOURCE,
                        'Pleat tokens bound to the theme variables',
                        'typescript',
                      ),
                    ],
              ),
            ]),
        section('change-the-theme', 'Change the theme', [
          GUIDE_RENDERER === 'tailwind'
            ? paragraph([
                'Edit the ',
                inlineCode(':root'),
                ' and ',
                inlineCode('.dark'),
                ' values in the stylesheet selected by ',
                inlineCode('components.json'),
                '. Keep the generated ',
                inlineCode('@theme inline'),
                ' mapping: it makes the variables available as utilities such as ',
                inlineCode('bg-background'),
                ', ',
                inlineCode('text-foreground'),
                ', and ',
                inlineCode('rounded-lg'),
                '.',
              ])
            : paragraph([
                'Override the variables in your stylesheet after the ',
                inlineCode('crease-theme.css'),
                ' import, or edit the installed file directly. You do not change any ',
                rendererName,
                ' source to retheme the app.',
              ]),
          code(
            GUIDE_RENDERER === 'tailwind' ? TAILWIND_THEME : CSS_THEME_OVERRIDE,
            'Override primary colors and radius for light and dark mode',
            'css',
          ),
          paragraph(
            'The example changes the page surface, foreground, primary color, and radius and keeps the rest of the default palette. Set every variable you change in both blocks so the theme stays legible in light and dark mode.',
          ),
        ]),
        section('dark-mode', 'Dark mode', [
          paragraph([
            'Add or remove the ',
            inlineCode('.dark'),
            ' class on the document root or on an ancestor of the themed components. ',
            GUIDE_RENDERER === 'tailwind'
              ? 'Existing utility classes then resolve against the active variable block.'
              : `The ${rendererName} tokens point at the CSS variables, so they follow the active block without recompiling anything.`,
          ]),
        ]),
        ...(GUIDE_RENDERER === 'pleat'
          ? [
              section('scoped-themes', 'Scoped themes', [
                paragraph([
                  'Inside component source you own, ',
                  inlineCode('Theme.patch'),
                  ' overrides a few tokens for one subtree and re-derives the aliases that depend on them. The installed Log Stream uses it for its always-dark terminal surface.',
                ]),
                code(
                  PLEAT_PATCH_SOURCE,
                  'Override tokens for one subtree with Theme.patch',
                  'typescript',
                ),
                paragraph([
                  'Apply it on the subtree root with ',
                  inlineCode('css(...Theme.bindings(terminalTheme))'),
                  ' from ',
                  inlineCode('@pleat/foldkit'),
                  '.',
                ]),
              ]),
            ]
          : []),
        section('component-customization', 'Component customization', [
          paragraph([
            'Use semantic tokens for changes that should apply across the app, and a component’s documented ',
            inlineCode('variant'),
            ' and ',
            inlineCode('size'),
            ' for supported visual choices. ',
            GUIDE_RENDERER === 'tailwind'
              ? 'The class prop accepts parent-layout utilities only.'
              : 'layoutStyle accepts parent-layout properties only; component internals expose no arbitrary className or style.',
          ]),
          paragraph(
            'For anything beyond that, edit the installed source: it is your code, and the component pages document its exports.',
          ),
        ]),
        section('theme-builder', 'Create a theme preset', [
          paragraph(
            'The Create page lets you adjust the color palette, chart colors, radius, typography, and sidebar treatment together. Copy its registry JSON to keep the preset reproducible, or copy the generated CSS variables into your stylesheet.',
          ),
          h.a(
            [h.Href(createPath()), h.Class(styles.link)],
            [
              text(['Open the theme builder'], {
                color: 'inherit',
                display: 'inline',
              }),
            ],
          ),
        ]),
      ]

  return h.div(
    [h.Class(styles.layout)],
    [
      h.details(
        [h.Class(styles.mobile)],
        [
          h.summary([h.Class(styles.summary)], [smallText('Browse docs')]),
          h.nav(
            [
              h.AriaLabel('Documentation navigation'),
              h.Class(styles.mobileNavOuter),
            ],
            [
              h.div([h.Class(styles.navGroup)], [guideLinks()]),
              ...sidebarGroups(true),
            ],
          ),
        ],
      ),
      h.aside(
        [
          h.Class(styles.sidebar),
          sidebarScrollMemory(h, codeBlock.sidebarScrolled),
        ],
        [
          h.nav(
            [h.AriaLabel('Documentation navigation')],
            [
              h.div([h.Class(styles.navGroup)], [guideLinks()]),
              ...sidebarGroups(false),
            ],
          ),
        ],
      ),
      h.main(
        [h.Class(styles.main)],
        [
          h.div(
            [h.Class(styles.content)],
            [
              h.header(
                [],
                [
                  h.div(
                    [h.AriaLabel('Breadcrumb'), h.Class(styles.breadcrumb)],
                    [
                      h.a(
                        [h.Href(gettingStartedPath()), h.Class(styles.link)],
                        [
                          text(['Docs'], {
                            color: 'inherit',
                            display: 'inline',
                          }),
                        ],
                      ),
                      h.span(
                        [h.AriaHidden(true)],
                        [
                          text(['/'], {
                            color: 'secondary',
                            display: 'inline',
                          }),
                        ],
                      ),
                      h.span(
                        [h.AriaCurrent('page')],
                        [
                          text([title], {
                            color: 'secondary',
                            display: 'inline',
                          }),
                        ],
                      ),
                    ],
                  ),
                  heading(1, [title], 'display-2'),
                  h.div(
                    [h.Class(styles.lead)],
                    [Typography.typographyLead({ children: [description] }, h)],
                  ),
                ],
              ),
              ...pageSections,
            ],
          ),
        ],
      ),
      h.aside(
        [h.Class(styles.toc)],
        [
          h.nav(
            [h.AriaLabel('On this page')],
            [
              h.div([h.Class(styles.tocLabel)], [smallText('On this page')]),
              h.ul(
                [h.Class(styles.tocList)],
                toc.map(([id, label]) =>
                  h.li(
                    [],
                    [
                      h.a(
                        [h.Href(`#${id}`), h.Class(styles.link)],
                        [
                          text([label], {
                            color: 'inherit',
                            display: 'inline',
                          }),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
