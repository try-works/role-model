import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { skeletonFixtures } from '@/docs/components/pages/skeleton/shared'
import * as Card from '@/stylex/card'
import * as Skeleton from '@/stylex/skeleton'
import { className } from '@/stylex/style'

const styles = stylex.create({
  row: { gap: '1rem', alignItems: 'center', display: 'flex' },
  circleLg: { height: '3rem', width: '3rem' },
  circleSm: { flexShrink: 0, height: '2.5rem', width: '2.5rem' },
  lines: { display: 'block' },
  linesGrid: { gap: '0.5rem', display: 'grid' },
  lineWide: { height: '1rem', marginBottom: '0.5rem', width: '15.625rem' },
  lineMid: { height: '1rem', width: '12.5rem' },
  line150: { height: '1rem', width: '9.375rem' },
  line100: { height: '1rem', width: '6.25rem' },
  avatarRow: {
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    width: 'fit-content',
  },
  card: { maxWidth: '20rem', width: '100%' },
  lineTwoThirds: { height: '1rem', width: '66.666667%' },
  lineHalf: { height: '1rem', width: '50%' },
  media: { aspectRatio: '16 / 9', width: '100%' },
  textStack: {
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '20rem',
    width: '100%',
  },
  lineFull: { height: '1rem', width: '100%' },
  lineThreeQuarters: { height: '1rem', width: '75%' },
  formStack: {
    gap: '1.75rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '20rem',
    width: '100%',
  },
  fieldStack: { gap: '0.75rem', display: 'flex', flexDirection: 'column' },
  labelA: { height: '1rem', width: '5rem' },
  labelB: { height: '1rem', width: '6rem' },
  inputFull: { height: '2rem', width: '100%' },
  buttonBar: { height: '2rem', width: '6rem' },
  tableStack: {
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '24rem',
    width: '100%',
  },
  tableRow: { gap: '1rem', display: 'flex' },
  cellGrow: { flexBasis: '0%', flexGrow: 1, flexShrink: 1, height: '1rem' },
  cellW24: { height: '1rem', width: '6rem' },
  cellW20: { height: '1rem', width: '5rem' },
})

const demoRow = <Msg>(rtl: boolean, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class(className(styles.row)), ...(rtl ? [h.Dir('rtl')] : [])],
    [
      Skeleton.skeleton({ shape: 'circle', layoutStyle: styles.circleLg }, h),
      h.div(
        [h.Class(className(styles.lines))],
        [
          Skeleton.skeleton({ layoutStyle: styles.lineWide }, h),
          Skeleton.skeleton({ layoutStyle: styles.lineMid }, h),
        ],
      ),
    ],
  )

export const skeletonStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = skeletonFixtures[exampleIndex] ?? skeletonFixtures[0]
  switch (fixture.kind) {
    case 'demo':
      return demoRow(false, h)
    case 'rtl':
      return demoRow(true, h)
    case 'avatar':
      return h.div(
        [h.Class(className(styles.avatarRow))],
        [
          Skeleton.skeleton(
            { shape: 'circle', layoutStyle: styles.circleSm },
            h,
          ),
          h.div(
            [h.Class(className(styles.linesGrid))],
            [
              Skeleton.skeleton({ layoutStyle: styles.line150 }, h),
              Skeleton.skeleton({ layoutStyle: styles.line100 }, h),
            ],
          ),
        ],
      )
    case 'card':
      return Card.card(
        {
          layoutStyle: styles.card,
          children: [
            Card.cardHeader(
              {
                children: [
                  Skeleton.skeleton({ layoutStyle: styles.lineTwoThirds }, h),
                  Skeleton.skeleton({ layoutStyle: styles.lineHalf }, h),
                ],
              },
              h,
            ),
            Card.cardContent(
              {
                children: [Skeleton.skeleton({ layoutStyle: styles.media }, h)],
              },
              h,
            ),
          ],
        },
        h,
      )
    case 'text':
      return h.div(
        [h.Class(className(styles.textStack))],
        [
          Skeleton.skeleton({ layoutStyle: styles.lineFull }, h),
          Skeleton.skeleton({ layoutStyle: styles.lineFull }, h),
          Skeleton.skeleton({ layoutStyle: styles.lineThreeQuarters }, h),
        ],
      )
    case 'form':
      return h.div(
        [h.Class(className(styles.formStack))],
        [
          h.div(
            [h.Class(className(styles.fieldStack))],
            [
              Skeleton.skeleton({ layoutStyle: styles.labelA }, h),
              Skeleton.skeleton({ layoutStyle: styles.inputFull }, h),
            ],
          ),
          h.div(
            [h.Class(className(styles.fieldStack))],
            [
              Skeleton.skeleton({ layoutStyle: styles.labelB }, h),
              Skeleton.skeleton({ layoutStyle: styles.inputFull }, h),
            ],
          ),
          Skeleton.skeleton({ layoutStyle: styles.buttonBar }, h),
        ],
      )
    case 'table':
      return h.div(
        [h.Class(className(styles.tableStack))],
        [0, 1, 2, 3, 4].map(() =>
          h.div(
            [h.Class(className(styles.tableRow))],
            [
              Skeleton.skeleton({ layoutStyle: styles.cellGrow }, h),
              Skeleton.skeleton({ layoutStyle: styles.cellW24 }, h),
              Skeleton.skeleton({ layoutStyle: styles.cellW20 }, h),
            ],
          ),
        ),
      )
  }
}
