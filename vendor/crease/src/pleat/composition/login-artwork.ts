import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { className } from '../style'
import { foundationTokens } from '../foundations-tokens'
const styles = {
  panel: Style.make({
    alignItems: 'center',
    backgroundColor: foundationTokens.muted,
    display: 'none',
    justifyContent: 'center',
    minHeight: '28rem',
  }).pipe(Style.when(When.minWidth('900px'), { display: 'flex' })),
  image: Style.make({
    objectFit: 'contain',
    height: '15rem',
    width: '12.5rem',
  }),
}
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
