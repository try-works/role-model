import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/demo/icon-preview'
import { badge } from '@/ui/badge'
import {
  card,
  cardAction,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/ui/card'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      children: [
        cardHeader(
          {
            children: [
              cardTitle({ children: ['Front Door'] }, h),
              cardDescription({ children: ['Smart Lock Pro'] }, h),
              cardAction(
                {
                  children: [
                    h.div(
                      [
                        h.Class(
                          'flex items-center gap-1.5 text-sm text-muted-foreground',
                        ),
                      ],
                      [
                        'Locked',
                        Icon.icon<Msg>('lock', { class: 'size-4' }, h),
                      ],
                    ),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardContent(
          {
            children: [
              h.div(
                [
                  h.Class(
                    'relative flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-muted bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,var(--border)_10px,var(--border)_11px)]',
                  ),
                ],
                [
                  badge(
                    {
                      variant: 'destructive',
                      class: 'absolute top-2 right-2',
                      children: ['Live'],
                    },
                    h,
                  ),
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

// Stateful? no. Submodels wired: none. PORT NOTEs: none.
