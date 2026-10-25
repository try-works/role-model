import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { aspectRatioFixtures } from '@/docs/components/pages/aspect-ratio/shared'
import * as AspectRatio from '@/ui/aspect-ratio'

const IMAGE_URL = 'https://avatar.vercel.sh/creaseui'

const InteractedWithAspectRatioPreview = defineMessageUnion({
  InteractedWithAspectRatioPreview: {},
})
type InteractedWithAspectRatioPreview =
  typeof InteractedWithAspectRatioPreview.Type
const AspectRatioPreviewModel = S.Struct({
  _docsPage: S.Literal('aspect-ratio'),
})
type AspectRatioPreviewModel = typeof AspectRatioPreviewModel.Type

const ratioValue = (expr: string): number => {
  const parts = expr.split('/').map(part => Number.parseFloat(part))
  return (parts[0] ?? 1) / (parts[1] ?? 1)
}

export const aspectRatioTailwindPreviewProgram = definePreviewProgram<
  AspectRatioPreviewModel,
  InteractedWithAspectRatioPreview
>({
  Model: AspectRatioPreviewModel,
  Message: InteractedWithAspectRatioPreview,
  init: () => ({ _docsPage: 'aspect-ratio' }),
  update: model => ({ model: model }),
  view: (index, _model, h) => {
    const fixture = aspectRatioFixtures[index] ?? aspectRatioFixtures[0]
    return h.figure(
      [
        h.Class(fixture.widthClass.tailwind),
        ...(fixture.direction === 'rtl' ? [h.Dir('rtl')] : []),
      ],
      [
        AspectRatio.aspectRatio(
          {
            ratio: ratioValue(fixture.ratioExpr),
            class: 'rounded-lg bg-muted overflow-hidden',
            children: [
              h.img([
                h.Src(IMAGE_URL),
                h.Alt('Photo'),
                h.Class(
                  'rounded-lg object-cover w-full h-full grayscale dark:brightness-20',
                ),
              ]),
            ],
          },
          h,
        ),
        ...(fixture.caption === undefined
          ? []
          : [
              h.figcaption(
                [h.Class('mt-2 text-center text-sm text-muted-foreground')],
                [fixture.caption],
              ),
            ]),
      ],
    )
  },
})
