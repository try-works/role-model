import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { statelessComponentApplication } from '@/docs/components/pages/authored-page'
export const directionFixtures = [
  {
    title: 'Right to Left',
    description:
      'Apply RTL direction to content and direction-aware child controls.',
  },
  {
    title: 'Mixed Direction',
    description:
      'Nest a local LTR token inside an RTL sentence when the content requires it.',
  },
] as const
const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const sx = renderer !== 'tailwind'
  return statelessComponentApplication({
    componentName: 'Direction',
    componentSlug: 'direction',
    renderer,
    exampleName: directionFixtures[index]?.title ?? directionFixtures[0].title,
    componentImports: `import * as Button from '@/${sx ? 'stylex' : 'ui'}/button'${sx ? "\nimport * as stylex from '@stylexjs/stylex'\n\nconst styles = stylex.create({ row: { alignItems: 'center', display: 'flex', gap: '0.75rem' }, token: { display: 'inline-block', fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace)' } })" : ''}`,
    viewBody:
      index === 0
        ? `${sx ? "h.div([h.Class(stylex.props(styles.row).className ?? '')], [Direction.direction({" : 'Direction.direction({'} direction: 'rtl', ${sx ? '' : "class: 'flex items-center gap-3', "}children: [Button.button({ onClick: ClickedExample(), children: ['التالي', '←'] }, h)] }, h)${sx ? '])' : ''},`
        : `Direction.direction({ direction: 'rtl', children: ['الإصدار ', ${sx ? "h.span([h.Class(stylex.props(styles.token).className ?? '')], [Direction.direction({ direction: 'ltr', children: ['v0.163.0'] }, h)])" : "Direction.direction({ direction: 'ltr', class: 'inline-block font-mono', children: ['v0.163.0'] }, h)"}] }, h),`,
  })
}
const directionExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  directionFixtures.map((fixture, index) => ({
    ...fixture,
    code: source(index, renderer),
  }))

export const directionExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, directionExamplesFor(renderer))
