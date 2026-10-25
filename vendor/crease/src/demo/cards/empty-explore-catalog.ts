import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/demo/icon-preview'
import { button } from '@/ui/button'
import { card, cardContent } from '@/ui/card'
import {
  empty,
  emptyContent,
  emptyDescription,
  emptyHeader,
  emptyMedia,
  emptyTitle,
} from '@/ui/empty'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  card(
    {
      children: [
        cardContent(
          {
            children: [
              empty(
                {
                  class: 'p-4',
                  children: [
                    emptyMedia(
                      {
                        variant: 'icon',
                        children: [Icon.icon('audio-lines', {}, h)],
                      },
                      h,
                    ),
                    emptyHeader(
                      {
                        children: [
                          emptyTitle({ children: ['Explore Catalog'] }, h),
                          emptyDescription(
                            {
                              children: [
                                'Check your ISRC codes, metadata, and visual assets before going live.',
                              ],
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                    emptyContent(
                      {
                        children: [button({ children: ['View Catalog'] }, h)],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    },
    h,
  )

// Card summary: stateful? no. Submodels wired: none. PORT NOTEs: none.
