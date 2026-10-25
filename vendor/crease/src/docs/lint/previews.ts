import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Heading from '@/ui/heading'
import * as Typography from '@/ui/typography'

export type LintPreviewKind = 'bad' | 'good'

export type LintButtonProps = Readonly<{
  variant?: 'default' | 'destructive' | 'outline'
  children: ReadonlyArray<string>
  fullWidth?: boolean
  broken?: 'padding' | 'restyle'
}>

export type LintDocsStyles = Readonly<{
  caseBlock: string
  caseHeader: string
  compare: string
  panel: string
  panelHeader: string
  badLabel: string
  goodLabel: string
  preview: string
  previewWide: string
  diagnostics: string
  diagnostic: string
  diagnosticMeta: string
  diagnosticRule: string
  diagnosticSource: string
  note: string
  terminal: string
}>

export type LintRendererKit = Readonly<{
  styles: LintDocsStyles
  primaryVars: ReadonlyArray<string>
  button: <Msg>(props: LintButtonProps, h: HtmlBuilder<Msg>) => Html
}>

const DESTRUCTIVE = 'var(--destructive)'
const FIXED_PRIMARY = 'oklch(0.577 0.245 27.325)'

const heading = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  Heading.heading({ level: 3, children: [text] }, h)

const muted = <Msg>(text: string, h: HtmlBuilder<Msg>): Html =>
  Typography.typographyMuted({ children: [text] }, h)

const stack = <Msg>(
  kit: LintRendererKit,
  children: ReadonlyArray<Html>,
  h: HtmlBuilder<Msg>,
): Html => h.div([h.Class(kit.styles.preview)], [...children])

/** Live renders of each documented case: the bad version is the UI the
    flagged code actually produces, the good version uses the installed
    component on this site's renderer. */
export const lintPreview = <Msg>(
  kit: LintRendererKit,
  key: string,
  kind: LintPreviewKind,
  h: HtmlBuilder<Msg>,
): Html => {
  const bad = kind === 'bad'
  const one = (child: Html): Html => stack(kit, [child], h)
  const { button } = kit
  switch (key) {
    case 'no-raw-controls/raw-button':
      return one(
        bad
          ? h.button([h.Type('button')], ['Save changes'])
          : button({ children: ['Save changes'] }, h),
      )
    case 'no-raw-composition/raw-layout':
      return bad
        ? one(
            h.div([], [h.h1([], ['Billing']), h.p([], ['Manage your plan.'])]),
          )
        : stack(kit, [heading('Billing', h), muted('Manage your plan.', h)], h)
    case 'no-unapproved-renderer/implementation-export':
      return one(
        bad
          ? h.button(
              [h.Type('button'), h.DataAttribute('slot', 'button')],
              ['Delete'],
            )
          : button({ variant: 'outline', children: ['Delete'] }, h),
      )
    case 'no-application-styles/inline-style':
      return one(
        bad
          ? h.div(
              [h.Style({ color: 'red', padding: '13px' })],
              ['Plan renews on May 1'],
            )
          : muted('Plan renews on May 1', h),
      )
    case 'component-contract/unknown-variant':
      return one(
        button(
          { variant: bad ? 'default' : 'outline', children: ['Upgrade'] },
          h,
        ),
      )
    case 'component-contract/layout-padding':
      return h.div(
        [h.Class(kit.styles.previewWide)],
        [
          button(
            bad
              ? { broken: 'padding', children: ['Continue'] }
              : { children: ['Continue'] },
            h,
          ),
        ],
      )
    case 'no-unverifiable-ui/opaque-spread':
      return one(
        button({ variant: bad ? 'default' : 'outline', children: ['Save'] }, h),
      )
    case 'no-component-restyle/color-class':
      return one(
        button(
          bad
            ? { broken: 'restyle', children: ['Cancel plan'] }
            : { variant: 'destructive', children: ['Cancel plan'] },
          h,
        ),
      )
    case 'require-static-class/runtime-class':
      return one(
        button(
          bad
            ? { broken: 'restyle', children: ['Cancel plan'] }
            : { variant: 'destructive', children: ['Cancel plan'] },
          h,
        ),
      )
    case 'no-foldkit-inline-style/inline-style-tailwind':
    case 'no-foldkit-inline-style/inline-style-stylex':
    case 'no-foldkit-inline-style/inline-style-pleat':
      return one(
        bad
          ? h.div(
              [h.Style({ color: '#b91c1c', padding: '12px' })],
              ['Payment failed'],
            )
          : h.div([h.Style({ color: DESTRUCTIVE })], ['Payment failed']),
      )
    case 'stylex-component-contract/class-on-stylex':
    case 'stylex-component-contract/class-on-pleat':
      return h.div(
        [h.Class(kit.styles.previewWide)],
        [
          button(
            bad
              ? { children: ['Continue'] }
              : { fullWidth: true, children: ['Continue'] },
            h,
          ),
        ],
      )
    case 'no-stylex-escape/raw-stylex':
    case 'prefer-composition-primitives/raw-div':
      return one(
        bad
          ? h.div([h.Style({ color: 'red' })], ['Revenue'])
          : heading('Revenue', h),
      )
    case 'pleat-prop-limits/raw-color':
    case 'no-raw-colors/palette-class':
      return h.div(
        [
          h.Style({
            display: 'grid',
            gap: '0.75rem',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            width: '100%',
          }),
        ],
        ['light', 'dark'].map(scope =>
          h.div(
            [
              h.Class(scope),
              h.Style({
                background: 'var(--background)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--foreground)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
                padding: '0.75rem 1rem',
              }),
            ],
            [
              h.span(
                [
                  h.Style({
                    color: 'var(--muted-foreground)',
                    fontSize: '0.75rem',
                  }),
                ],
                [scope === 'dark' ? 'Dark theme' : 'Light theme'],
              ),
              h.span(
                [
                  h.Style({
                    color: bad ? '#b91c1c' : DESTRUCTIVE,
                    fontWeight: '500',
                  }),
                ],
                ['Payment failed'],
              ),
            ],
          ),
        ),
      )
    case 'no-arbitrary-values/arbitrary-width': {
      const box = (width: string, label: string): Html =>
        h.div(
          [
            h.Style({
              alignItems: 'center',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              height: '2.25rem',
              justifyContent: 'center',
              width,
            }),
          ],
          [label],
        )
      return h.div(
        [h.Style({ display: 'flex', gap: '0.5rem' })],
        [box(bad ? '45px' : '2.25rem', '!'), box('2.25rem', '?')],
      )
    }
    case 'css/global-component-rule':
      return one(
        bad
          ? button({ broken: 'restyle', children: ['Save changes'] }, h)
          : h.div(
              [
                h.Style(
                  Object.fromEntries(
                    kit.primaryVars.map(name => [name, FIXED_PRIMARY]),
                  ),
                ),
              ],
              [button({ children: ['Save changes'] }, h)],
            ),
      )
    case 'theme/undefined-role':
      return one(
        h.div(
          [
            h.Style({
              border: `1px solid ${bad ? 'currentColor' : 'var(--border)'}`,
              borderRadius: 'var(--radius)',
              padding: '1rem 1.25rem',
            }),
          ],
          ['Card with a border'],
        ),
      )
    case 'doctor/unregistered-component':
      return one(
        h.span(
          [
            h.Style(
              bad
                ? { background: '#facc15', color: '#000', padding: '2px 6px' }
                : {
                    background: 'var(--secondary)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--secondary-foreground)',
                    fontSize: '.75rem',
                    fontWeight: '500',
                    padding: '2px 8px',
                  },
            ),
          ],
          ['Beta'],
        ),
      )
    case 'scope/loosened-config':
      return one(
        bad
          ? h.button([h.Type('button')], ['Save changes'])
          : button({ children: ['Save changes'] }, h),
      )
    default:
      return one(muted('No preview for this case.', h))
  }
}
