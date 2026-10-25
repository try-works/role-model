import { Schema as S } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import { taggedStruct } from 'foldkit/schema'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { skeletonFixtures } from '@/docs/components/pages/skeleton/shared'
import * as Card from '@/ui/card'
import * as Skeleton from '@/ui/skeleton'

const NoOp = taggedStruct('NoOp<Skeleton>')
const PreviewMessage = S.Union([NoOp])
type PreviewMessage = typeof PreviewMessage.Type
const PreviewModel = S.Struct({ _docsPage: S.Literal('skeleton') })
type PreviewModel = typeof PreviewModel.Type

const demoRow = (rtl: boolean, h: HtmlBuilder<PreviewMessage>) =>
  h.div(
    [h.Class('flex items-center gap-4'), ...(rtl ? [h.Dir('rtl')] : [])],
    [
      Skeleton.skeleton({ shape: 'circle', class: 'h-12 w-12' }, h),
      h.div(
        [h.Class('space-y-2')],
        [
          Skeleton.skeleton({ class: 'h-4 w-62.5' }, h),
          Skeleton.skeleton({ class: 'h-4 w-50' }, h),
        ],
      ),
    ],
  )

export const skeletonTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: () => ({ _docsPage: 'skeleton' }),
  update: model => ({ model }),
  view: (index, _model, h) => {
    const fixture = skeletonFixtures[index] ?? skeletonFixtures[0]
    switch (fixture.kind) {
      case 'demo':
        return demoRow(false, h)
      case 'rtl':
        return demoRow(true, h)
      case 'avatar':
        return h.div(
          [h.Class('flex w-fit items-center gap-4')],
          [
            Skeleton.skeleton(
              { shape: 'circle', class: 'size-10 shrink-0' },
              h,
            ),
            h.div(
              [h.Class('grid gap-2')],
              [
                Skeleton.skeleton({ class: 'h-4 w-37.5' }, h),
                Skeleton.skeleton({ class: 'h-4 w-25' }, h),
              ],
            ),
          ],
        )
      case 'card':
        return Card.card(
          {
            class: 'w-full max-w-xs',
            children: [
              Card.cardHeader(
                {
                  children: [
                    Skeleton.skeleton({ class: 'h-4 w-2/3' }, h),
                    Skeleton.skeleton({ class: 'h-4 w-1/2' }, h),
                  ],
                },
                h,
              ),
              Card.cardContent(
                {
                  children: [
                    Skeleton.skeleton({ class: 'aspect-video w-full' }, h),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        )
      case 'text':
        return h.div(
          [h.Class('flex w-full max-w-xs flex-col gap-2')],
          [
            Skeleton.skeleton({ class: 'h-4 w-full' }, h),
            Skeleton.skeleton({ class: 'h-4 w-full' }, h),
            Skeleton.skeleton({ class: 'h-4 w-3/4' }, h),
          ],
        )
      case 'form':
        return h.div(
          [h.Class('flex w-full max-w-xs flex-col gap-7')],
          [
            h.div(
              [h.Class('flex flex-col gap-3')],
              [
                Skeleton.skeleton({ class: 'h-4 w-20' }, h),
                Skeleton.skeleton({ class: 'h-8 w-full' }, h),
              ],
            ),
            h.div(
              [h.Class('flex flex-col gap-3')],
              [
                Skeleton.skeleton({ class: 'h-4 w-24' }, h),
                Skeleton.skeleton({ class: 'h-8 w-full' }, h),
              ],
            ),
            Skeleton.skeleton({ class: 'h-8 w-24' }, h),
          ],
        )
      case 'table':
        return h.div(
          [h.Class('flex w-full max-w-sm flex-col gap-2')],
          [0, 1, 2, 3, 4].map(() =>
            h.div(
              [h.Class('flex gap-4')],
              [
                Skeleton.skeleton({ class: 'h-4 flex-1' }, h),
                Skeleton.skeleton({ class: 'h-4 w-24' }, h),
                Skeleton.skeleton({ class: 'h-4 w-20' }, h),
              ],
            ),
          ),
        )
    }
  },
})
