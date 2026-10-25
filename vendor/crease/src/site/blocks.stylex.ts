import * as stylex from '@stylexjs/stylex'
import { Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as CodeFile from '@/lib/code-file'
import * as Icon from '@/lib/icon'
import { blockPreviewPath, blocksStyleXTablePath } from '@/route'
import { BLOCKS } from '@/demo/blocks/catalog'
import { blockSourcePath } from '@/demo/blocks/block-source'
import type { Props } from '../demo/blocks/index-page'
import { reset } from '@/stylex/reset'
import { className } from '@/stylex/style'
import { tokens } from '../stylex/tokens.stylex'

export { BLOCKS } from '@/demo/blocks/catalog'
export { blockSourcePath, loadBlockSources } from '@/demo/blocks/block-source'
export type { Props, CodePanel } from '../demo/blocks/index-page'

const styles = stylex.create({
  page: {
    marginInline: 'auto',
    display: 'flex',
    width: '100%',
    maxWidth: '1400px',
    flexDirection: 'column',
    gap: '2rem',
    paddingBlock: '2rem',
    paddingInline: { default: '1rem', '@media (min-width: 768px)': '2rem' },
  },
  intro: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '1rem',
  },
  title: {
    maxWidth: '48rem',
    fontSize: { default: '1.875rem', '@media (min-width: 1280px)': '3rem' },
    lineHeight: 1.25,
    fontWeight: 600,
    letterSpacing: '-.025em',
    textWrap: 'balance',
  },
  description: {
    maxWidth: '48rem',
    fontSize: { default: '1rem', '@media (min-width: 640px)': '1.125rem' },
    lineHeight: { default: '1.5rem', '@media (min-width: 640px)': '1.75rem' },
    color: tokens.mutedForeground,
    textWrap: 'pretty',
  },
  /* TW 'flex flex-wrap items-center justify-between gap-4 border-b pb-3' —
     keeps the Table playground link right-aligned on the tabs row. */
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
    paddingBottom: '.75rem',
    width: '100%',
  },
  categories: { display: 'flex', flexWrap: 'wrap', gap: '.25rem' },
  category: {
    minHeight: '2.25rem',
    borderRadius: '999px',
    paddingInline: '1rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 500,
    cursor: 'pointer',
    color: { default: tokens.mutedForeground, ':hover': tokens.foreground },
  },
  selected: { backgroundColor: tokens.muted, color: tokens.foreground },
  link: {
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    textUnderlineOffset: '4px',
    textDecorationLine: { default: 'none', ':hover': 'underline' },
  },
  status: {
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    color: tokens.mutedForeground,
  },
  block: {
    display: 'flex',
    flexDirection: 'column',
    gap: '.75rem',
    scrollMarginTop: '5rem',
    minWidth: 0,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  copy: {
    display: 'flex',
    minWidth: 0,
    flexDirection: 'column',
    gap: '.25rem',
  },
  heading: { fontSize: '.875rem', lineHeight: '1.25rem', fontWeight: 600 },
  actions: {
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    gap: '.5rem',
  },
  button: {
    display: 'inline-flex',
    minHeight: '2.25rem',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '.375rem',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    paddingInline: '.75rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 500,
    cursor: 'pointer',
    backgroundColor: { default: tokens.background, ':hover': tokens.accent },
  },
  codeOpen: {
    borderColor: tokens.foreground,
    backgroundColor: tokens.foreground,
    color: tokens.background,
  },
  frame: {
    display: 'block',
    height: '800px',
    width: '100%',
    borderRadius: '.75rem',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.background,
  },
  panel: {
    display: 'flex',
    height: '50rem',
    width: '100%',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: '.75rem',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: tokens.muted,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '.5rem',
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
    backgroundColor: tokens.background,
    padding: '.375rem .75rem',
  },
  path: {
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '.75rem',
    lineHeight: '1rem',
    color: tokens.mutedForeground,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  panelBody: { display: 'flex', minHeight: 0, flex: 1 },
  files: {
    display: 'flex',
    flexDirection: 'column',
    width: { default: '8rem', '@media (min-width: 768px)': '13rem' },
    flexShrink: 0,
    gap: '.125rem',
    overflowY: 'auto',
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    borderRightColor: tokens.border,
    backgroundColor: tokens.background,
    padding: '.5rem',
  },
  file: {
    textAlign: 'left',
    padding: '.25rem .5rem',
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '.75rem',
    lineHeight: '1rem',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    borderRadius: '.375rem',
    cursor: 'pointer',
    color: { default: tokens.mutedForeground, ':hover': tokens.foreground },
  },
  code: { minWidth: 0, flex: 1, overflow: 'auto' },
  loading: {
    display: 'flex',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    color: tokens.mutedForeground,
    fontSize: '.875rem',
    lineHeight: '1.25rem',
  },
  icon: { width: '1rem', height: '1rem' },
})

const categories = [
  ['all', 'All blocks'],
  ['dashboard', 'Dashboards'],
  ['sidebar', 'Sidebars'],
  ['login', 'Authentication'],
] as const
const basename = (path: string) => path.slice(path.lastIndexOf('/') + 1)

export const view = <Msg>(props: Props<Msg>, h: HtmlBuilder<Msg>): Html =>
  h.main(
    [
      h.DataAttribute('page', 'blocks'),
      h.DataAttribute('renderer', 'stylex'),
      h.Class(className(styles.page)),
    ],
    [
      h.div(
        [h.Class(className(styles.intro))],
        [
          h.h1(
            [h.Class(className(reset.text, styles.title))],
            ['Building Blocks for Foldkit'],
          ),
          h.p(
            [h.Class(className(reset.text, styles.description))],
            [
              'Complete sidebars, dashboards and login layouts. Explore live StyleX previews you can open full screen.',
            ],
          ),
          h.div(
            [h.Class(className(styles.controls))],
            [
              h.div(
                [
                  h.Role('group'),
                  h.AriaLabel('Block categories'),
                  h.Class(className(styles.categories)),
                ],
                categories.map(([category, label]) =>
                  h.button(
                    [
                      h.Type('button'),
                      h.OnClick(props.onCategory(category)),
                      h.AriaPressed(
                        props.category === category ? 'true' : 'false',
                      ),
                      h.Class(
                        className(
                          reset.button,
                          styles.category,
                          props.category === category && styles.selected,
                        ),
                      ),
                    ],
                    [label],
                  ),
                ),
              ),
              h.a(
                [
                  h.Href(blocksStyleXTablePath()),
                  h.Class(className(reset.link, styles.link)),
                ],
                ['Table playground ↗'],
              ),
            ],
          ),
        ],
      ),
      h.p(
        [h.Role('status'), h.Class(className(reset.text, styles.status))],
        [
          `${BLOCKS.filter(b => props.category === 'all' || b.category === props.category).length} blocks · StyleX`,
        ],
      ),
      ...BLOCKS.filter(
        b => props.category === 'all' || b.category === props.category,
      ).map(block => {
        const panel = props.codeBlocks[block.name]
        const selectedPath = panel?.codeFile ?? ''
        const source = panel?.files[selectedPath] ?? ''
        const isCopied = source !== '' && props.copiedCode === source
        return h.section(
          [
            h.Id(block.name),
            h.DataAttribute('block', block.name),
            h.Class(className(styles.block)),
          ],
          [
            h.div(
              [h.Class(className(styles.row))],
              [
                h.div(
                  [h.Class(className(styles.copy))],
                  [
                    h.h2(
                      [h.Class(className(reset.text, styles.heading))],
                      [block.name],
                    ),
                    h.p(
                      [h.Class(className(reset.text, styles.status))],
                      [block.description],
                    ),
                  ],
                ),
                h.div(
                  [h.Class(className(styles.actions))],
                  [
                    h.button(
                      [
                        h.Type('button'),
                        h.OnClick(props.onToggleCode(block.name)),
                        h.AriaPressed(panel !== undefined ? 'true' : 'false'),
                        h.AriaLabel(
                          `${panel === undefined ? 'View' : 'Hide'} code for ${block.name}`,
                        ),
                        h.DataAttribute('code-toggle', block.name),
                        h.Class(
                          className(
                            reset.button,
                            styles.button,
                            panel !== undefined && styles.codeOpen,
                          ),
                        ),
                      ],
                      ['Code'],
                    ),
                    h.a(
                      [
                        h.Href(blockPreviewPath('stylex', block.name)),
                        h.Attribute('target', '_blank'),
                        h.Rel('noopener noreferrer'),
                        h.AriaLabel(`Open ${block.name} in StyleX`),
                        h.Class(className(reset.link, styles.button)),
                      ],
                      ['Open ↗'],
                    ),
                  ],
                ),
              ],
            ),
            panel === undefined
              ? h.keyed('iframe')(
                  `stylex-${block.name}-${props.isDark}`,
                  [
                    h.Src(blockPreviewPath('stylex', block.name)),
                    h.Title(`${block.name} — StyleX preview`),
                    h.Attribute('loading', 'lazy'),
                    h.Class(className(styles.frame)),
                  ],
                  [],
                )
              : h.div(
                  [
                    h.DataAttribute('block-code', block.name),
                    h.Class(className(styles.panel)),
                  ],
                  [
                    h.div(
                      [h.Class(className(styles.panelHeader))],
                      [
                        h.span(
                          [h.Class(className(styles.path))],
                          [
                            (
                              selectedPath ||
                              blockSourcePath('stylex', block.name)
                            ).slice(1),
                          ],
                        ),
                        ...(source === ''
                          ? []
                          : [
                              h.button(
                                [
                                  h.Type('button'),
                                  h.OnClick(props.onCopyCode(source)),
                                  h.AriaLabel(
                                    isCopied
                                      ? `${block.name} source copied`
                                      : `Copy ${block.name} source`,
                                  ),
                                  h.Class(
                                    className(reset.button, styles.button),
                                  ),
                                ],
                                [
                                  Icon.icon(
                                    isCopied ? 'check' : 'copy',
                                    { class: className(styles.icon) },
                                    h,
                                  ),
                                ],
                              ),
                            ]),
                      ],
                    ),
                    selectedPath === ''
                      ? h.div(
                          [
                            h.Role('status'),
                            h.Class(className(styles.loading)),
                          ],
                          [`Loading ${block.name} source…`],
                        )
                      : h.div(
                          [h.Class(className(styles.panelBody))],
                          [
                            h.div(
                              [
                                h.AriaLabel(`Source files for ${block.name}`),
                                h.Class(className(styles.files)),
                              ],
                              Object.keys(panel.files).map(path =>
                                h.button(
                                  [
                                    h.Type('button'),
                                    h.OnClick(
                                      props.onSelectCodeFile(block.name, path),
                                    ),
                                    h.AriaPressed(
                                      path === selectedPath ? 'true' : 'false',
                                    ),
                                    h.DataAttribute('code-file', path),
                                    h.Title(path.replace('/src/', '')),
                                    h.Class(
                                      className(
                                        reset.button,
                                        styles.file,
                                        path === selectedPath &&
                                          styles.selected,
                                      ),
                                    ),
                                  ],
                                  [basename(path)],
                                ),
                              ),
                            ),
                            h.keyed('div')(
                              `codefile-${selectedPath}-${props.isDark}`,
                              [
                                h.DataAttribute('code-view', block.name),
                                h.Class(className(styles.code)),
                                h.OnMount(
                                  Mount.mapMessage(
                                    CodeFile.MountCodeFile({
                                      fileName: basename(selectedPath),
                                      contents: source,
                                      dark: props.isDark,
                                      lineNumbers: true,
                                    }),
                                    props.onCodeFileMessage,
                                  ),
                                ),
                              ],
                              [],
                            ),
                          ],
                        ),
                  ],
                ),
          ],
        )
      }),
    ],
  )
