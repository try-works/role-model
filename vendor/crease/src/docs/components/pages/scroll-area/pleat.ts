import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  scrollAreaFixtures,
  scrollAreaItems,
  scrollAreaTags,
} from '@/docs/components/pages/scroll-area/shared'
import * as ScrollArea from '@/pleat/scroll-area'
import * as Separator from '@/pleat/separator'
import { className } from '@/pleat/style'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  tagsFrame: Style.make({
    borderColor: 'var(--border)',
    borderRadius: '0.5rem',
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    height: '18rem',
    width: '12rem',
  }),
  tagsContent: Style.make({ padding: '1rem' }),
  tagsHeading: Style.make({
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: 1,
    marginBottom: '1rem',
  }),
  tag: Style.make({ fontSize: '0.875rem', lineHeight: '1.25rem' }),
  separator: layoutStyle({ marginBlock: '0.5rem' }),
  horizontalFrame: Style.make({
    padding: '1rem',
    borderColor: 'var(--border)',
    borderRadius: '0.5rem',
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    width: '20rem',
  }),
  horizontalContent: Style.make({
    gap: '0.75rem',
    display: 'flex',
    width: 'max-content',
  }),
  pill: Style.make({
    borderRadius: '0.5rem',
    paddingBlock: '0.5rem',
    paddingInline: '0.75rem',
    backgroundColor: 'var(--muted)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}

export const scrollAreaPleatPreview: ExamplePreviewProvider = <Msg>(
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
