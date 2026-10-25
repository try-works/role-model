import type { Html, HtmlBuilder } from 'foldkit/html'

import { card, cardContent, cardHeader } from '@/ui/card'
import { skeleton } from '@/ui/skeleton'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              skeleton({ class: 'h-5 w-32' }, h),
              skeleton({ class: 'h-4 w-48' }, h),
            ],
          },
          h,
        ),
        cardContent(
          {
            class: 'flex flex-col gap-4',
            children: [
              skeleton({ class: 'h-32 w-full rounded-lg' }, h),
              h.div(
                [h.Class('flex flex-col gap-2')],
                [
                  skeleton({ class: 'h-4 w-full' }, h),
                  skeleton({ class: 'h-4 w-3/4' }, h),
                  skeleton({ class: 'h-4 w-1/2' }, h),
                ],
              ),
              h.div(
                [h.Class('flex gap-2')],
                [
                  skeleton({ class: 'h-9 flex-1 rounded-md' }, h),
                  skeleton({ class: 'h-9 flex-1 rounded-md' }, h),
                ],
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )
}

// Card summary: stateful? no. Submodels wired: none. PORT NOTEs: none.
