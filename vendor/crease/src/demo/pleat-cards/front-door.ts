import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Icon from '@/demo/icon-preview'
import { badge } from '@/pleat/badge'
import {
  card,
  cardAction,
  cardContent,
  cardDescription,
  cardHeader,
  cardTitle,
} from '@/pleat/card'
import { className } from '@/pleat/style'
import { foundationTokens } from '../../pleat/foundations-tokens'
import { tokens } from '../../pleat/tokens'
import { cardDemoTokens } from './foundations-card-tokens'

const styles = {
  status: Style.make({
    gap: '0.375rem',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  lockIcon: Style.make({ height: '1rem', width: '1rem' }),
  camera: Style.make({
    borderRadius: tokens.controlRadius,
    overflow: 'hidden',
    alignItems: 'center',
    aspectRatio: '16 / 9',
    backgroundColor: foundationTokens.muted,
    backgroundImage: cardDemoTokens.cameraPattern,
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
  }),
  liveBadge: Style.make({
    position: 'absolute',
    right: '0.5rem',
    top: '0.5rem',
  }),
}

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
                      [h.Class(className(styles.status))],
                      [
                        'Locked',
                        Icon.icon<Msg>(
                          'lock',
                          { class: className(styles.lockIcon) },
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
        ),
        cardContent(
          {
            children: [
              h.div(
                [h.Class(className(styles.camera))],
                [
                  h.div(
                    [h.Class(className(styles.liveBadge))],
                    [badge({ variant: 'destructive', children: ['Live'] }, h)],
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
