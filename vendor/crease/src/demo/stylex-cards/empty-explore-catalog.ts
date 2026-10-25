import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/demo/icon-preview'
import { button } from '@/stylex/button'
import { card, cardContent } from '@/stylex/card'
import {
  empty,
  emptyContent,
  emptyDescription,
  emptyHeader,
  emptyMedia,
  emptyTitle,
} from '@/stylex/empty'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  card(
    {
      children: [
        cardContent(
          {
            children: [
              empty(
                {
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
