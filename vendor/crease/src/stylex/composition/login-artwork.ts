import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { className } from '../style'
import { foundationTokens } from '../foundations-tokens.stylex'
const styles = stylex.create({
  panel: {
    alignItems: 'center',
    backgroundColor: foundationTokens.muted,
    display: { default: 'none', '@media (min-width: 900px)': 'flex' },
    justifyContent: 'center',
    minHeight: '28rem',
  },
  image: { objectFit: 'contain', height: '15rem', width: '12.5rem' },
})
export const loginArtwork = <M>(h: HtmlBuilder<M>): Html =>
  h.div(
    [h.AriaHidden(true), h.Class(className(styles.panel))],
    [
      h.img([
        h.Src('/logo-mark.svg'),
        h.Alt(''),
        h.Width('200'),
        h.Height('240'),
        h.Class(className(reset.media, styles.image)),
      ]),
    ],
  )
