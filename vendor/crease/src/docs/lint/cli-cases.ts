export type LintCliFile = Readonly<{ path: string; contents: string }>

export type LintCliCase = Readonly<{
  check: string
  id: string
  title: string
  description: string
  command: ReadonlyArray<string>
  /** Project files written before `creaseui-lint init`. */
  setup: ReadonlyArray<LintCliFile>
  /** Commit the setup as the trusted `main` baseline before the change. */
  baseline: boolean
  bad: LintCliFile
  good: LintCliFile
  /** Re-run `creaseui-lint init` after writing the good file. */
  goodReinit: boolean
  expect: string
}>

const mainEntry: LintCliFile = {
  path: 'src/main.ts',
  contents: "import './styles.css'\n",
}

export const LINT_CLI_CASES: ReadonlyArray<LintCliCase> = [
  {
    check: 'css',
    id: 'global-component-rule',
    title: 'A component restyled from global CSS',
    description:
      'A selector in the global stylesheet reaches into an installed component. Every button in the app changes, and the component source no longer describes how it looks.',
    command: ['css'],
    setup: [mainEntry],
    baseline: false,
    bad: {
      path: 'src/styles.css',
      contents: `:root {
  --primary: oklch(0.21 0 0);
}

[data-slot="button"] {
  background: red;
  border-radius: 0;
}
`,
    },
    good: {
      path: 'src/styles.css',
      contents: `:root {
  --primary: oklch(0.577 0.245 27.325);
}
`,
    },
    goodReinit: false,
    expect: 'styles components from global CSS',
  },
  {
    check: 'theme',
    id: 'undefined-role',
    title: 'A theme variable no stylesheet defines',
    description:
      'An installed component reads --color-border, but the stylesheet only defines --border. The browser falls back to currentColor, so every border turns black.',
    command: ['doctor'],
    setup: [
      mainEntry,
      {
        path: 'src/design/tokens.ts',
        contents: "export const tokens = { border: 'var(--color-border)' }\n",
      },
    ],
    baseline: false,
    bad: {
      path: 'src/styles.css',
      contents: `:root {
  --border: oklch(0.922 0 0);
}
`,
    },
    good: {
      path: 'src/styles.css',
      contents: `:root {
  --border: oklch(0.922 0 0);
  --color-border: var(--border);
}
`,
    },
    goodReinit: false,
    expect: 'which no stylesheet defines',
  },
  {
    check: 'doctor',
    id: 'unregistered-component',
    title: 'A component added after init',
    description:
      'A new file in the components folder renders UI but is not in crease.lock.json, so no component rules apply to it. doctor names the file instead of reporting complete coverage.',
    command: ['doctor'],
    setup: [mainEntry],
    baseline: false,
    bad: {
      path: 'src/design/badge.ts',
      contents: `import type { Html, HtmlBuilder } from 'foldkit/html'

export const badge = <Msg>(label: string, h: HtmlBuilder<Msg>): Html =>
  h.span([h.Class('badge')], [label])
`,
    },
    good: {
      path: 'src/design/badge.ts',
      contents: `import type { Html, HtmlBuilder } from 'foldkit/html'

// registered with: npx creaseui-lint init
export const badge = <Msg>(label: string, h: HtmlBuilder<Msg>): Html =>
  h.span([h.Class('badge')], [label])
`,
    },
    goodReinit: true,
    expect: 'not registered in crease.lock.json',
  },
  {
    check: 'scope',
    id: 'loosened-config',
    title: 'A feature change that loosens the lint setup',
    description:
      'The feature branch ignores the file that failed instead of fixing it. scope compares the lint inputs against the trusted main branch and fails the change.',
    command: ['scope', '--baseline', 'main'],
    setup: [mainEntry],
    baseline: true,
    bad: {
      path: 'eslint.config.js',
      contents: `import { creaseui } from '@creaseui/lint'

export default [...creaseui(), { ignores: ['src/feature.ts'] }]
`,
    },
    good: {
      path: 'src/feature.ts',
      contents: `import type { Html, HtmlBuilder } from 'foldkit/html'
import { button } from '@design/button'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  button({ children: ['Save changes'] }, h)
`,
    },
    goodReinit: false,
    expect: 'changes eslint.config.js',
  },
]
