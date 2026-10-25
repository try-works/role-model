import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  scrollAreaFixtures,
  scrollAreaItems,
  scrollAreaTags,
} from '@/docs/components/pages/scroll-area/shared'
import * as ScrollArea from '@/stylex/scroll-area'
import * as Separator from '@/stylex/separator'
import { className } from '@/stylex/style'

const styles = stylex.create({
  tagsFrame: {
    borderColor: 'var(--border)',
    borderRadius: '0.5rem',
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    height: '18rem',
    width: '12rem',
  },
  tagsContent: { padding: '1rem' },
  tagsHeading: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
    marginBottom: '1rem',
  },
  tag: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  separator: { marginBlock: '0.5rem' },
  horizontalFrame: {
    padding: '1rem',
    borderColor: 'var(--border)',
    borderRadius: '0.5rem',
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    width: '20rem',
  },
  horizontalContent: {
    gap: '0.75rem',
    display: 'flex',
    width: 'max-content',
  },
  pill: {
    borderRadius: '0.5rem',
    paddingBlock: '0.5rem',
    paddingInline: '0.75rem',
    backgroundColor: 'var(--muted)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
})

export const scrollAreaStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  _model: unknown,
  _onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const fixture = scrollAreaFixtures[index] ?? scrollAreaFixtures[0]
  return fixture.kind === 'tags'
    ? h.div(
        [h.Class(className(styles.tagsFrame))],
        [
          ScrollArea.scrollArea(
            {
              orientation: 'vertical',
              ...(fixture.rtl ? { direction: 'rtl' as const } : {}),
              ariaLabel: 'Version tags',
              children: [
                h.div(
                  [h.Class(className(styles.tagsContent))],
                  [
                    h.h4(
                      [h.Class(className(reset.text, styles.tagsHeading))],
                      [fixture.heading],
                    ),
                    ...scrollAreaTags.map(tag =>
                      h.div(
                        [],
                        [
                          h.div([h.Class(className(styles.tag))], [tag]),
                          Separator.separator(
                            { layoutStyle: styles.separator },
                            h,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            },
            h,
          ),
        ],
      )
    : h.div(
        [h.Class(className(styles.horizontalFrame))],
        [
          ScrollArea.scrollArea(
            {
              orientation: 'horizontal',
              ariaLabel: 'Component versions',
              children: [
                h.div(
                  [h.Class(className(styles.horizontalContent))],
                  scrollAreaItems.map(item =>
                    h.span([h.Class(className(styles.pill))], [item]),
                  ),
                ),
              ],
            },
            h,
          ),
        ],
      )
}
