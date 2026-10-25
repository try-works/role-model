import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '@/ui/button'
import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/ui/card'

const qrCells = [
  0, 1, 2, 5, 6, 7, 8, 10, 13, 15, 16, 18, 19, 21, 23, 24, 29, 31, 32, 33, 34,
  37, 38, 39, 41, 43, 44, 46, 48, 50, 53, 55, 56, 58, 61, 62, 63,
]

export const view = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return card(
    {
      children: [
        cardContent(
          {
            class: 'flex justify-center pt-6',
            children: [
              h.div(
                [h.Class('rounded-xl border bg-white p-4')],
                [
                  // PORT NOTE: react-qr-code has no foldkit equivalent. This
                  // neutral grid preserves the source QR footprint.
                  h.div(
                    [
                      h.Role('img'),
                      h.AriaLabel('QR code placeholder'),
                      h.Class('grid size-40 grid-cols-8 gap-1 bg-white p-2'),
                    ],
                    Array.from({ length: 64 }, (_, index) =>
                      h.div(
                        [
                          h.Class(
                            qrCells.includes(index)
                              ? 'bg-foreground'
                              : 'bg-muted',
                          ),
                        ],
                        [],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          },
          h,
        ),
        cardHeader(
          {
            class: 'text-center',
            children: [
              cardTitle(
                {
                  children: ['Scan to connect your mobile device'],
                },
                h,
              ),
              cardDescription(
                {
                  children: [
                    'Open the Ledger mobile app and scan this code to link your device.',
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
        cardFooter(
          {
            class: 'py-2.5',
            children: [
              button(
                {
                  variant: 'secondary',
                  class: 'w-full',
                  children: ['Got it'],
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
}

// Stateful? no. Submodels wired: none. PORT NOTEs: QR library replaced by a neutral grid.
