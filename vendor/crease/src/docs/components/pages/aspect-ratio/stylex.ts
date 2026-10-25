import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { aspectRatioFixtures } from '@/docs/components/pages/aspect-ratio/shared'
import * as AspectRatio from '@/stylex/aspect-ratio'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import { className } from '@/stylex/style'

const IMAGE_URL = 'https://avatar.vercel.sh/creaseui'

const styles = stylex.create({
  frame: {
    width: '100%',
  },
  frameMedia: {
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    backgroundColor: 'var(--muted)',
  },
  ratioBox: {
    borderRadius: 'var(--radius)',
    overflow: 'hidden',
    backgroundColor: 'var(--muted)',
  },
  w12: { maxWidth: '12rem' },
  w10: { maxWidth: '10rem' },
  w24: { maxWidth: '24rem' },
  image: {
    borderRadius: 'var(--radius)',
    filter: 'grayscale(100%)',
    objectFit: 'cover',
    height: '100%',
    width: '100%',
  },
  caption: {
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    textAlign: 'center',
    marginTop: '0.5rem',
  },
})

const ratioValue = (expr: string): number => {
  const parts = expr.split('/').map(part => Number.parseFloat(part))
  return (parts[0] ?? 1) / (parts[1] ?? 1)
}

const frameWidth = {
  w12: styles.w12,
  w10: styles.w10,
  w24: styles.w24,
} as const

export const aspectRatioStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = aspectRatioFixtures[exampleIndex] ?? aspectRatioFixtures[0]
  return h.figure(
    [
      h.Class(
        className(
          reset.text,
          styles.frame,
          fixture.widthClass.styled !== 'w24' && styles.frameMedia,
          frameWidth[fixture.widthClass.styled],
        ),
      ),
      ...(fixture.direction === 'rtl' ? [h.Dir('rtl')] : []),
    ],
    [
      AspectRatio.aspectRatio(
        {
          ratio: ratioValue(fixture.ratioExpr),
          layoutStyle: styles.ratioBox as ComponentLayoutStyle,
          children: [
            h.img([
              h.Src(IMAGE_URL),
              h.Alt('Photo'),
              h.Class(className(reset.media, styles.image)),
            ]),
          ],
        },
        h,
      ),
      ...(fixture.caption === undefined
        ? []
        : [
            h.figcaption(
              [h.Class(className(styles.caption))],
              [fixture.caption],
            ),
          ]),
    ],
  )
}
