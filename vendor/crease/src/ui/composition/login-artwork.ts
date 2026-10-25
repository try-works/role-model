import type { Html, HtmlBuilder } from 'foldkit/html'
export const loginArtwork = <M>(h: HtmlBuilder<M>): Html =>
  h.div(
    [
      h.AriaHidden(true),
      h.Class(
        'hidden min-h-112 items-center justify-center bg-muted min-[900px]:flex',
      ),
    ],
    [
      h.img([
        h.Src('/logo-mark.svg'),
        h.Alt(''),
        h.Width('200'),
        h.Height('240'),
        h.Class('h-60 w-50 object-contain'),
      ]),
    ],
  )
