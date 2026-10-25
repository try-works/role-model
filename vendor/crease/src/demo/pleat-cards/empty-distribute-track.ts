import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/demo/icon-preview'
import { button } from '@/pleat/button'
import { card, cardContent } from '@/pleat/card'
import {
  empty,
  emptyContent,
  emptyDescription,
  emptyHeader,
  emptyMedia,
  emptyTitle,
} from '@/pleat/empty'

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
                        children: [Icon.icon('plus', {}, h)],
                      },
                      h,
                    ),
                    emptyHeader(
                      {
                        children: [
                          emptyTitle({ children: ['Distribute Track'] }, h),
                          emptyDescription(
                            {
                              children: [
                                'Upload your first master to start reaching listeners on Spotify, Apple Music, and more.',
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
                        children: [button({ children: ['Create Release'] }, h)],
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
