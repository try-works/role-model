import type { Html, HtmlBuilder } from 'foldkit/html'
import { sidebarScrollMemory } from '@/docs/sidebar-scroll'

import type {
  DocsGuideCodeProps,
  DocsGuideStyles,
} from '@/docs/getting-started-content'
import { LINT_CASES, type LintCase } from '@/docs/lint/cases'
import { LINT_CLI_CASES, type LintCliCase } from '@/docs/lint/cli-cases'
import type { LintCliRun, LintDiagnostic } from '@/docs/lint/diagnostic'
import {
  LINT_CLI_OUTPUT,
  LINT_DIAGNOSTICS,
} from '@/docs/lint/generated-diagnostics'
import { lintPreview, type LintRendererKit } from '@/docs/lint/previews'
import { findLintRule, LINT_RULE_GROUPS } from '@/docs/lint/rules'
import { renderer } from '@/site/config'
import * as CodeBlock from '@/ui/code-block'
import * as Heading from '@/ui/heading'
import * as Text from '@/ui/text'
import * as Typography from '@/ui/typography'
import {
  gettingStartedPath,
  lintRulePath,
  lintRulesPath,
  themingPath,
  componentDocsPath,
} from '@/route'
import { COMPONENT_GROUPS, toSlug } from '@/docs/component-metadata'

export const view = <Msg>(
  rule: string,
  h: HtmlBuilder<Msg>,
  styles: DocsGuideStyles,
  codeBlock: DocsGuideCodeProps<Msg>,
  kit: LintRendererKit,
): Html => {
  const current = rule === '' ? undefined : findLintRule(rule)
  const title = current?.title ?? 'Lint rules'
  const text = (children: ReadonlyArray<Html | string>): Html =>
    Text.text({ type: 'body', color: 'inherit', display: 'block', children }, h)
  const link = (href: string, label: string, isCurrent: boolean): Html =>
    h.a(
      [
        h.Href(href),
        ...(isCurrent ? [h.AriaCurrent('page')] : []),
        h.Class(isCurrent ? styles.navActive : styles.navLink),
      ],
      [text([label])],
    )
  const nav = (): ReadonlyArray<Html> => [
    h.div(
      [h.Class(styles.navGroup)],
      [
        h.ul(
          [h.Class(styles.navList)],
          [
            h.li([], [link(gettingStartedPath(), 'Get Started', false)]),
            h.li([], [link(themingPath(), 'Theming', false)]),
            h.li([], [link(lintRulesPath(), 'Lint rules', rule === '')]),
          ],
        ),
      ],
    ),
    ...COMPONENT_GROUPS.map(group =>
      h.div(
        [h.Class(styles.navGroup)],
        [
          h.div(
            [h.Class(styles.navLabel)],
            [
              Text.text(
                { type: 'label', color: 'primary', children: [group.label] },
                h,
              ),
            ],
          ),
          h.ul(
            [h.Class(styles.navList)],
            group.components.map(name =>
              h.li([], [link(componentDocsPath(toSlug(name)), name, false)]),
            ),
          ),
        ],
      ),
    ),
    ...LINT_RULE_GROUPS.map(group =>
      h.div(
        [h.Class(styles.navGroup)],
        [
          h.div(
            [h.Class(styles.navLabel)],
            [
              Text.text(
                { type: 'label', color: 'primary', children: [group.label] },
                h,
              ),
            ],
          ),
          h.ul(
            [h.Class(styles.navList)],
            group.rules.map(item =>
              h.li(
                [],
                [link(lintRulePath(item.id), item.title, item.id === rule)],
              ),
            ),
          ),
        ],
      ),
    ),
  ]
  const body: ReadonlyArray<Html> =
    current === undefined
      ? LINT_RULE_GROUPS.map(group =>
          h.section(
            [h.Id(group.id), h.Class(styles.section)],
            [
              Heading.heading({ level: 2, children: [group.label] }, h),
              Typography.typographyMuted({ children: [group.description] }, h),
              h.ul(
                [h.Class(styles.list)],
                group.rules.map(item =>
                  h.li(
                    [],
                    [
                      h.a(
                        [h.Href(lintRulePath(item.id)), h.Class(styles.link)],
                        [text([item.title])],
                      ),
                      Typography.typographyMuted(
                        { children: [item.summary] },
                        h,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        )
      : rulePage(current.id, current.summary, h, codeBlock, kit)
  return h.div(
    [h.Class(styles.layout)],
    [
      h.details(
        [h.Class(styles.mobile)],
        [
          h.summary(
            [h.Class(styles.summary)],
            [Typography.typographySmall({ children: ['Browse docs'] }, h)],
          ),
          h.nav(
            [
              h.AriaLabel('Documentation navigation'),
              h.Class(styles.mobileNavOuter),
            ],
            nav(),
          ),
        ],
      ),
      h.aside(
        [
          h.Class(styles.sidebar),
          sidebarScrollMemory(h, codeBlock.sidebarScrolled),
        ],
        [h.nav([h.AriaLabel('Documentation navigation')], nav())],
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
                  Heading.heading(
                    {
                      level: 1,
                      type: 'display-2',
                      weight: 'semibold',
                      children: [title],
                    },
                    h,
                  ),
                  h.div(
                    [h.Class(styles.lead)],
                    [
                      Typography.typographyLead(
                        {
                          children: [
                            current === undefined
                              ? 'Every rule Crease UI adds, with the bad UI pattern it catches, the diagnostic it reports and the pattern to use instead.'
                              : current.group.label,
                          ],
                        },
                        h,
                      ),
                    ],
                  ),
                ],
              ),
              ...body,
            ],
          ),
        ],
      ),
    ],
  )
}

const RENDERER_LABEL = {
  tailwind: 'Tailwind',
  stylex: 'StyleX',
  pleat: 'Pleat',
}

const sourceExcerpt = (code: string, diagnostic: LintDiagnostic): string => {
  const lines = code.split('\n')
  const line = lines[diagnostic.line - 1] ?? ''
  const end =
    diagnostic.endLine === diagnostic.line
      ? diagnostic.endColumn
      : line.length + 1
  const width = Math.max(1, end - diagnostic.column)
  const gutter = `${diagnostic.line} | `
  return `${gutter}${line}\n${' '.repeat(gutter.length + diagnostic.column - 1)}${'^'.repeat(width)}`
}

const rulePage = <Msg>(
  ruleId: string,
  summary: string,
  h: HtmlBuilder<Msg>,
  codeBlock: DocsGuideCodeProps<Msg>,
  kit: LintRendererKit,
): ReadonlyArray<Html> => {
  const { styles } = kit
  const cases = LINT_CASES.filter(item => item.rule === ruleId)
  const here = cases.filter(item => item.renderers.includes(renderer))
  const code = (contents: string, title: string): Html =>
    CodeBlock.codeBlock(
      {
        model: codeBlock.model,
        toParentMessage: codeBlock.toParentMessage,
        code: contents.trimStart(),
        title,
        language: 'ts',
        hasCopyButton: true,
        width: '100%',
      },
      h,
    )
  const label = (kind: 'bad' | 'good'): Html =>
    h.span(
      [h.Class(kind === 'bad' ? styles.badLabel : styles.goodLabel)],
      [kind === 'bad' ? 'Bad' : 'Good'],
    )
  const diagnosticsView = (item: LintCase): Html => {
    const shown = item.bad.trimStart()
    const offset = item.bad.length - shown.length
    const leadingLines = item.bad.slice(0, offset).split('\n').length - 1
    const diagnostics =
      LINT_DIAGNOSTICS[`${item.rule}/${item.id}/${renderer}`] ?? []
    return h.div(
      [
        h.Class(styles.diagnostics),
        h.DataAttribute('lint-diagnostics', item.id),
      ],
      diagnostics.map(diagnostic => {
        const shifted = {
          ...diagnostic,
          line: diagnostic.line - leadingLines,
          endLine: diagnostic.endLine - leadingLines,
        }
        return h.div(
          [h.Class(styles.diagnostic)],
          [
            h.span(
              [h.Class(styles.diagnosticMeta)],
              [`${item.file}:${shifted.line}:${shifted.column}`],
            ),
            h.span(
              [h.Class(styles.diagnosticRule)],
              [`error  ${diagnostic.ruleId}`],
            ),
            h.span([], [diagnostic.message]),
            h.pre(
              [h.Class(styles.diagnosticSource)],
              [sourceExcerpt(shown, shifted)],
            ),
          ],
        )
      }),
    )
  }
  const panel = (item: LintCase, kind: 'bad' | 'good'): Html =>
    h.div(
      [
        h.Class(styles.panel),
        h.DataAttribute('lint-example', `${item.id}-${kind}`),
      ],
      [
        h.div(
          [h.Class(styles.panelHeader)],
          [
            label(kind),
            kind === 'bad'
              ? 'What the code renders'
              : 'With the installed component',
          ],
        ),
        lintPreview(kit, `${item.rule}/${item.id}`, kind, h),
        code(kind === 'bad' ? item.bad : item.good, item.file),
        ...(kind === 'bad' ? [diagnosticsView(item)] : []),
      ],
    )
  const terminal = (run: LintCliRun | undefined): Html =>
    h.div(
      [h.Class(styles.diagnostics), h.DataAttribute('lint-terminal', '')],
      run === undefined
        ? []
        : [
            h.pre(
              [h.Class(styles.terminal)],
              [
                `$ ${run.command}\n${run.lines.join('\n')}\n(exit code ${run.exitCode})`,
              ],
            ),
          ],
    )
  const cliPanel = (item: LintCliCase, kind: 'bad' | 'good'): Html => {
    const file = kind === 'bad' ? item.bad : item.good
    return h.div(
      [
        h.Class(styles.panel),
        h.DataAttribute('lint-example', `${item.id}-${kind}`),
      ],
      [
        h.div(
          [h.Class(styles.panelHeader)],
          [
            label(kind),
            kind === 'bad' ? 'What the project renders' : 'After the fix',
          ],
        ),
        lintPreview(kit, `${item.check}/${item.id}`, kind, h),
        CodeBlock.codeBlock(
          {
            model: codeBlock.model,
            toParentMessage: codeBlock.toParentMessage,
            code: file.contents,
            title: file.path,
            language: file.path.endsWith('.css') ? 'css' : 'ts',
            hasCopyButton: true,
            width: '100%',
          },
          h,
        ),
        terminal(LINT_CLI_OUTPUT[`${item.check}/${item.id}`]?.[kind]),
      ],
    )
  }
  const cliCases = LINT_CLI_CASES.filter(item => item.check === ruleId)
  if (cliCases.length > 0)
    return [
      h.section(
        [h.Id('overview'), h.Class(styles.caseBlock)],
        [Typography.typographyMuted({ children: [summary] }, h)],
      ),
      ...cliCases.map(item =>
        h.section(
          [h.Id(item.id), h.Class(styles.caseBlock)],
          [
            h.div(
              [h.Class(styles.caseHeader)],
              [
                Heading.heading({ level: 2, children: [item.title] }, h),
                Typography.typographyMuted({ children: [item.description] }, h),
              ],
            ),
            h.div(
              [h.Class(styles.compare)],
              [cliPanel(item, 'bad'), cliPanel(item, 'good')],
            ),
          ],
        ),
      ),
    ]
  const others = [...new Set(cases.flatMap(item => item.renderers))].filter(
    other => other !== renderer,
  )
  return [
    h.section(
      [h.Id('overview'), h.Class(styles.caseBlock)],
      [Typography.typographyMuted({ children: [summary] }, h)],
    ),
    ...(here.length === 0
      ? [
          h.p(
            [h.Class(styles.note)],
            [
              `This rule checks ${others.map(other => RENDERER_LABEL[other]).join(' and ')} component source and does not run on ${RENDERER_LABEL[renderer]} projects.`,
            ],
          ),
        ]
      : here.map(item =>
          h.section(
            [h.Id(item.id), h.Class(styles.caseBlock)],
            [
              h.div(
                [h.Class(styles.caseHeader)],
                [
                  Heading.heading({ level: 2, children: [item.title] }, h),
                  Typography.typographyMuted(
                    { children: [item.description] },
                    h,
                  ),
                ],
              ),
              h.div(
                [h.Class(styles.compare)],
                [panel(item, 'bad'), panel(item, 'good')],
              ),
            ],
          ),
        )),
  ]
}
