import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'
import { Stream } from 'effect'
import { Mount, Subscription } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as CodeFile from '@/lib/code-file'
import * as Icon from '@/lib/icon'
import {
  componentDocsPath,
  gettingStartedPath,
  themingPath,
  lintRulePath,
  lintRulesPath,
} from '@/route'
import { LINT_RULE_GROUPS } from '@/docs/lint/rules'
import {
  COMPONENT_GROUPS,
  COMPONENT_NAV_ORDER,
  toSlug,
  apiPurpose,
} from '@/docs/component-metadata'
import { heroFrame } from '@/docs/hero-frame'
import type {
  ComponentPageConfig,
  ExampleConfig,
  HeroExampleConfig,
} from '../docs/component-page'
import { reset } from '@/stylex/reset'
import { className } from '@/stylex/style'
import { tokens } from '../stylex/tokens.stylex'
import { codeToggleScope, headingScope } from './docs.markers.stylex'

export {
  COMPONENTS,
  canonicalComponentSlug,
  componentTitle,
  toSlug,
} from '@/docs/component-metadata'
export type {
  ComponentPageConfig,
  ExampleConfig,
  HeroExampleConfig,
} from '../docs/component-page'

const styles = stylex.create({
  navGroup: { marginBottom: '1.5rem' },
  layout: {
    marginInline: 'auto',
    display: 'grid',
    width: '100%',
    maxWidth: '1500px',
    gridTemplateColumns: {
      default: 'minmax(0,1fr)',
      '@media (min-width: 1024px)': '220px minmax(0,1fr) 190px',
    },
  },
  sidebar: {
    display: { default: 'none', '@media (min-width: 1024px)': 'block' },
    position: 'sticky',
    top: '3.5rem',
    height: 'calc(100vh - 3.5rem)',
    overflowY: 'auto',
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    borderRightColor: tokens.border,
    padding: '2.5rem 1.25rem',
  },
  toc: {
    display: { default: 'none', '@media (min-width: 1024px)': 'block' },
    position: 'sticky',
    top: '3.5rem',
    height: 'calc(100vh - 3.5rem)',
    overflowY: 'auto',
    padding: '2.5rem 1.25rem',
  },

  summary: {
    cursor: 'pointer',
    padding: '.75rem 1rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
  },
  mobile: {
    display: { default: 'block', '@media (min-width: 1024px)': 'none' },
    margin: '1.25rem 1.25rem 0',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '.5rem',
    backgroundColor: tokens.background,
  },
  mobileNavOuter: {
    maxHeight: '55vh',
    overflowY: 'auto',
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    padding: '.5rem',
  },
  mobileNav: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'repeat(2,minmax(0,1fr))',
      '@media (min-width: 640px)': 'repeat(3,minmax(0,1fr))',
    },
    gap: '.125rem',
  },
  main: {
    minWidth: 0,
    paddingBlock: { default: '2.5rem', '@media (min-width: 1024px)': '3.5rem' },
    paddingInline: {
      default: '1.25rem',
      '@media (min-width: 640px)': '2rem',
      '@media (min-width: 1024px)': '3rem',
    },
  },
  content: {
    marginInline: 'auto',
    maxWidth: '56rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '3.5rem',
  },
  stack: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    scrollMarginTop: '6rem',
    minWidth: 0,
  },
  stackTight: {
    display: 'flex',
    flexDirection: 'column',
    gap: '.75rem',
    scrollMarginTop: '6rem',
    minWidth: 0,
  },
  apiSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '.75rem',
    scrollMarginTop: '6rem',
    minWidth: 0,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    paddingTop: '2.5rem',
  },
  tight: { display: 'flex', flexDirection: 'column', gap: '.375rem' },
  row: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '.5rem',
  },
  title: {
    fontSize: '2.25rem',
    lineHeight: '2.5rem',
    fontWeight: 600,
    letterSpacing: '-.035em',
    textWrap: 'balance',
  },
  heading: {
    fontSize: '1.25rem',
    lineHeight: '1.75rem',
    fontWeight: 600,
    letterSpacing: '-.025em',
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
  },
  headingAnchor: {
    color: tokens.mutedForeground,
    opacity: {
      default: 0,
      [stylex.when.ancestor(':hover', headingScope)]: 1,
      ':focus-visible': 1,
    },
    transitionProperty: 'opacity',
    transitionDuration: '.15s',
  },
  label: {
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
    marginBottom: '.75rem',
  },
  /* TW 'mb-3 px-2' on the sidebar 'Components' heading only; the TOC
     'On this page' heading is mb-3 with no horizontal padding. */
  labelIndent: { paddingInline: '.5rem' },
  description: {
    maxWidth: '70ch',
    color: tokens.mutedForeground,
    fontSize: '.875rem',
    lineHeight: '1.5rem',
  },
  lead: { fontSize: '1rem', lineHeight: '1.75rem' },
  link: {
    color: { default: tokens.mutedForeground, ':hover': tokens.foreground },
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    textUnderlineOffset: '4px',
  },
  underline: { textDecorationLine: 'underline' },
  navLink: {
    display: 'block',
    padding: '.375rem .5rem',
    borderRadius: '.375rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    color: { default: tokens.mutedForeground, ':hover': tokens.foreground },
    backgroundColor: {
      default: tokens.transparent,
      ':hover': 'color-mix(in oklab, var(--muted) 60%, transparent)',
    },
    transitionProperty: 'color, background-color',
    transitionDuration: '.15s',
  },
  navActive: {
    color: tokens.foreground,
    backgroundColor: tokens.muted,
    fontWeight: 500,
  },
  navList: { display: 'grid', gap: '.125rem' },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '999px',
    padding: '.25rem .625rem',
    backgroundColor: 'color-mix(in oklab, var(--muted) 40%, transparent)',
    color: tokens.mutedForeground,
    fontSize: '.75rem',
    lineHeight: '1rem',
    fontWeight: 500,
  },
  metaText: {
    fontSize: '.75rem',
    lineHeight: '1rem',
    color: tokens.mutedForeground,
  },
  breadcrumb: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '.5rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    color: tokens.mutedForeground,
  },
  breadcrumbLink: {
    color: { default: tokens.mutedForeground, ':hover': tokens.foreground },
  },
  sep: { color: tokens.border },
  linkSmall: {
    fontSize: '.75rem',
    lineHeight: '1rem',
    fontWeight: 500,
    color: tokens.foreground,
    textDecorationLine: 'underline',
    textUnderlineOffset: '4px',
  },
  surfaceCopy: { color: tokens.secondaryForeground },
  architecture: {
    borderBlockStyle: 'solid',
    borderBlockWidth: 1,
    borderBlockColor: tokens.border,
    paddingBlock: '1.25rem',
    paddingInline: {
      default: '1.25rem',
      '@media (min-width: 640px)': '1.5rem',
    },
    backgroundColor: 'color-mix(in oklab, var(--muted) 25%, transparent)',
    scrollMarginTop: '6rem',
  },
  archRow: {
    display: 'flex',
    flexDirection: { default: 'column', '@media (min-width: 640px)': 'row' },
    gap: '.5rem',
    alignItems: {
      default: 'stretch',
      '@media (min-width: 640px)': 'flex-start',
    },
    justifyContent: {
      default: 'normal',
      '@media (min-width: 640px)': 'space-between',
    },
  },
  archText: { display: 'flex', flexDirection: 'column', gap: '.25rem' },
  archHeading: {
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
  },
  kindTag: {
    flexShrink: 0,
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '.75rem',
    lineHeight: '1rem',
    color: tokens.mutedForeground,
  },
  hintRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '.5rem',
    fontSize: '.75rem',
    lineHeight: '1rem',
    color: tokens.mutedForeground,
  },
  timePickerFrameOverflow: {
    overflow: {
      default: 'hidden',
      ':has([data-slot="popover-content"])': 'visible',
      ':has([data-slot="time-input"] [data-slot="select-content"])': 'visible',
      ':has([data-slot="hover-card-content"])': 'visible',
      ':has([data-slot="multi-selector"] [data-slot="select-content"])':
        'visible',
    },
  },
  timePickerPreviewOverflow: {
    overflowX: {
      default: 'auto',
      ':has([data-slot="popover-content"])': 'visible',
      ':has([data-slot="time-input"] [data-slot="select-content"])': 'visible',
      ':has([data-slot="hover-card-content"])': 'visible',
      ':has([data-slot="multi-selector"] [data-slot="select-content"])':
        'visible',
    },
  },
  frame: {
    overflow: {
      default: 'hidden',
      ':has([data-slot="popover-content"])': 'visible',
    },
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '.5rem',
    backgroundColor: tokens.background,
  },
  preview: {
    display: 'flex',
    minHeight: '16rem',
    alignItems: 'center',
    justifyContent: 'center',
    padding: { default: '1.5rem', '@media (min-width: 640px)': '2.5rem' },
    overflowX: {
      default: 'auto',
      ':has([data-slot="popover-content"])': 'visible',
    },
  },
  stretch: { justifyContent: 'stretch' },
  fullBleedPreview: { padding: 0 },
  code: {
    position: 'relative',
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '.5rem',
    backgroundColor: 'color-mix(in oklab, var(--muted) 35%, transparent)',
  },
  codeContent: {
    minWidth: 0,
    maxWidth: '100%',
    overflowX: 'auto',
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '13px',
    lineHeight: '1.5rem',
  },
  codeArea: {
    position: 'relative',
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    backgroundColor: 'color-mix(in oklab, var(--muted) 35%, transparent)',
  },
  codeToggle: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: 0,
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
    borderWidth: 0,
  },
  codeClip: {
    position: 'relative',
    maxHeight: {
      default: '7.25rem',
      [stylex.when.siblingAfter(':checked', codeToggleScope)]: 'none',
    },
    overflow: 'hidden',
    paddingBottom: '2.75rem',
    maskImage: {
      default: 'linear-gradient(to bottom, black 35%, transparent 100%)',
      [stylex.when.siblingAfter(':checked', codeToggleScope)]: 'none',
    },
  },
  codeClipInner: {
    minWidth: 0,
    maxWidth: '100%',
    overflowX: 'auto',
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '13px',
    lineHeight: '1.5rem',
  },
  copyLarge: {
    position: 'absolute',
    top: '.625rem',
    right: '.625rem',
    display: 'inline-flex',
    width: '2.5rem',
    height: '2.5rem',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '.375rem',
    cursor: 'pointer',
    color: tokens.mutedForeground,
    backgroundColor: {
      default: tokens.transparent,
      ':hover': tokens.background,
    },
    boxShadow: { default: 'none', ':focus-visible': tokens.focusRingShadow },
    transform: { default: 'scale(1)', ':active': 'scale(0.96)' },
    transitionProperty: 'color, background-color, transform',
    transitionDuration: '.2s',
  },
  copyLargeCopied: { color: tokens.alertSuccess },
  swapIcon: {
    position: 'absolute',
    width: '1rem',
    height: '1rem',
    transitionProperty: 'scale, opacity, filter',
    transitionDuration: '.2s',
    transitionTimingFunction: 'cubic-bezier(0.2,0,0,1)',
  },
  swapIconOut: {
    scale: '0.25',
    opacity: 0,
    filter: 'blur(4px)',
  },
  swapIconIn: {
    scale: '1',
    opacity: 1,
    filter: 'blur(0)',
  },
  viewCodeLabel: {
    position: 'absolute',
    bottom: '.625rem',
    left: '50%',
    transform: {
      default: 'translateX(-50%)',
      ':active': 'translateX(-50%) scale(0.96)',
    },
    zIndex: 10,
    display: 'flex',
    minHeight: '2.5rem',
    cursor: 'pointer',
    alignItems: 'center',
    gap: '.5rem',
    borderRadius: '.375rem',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    backgroundColor: { default: tokens.background, ':hover': tokens.accent },
    paddingInline: '.75rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 500,
    color: tokens.foreground,
    boxShadow: {
      default: tokens.shadowSm,
      ':focus-visible': tokens.focusRingShadow,
    },
    transitionProperty: 'color, background-color, transform',
    transitionDuration: '.2s',
    userSelect: 'none',
  },
  /* TW uses peer-checked descendant selectors ('.peer:checked ~ label .x')
     — sibling-then-descendant is not expressible in stylex.when, so the
     toggle renders two overlapping labels, each a real sibling of the
     checkbox, and swaps which one is displayed. */
  viewCodeToggle: {
    display: {
      default: 'flex',
      [stylex.when.siblingAfter(':checked', codeToggleScope)]: 'none',
    },
  },
  hideCodeToggle: {
    display: {
      default: 'none',
      [stylex.when.siblingAfter(':checked', codeToggleScope)]: 'flex',
    },
  },
  copy: {
    position: 'absolute',
    top: 0,
    right: '.625rem',
    display: 'inline-flex',
    width: '2.25rem',
    height: '2.25rem',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '.375rem',
    cursor: 'pointer',
    color: { default: tokens.mutedForeground, ':hover': tokens.foreground },
    backgroundColor: {
      default: tokens.transparent,
      ':hover': tokens.background,
    },
    boxShadow: { default: 'none', ':focus-visible': tokens.focusRingShadow },
    transitionProperty: 'color, background-color',
    transitionDuration: '.15s',
  },
  icon: { width: '1rem', height: '1rem' },
  scroll: {
    overflowX: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '.5rem',
  },
  table: {
    width: '100%',
    minWidth: '54rem',
    textAlign: 'left',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    borderCollapse: 'collapse',
  },
  tableHead: {
    backgroundColor: 'color-mix(in oklab, var(--muted) 45%, transparent)',
  },
  cell: {
    padding: '.75rem 1rem',
    verticalAlign: 'top',
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  },
  headCell: {
    padding: '.75rem 1rem',
    verticalAlign: 'top',
    fontWeight: 500,
  },
  cellMuted: { color: tokens.mutedForeground },
  cellMono: {
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '.75rem',
    lineHeight: '1rem',
    fontWeight: 500,
    verticalAlign: 'top',
  },
  cellSignature: {
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '.75rem',
    lineHeight: '1.25rem',
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
  },
  cellPurpose: { color: tokens.mutedForeground, maxWidth: '20rem' },
  keyboardRow: {
    borderBottomStyle: {
      default: 'solid',
      ':last-child': 'none',
    },
    borderBottomWidth: {
      default: 1,
      ':last-child': 0,
    },
    borderBottomColor: tokens.border,
  },
  mono: {
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '.75rem',
    lineHeight: '1rem',
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
  },
  keyboard: {
    display: 'grid',
    gridTemplateColumns: {
      default: 'minmax(0,1fr)',
      '@media (min-width: 640px)': '10rem minmax(0,1fr)',
    },
    gap: '.25rem',
    padding: '.75rem 1rem',
  },
  pagination: {
    display: 'grid',
    gap: '.75rem',
    gridTemplateColumns: {
      default: 'minmax(0,1fr)',
      '@media (min-width: 640px)': 'repeat(2,minmax(0,1fr))',
    },
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    paddingTop: '2rem',
  },
  pageLink: {
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '.5rem',
    padding: '1rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    color: tokens.foreground,
    backgroundColor: {
      default: tokens.transparent,
      ':hover': 'color-mix(in oklab, var(--muted) 50%, transparent)',
    },
  },
  pageLinkNext: { textAlign: 'right' },
  apiParagraph: {
    fontSize: '.875rem',
    lineHeight: '1.5rem',
    color: tokens.mutedForeground,
  },
  apiLinks: { display: 'flex', flexWrap: 'wrap', gap: '1rem' },
  apiLink: {
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 500,
    color: tokens.foreground,
    textDecorationLine: 'underline',
    textUnderlineOffset: '4px',
  },
  tocList: { display: 'flex', flexDirection: 'column', gap: '.5rem' },
  tightHeading: { textWrap: 'balance' },
})

const codeKey = (code: string): number =>
  [...code].reduce((hash, char) => (hash * 33 + char.charCodeAt(0)) | 0, 5381)

export const codeBlock = <Msg>(
  code: string,
  fileName: string,
  copy: Readonly<{ onCopy: Msg; isCopied: boolean; label: string }> | undefined,
  dark: boolean,
  mapEvent: (message: CodeFile.Message) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class(className(styles.code))],
    [
      h.keyed('div')(
        `codeview-${fileName}-${dark}-${codeKey(code)}`,
        [
          h.Class(className(styles.codeContent)),
          h.OnMount(
            Mount.mapMessage(
              CodeFile.MountCodeFile({
                fileName,
                contents: code,
                dark,
                lineNumbers: false,
              }),
              mapEvent,
            ),
          ),
        ],
        [],
      ),
      ...(copy === undefined
        ? []
        : [
            h.button(
              [
                h.Type('button'),
                h.OnClick(copy.onCopy),
                h.AriaLabel(
                  copy.isCopied ? `${copy.label} copied` : `Copy ${copy.label}`,
                ),
                h.Class(className(reset.button, styles.copy)),
              ],
              [
                Icon.icon(
                  copy.isCopied ? 'check' : 'copy',
                  { class: className(styles.icon) },
                  h,
                ),
              ],
            ),
          ]),
    ],
  )

const heading = <Msg>(
  id: string,
  title: string,
  tight = false,
  h: HtmlBuilder<Msg>,
): Html =>
  h.h2(
    [
      h.Class(
        className(
          reset.text,
          styles.heading,
          headingScope,
          tight && styles.tightHeading,
        ),
      ),
    ],
    [
      title,
      h.a(
        [
          h.Href(`#${id}`),
          h.AriaLabel(`Link to ${title}`),
          h.Class(className(reset.link, styles.headingAnchor)),
        ],
        ['#'],
      ),
    ],
  )

const exampleCard = <Msg>(
  config: HeroExampleConfig<Msg>,
  idBase: string,
  copyLabelTitle: string,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class(className(styles.frame, styles.timePickerFrameOverflow))],
    [
      h.div(
        [
          h.DataAttribute('example-preview', ''),
          h.Class(
            className(
              styles.preview,
              styles.timePickerPreviewOverflow,
              config.previewClass === 'justify-stretch' && styles.stretch,
              config.previewLayout === 'full-bleed' && styles.fullBleedPreview,
            ),
          ),
        ],
        [config.preview],
      ),
      h.div(
        [h.Class(className(styles.codeArea))],
        [
          h.div(
            [h.Class(className(styles.codeClip))],
            [
              h.keyed('div')(
                `example-codeview-${idBase}-${config.dark}-${codeKey(config.code)}`,
                [
                  h.Class(className(styles.codeClipInner)),
                  h.OnMount(
                    Mount.mapMessage(
                      CodeFile.MountCodeFile({
                        fileName: 'example.ts',
                        contents: config.code,
                        dark: config.dark,
                        lineNumbers: false,
                      }),
                      config.codeFileMessage,
                    ),
                  ),
                ],
                [],
              ),
            ],
          ),
          h.button(
            [
              h.Type('button'),
              h.OnClick(config.onCopy),
              h.AriaLabel(
                config.isCopied
                  ? `${copyLabelTitle} example code copied`
                  : `Copy ${copyLabelTitle} example code`,
              ),
              h.Title(config.isCopied ? 'Copied' : 'Copy code'),
              h.Class(
                className(
                  reset.button,
                  styles.copyLarge,
                  config.isCopied && styles.copyLargeCopied,
                ),
              ),
            ],
            [
              Icon.icon<Msg>(
                'copy',
                {
                  class: className(
                    styles.swapIcon,
                    config.isCopied ? styles.swapIconOut : styles.swapIconIn,
                  ),
                },
                h,
              ),
              Icon.icon<Msg>(
                'check',
                {
                  class: className(
                    styles.swapIcon,
                    config.isCopied ? styles.swapIconIn : styles.swapIconOut,
                  ),
                },
                h,
              ),
            ],
          ),
          h.label(
            [
              h.For(`example-code-${idBase}`),
              h.Class(className(styles.viewCodeLabel, styles.viewCodeToggle)),
            ],
            [
              Icon.codeXml<Msg>({ class: className(styles.icon) }, h),
              'View Code',
            ],
          ),
          h.label(
            [
              h.For(`example-code-${idBase}`),
              h.Class(className(styles.viewCodeLabel, styles.hideCodeToggle)),
            ],
            [
              Icon.codeXml<Msg>({ class: className(styles.icon) }, h),
              'Hide Code',
            ],
          ),
          /* stylex.when.siblingAfter emits ':has(~ .scope:checked)' — the
             checkbox must follow the elements it gates. */
          h.input([
            h.Id(`example-code-${idBase}`),
            h.Type('checkbox'),
            h.Class(className(styles.codeToggle, codeToggleScope)),
          ]),
        ],
      ),
    ],
  )

export const hero = <Msg>(
  config: HeroExampleConfig<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  heroFrame(
    config,
    exampleCard(config, `hero-${toSlug(config.title)}`, config.title, h),
    h,
  )

export const example = <Msg>(
  config: ExampleConfig<Msg>,
  h: HtmlBuilder<Msg>,
): Html =>
  h.section(
    [
      h.Id(config.sectionId ?? toSlug(config.title)),
      h.Class(className(styles.stack)),
    ],
    [
      h.div(
        [h.Class(className(styles.tight))],
        [
          heading<Msg>(
            config.sectionId ?? toSlug(config.title),
            config.title,
            true,
            h,
          ),
          ...(config.description === undefined
            ? []
            : [
                h.p(
                  [h.Class(className(reset.text, styles.description))],
                  [config.description],
                ),
              ]),
        ],
      ),
      exampleCard(
        config,
        config.sectionId ?? toSlug(config.title),
        config.title,
        h,
      ),
    ],
  )

export const componentPage = <Msg>(
  config: ComponentPageConfig<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const link = (href: string, label: string) =>
    h.a([h.Href(href), h.Class(className(reset.link, styles.link))], [label])
  const paragraph = (copy: string, onSurface = false) =>
    h.p(
      [
        h.Class(
          className(
            reset.text,
            styles.description,
            onSurface && styles.surfaceCopy,
          ),
        ),
      ],
      [copy],
    )
  const section = (
    id: string,
    title: string,
    children: ReadonlyArray<Html | string>,
    style: StaticStyles = styles.stack,
  ) =>
    h.section(
      [h.Id(id), h.Class(className(style))],
      [heading<Msg>(id, title, false, h), ...children],
    )
  const code = (source: string, file: string, label: string) =>
    codeBlock(
      source,
      file,
      config.onCopyCode === undefined
        ? undefined
        : {
            onCopy: config.onCopyCode(source),
            isCopied: config.copiedCode === source,
            label,
          },
      config.dark === true,
      config.codeFileMessage,
      h,
    )
  const navItem = (name: string) =>
    h.li(
      [],
      [
        h.a(
          [
            h.Href(componentDocsPath(toSlug(name))),
            ...(config.name === name ? [h.AriaCurrent('page')] : []),
            h.Class(
              className(
                reset.link,
                styles.navLink,
                config.name === name && styles.navActive,
              ),
            ),
          ],
          [name],
        ),
      ],
    )
  const guideNavItems = () =>
    h.ul(
      [h.Class(className(reset.list, styles.navList, styles.navGroup))],
      [
        h.li(
          [],
          [
            h.a(
              [
                h.Href(gettingStartedPath()),
                h.AriaCurrent('false'),
                h.Class(className(reset.link, styles.navLink)),
              ],
              ['Get Started'],
            ),
          ],
        ),
        h.li(
          [],
          [
            h.a(
              [
                h.Href(themingPath()),
                h.AriaCurrent('false'),
                h.Class(className(reset.link, styles.navLink)),
              ],
              ['Theming'],
            ),
          ],
        ),
        h.li(
          [],
          [
            h.a(
              [
                h.Href(lintRulesPath()),
                h.AriaCurrent('false'),
                h.Class(className(reset.link, styles.navLink)),
              ],
              ['Lint rules'],
            ),
          ],
        ),
      ],
    )
  const lintNavGroups = () =>
    LINT_RULE_GROUPS.map(group => ({
      label: group.label,
      items: group.rules.map(rule =>
        h.li(
          [],
          [
            h.a(
              [
                h.Href(lintRulePath(rule.id)),
                h.Class(className(reset.link, styles.navLink)),
              ],
              [rule.title],
            ),
          ],
        ),
      ),
    }))
  const navGroups = () => [
    ...COMPONENT_GROUPS.map(group => ({
      label: group.label,
      items: group.components.map(navItem),
    })),
    ...lintNavGroups(),
  ]
  const position = COMPONENT_NAV_ORDER.findIndex(name => name === config.name)
  const previous = COMPONENT_NAV_ORDER[position - 1]
  const next = COMPONENT_NAV_ORDER[position + 1]
  const toc = [
    ['architecture', 'Architecture'],
    ['installation', 'Installation'],
    ['usage', 'Usage'],
    ...(config.sections ?? []).map(section => [section.id, section.title]),
    ...(config.composition === undefined
      ? []
      : [['composition', 'Composition']]),
    ...(config.exampleTitles ?? []),
    ...(config.styling === undefined ? [] : [['styling', 'Styling']]),
    ...(config.keyboard === undefined
      ? []
      : [['keyboard-interaction', 'Keyboard']]),
    ...(config.accessibility === undefined
      ? []
      : [['accessibility', 'Accessibility']]),
    ['api-reference', 'API Reference'],
  ]
  return h.div(
    [h.Class(className(styles.layout))],
    [
      h.details(
        [h.Class(className(styles.mobile))],
        [
          h.summary([h.Class(className(styles.summary))], ['Browse docs']),
          h.nav(
            [
              h.AriaLabel('Component navigation'),
              h.Class(className(styles.mobileNavOuter)),
            ],
            [
              guideNavItems(),
              ...navGroups().map(group =>
                h.div(
                  [h.Class(className(styles.navGroup))],
                  [
                    h.p(
                      [
                        h.Class(
                          className(
                            reset.text,
                            styles.label,
                            styles.labelIndent,
                          ),
                        ),
                      ],
                      [group.label],
                    ),
                    h.ul(
                      [h.Class(className(reset.list, styles.mobileNav))],
                      group.items,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      h.aside(
        [
          h.Class(className(styles.sidebar)),
          h.OnMount({
            name: 'docs-sidebar-scroll',
            f: element => {
              if (!(element instanceof HTMLElement)) return Stream.empty
              const saved = Number(
                sessionStorage.getItem('creaseui-docs-sidebar-scroll'),
              )
              if (Number.isFinite(saved)) element.scrollTop = saved
              return Subscription.fromEvent<HTMLElement, 'scroll', Msg>({
                target: element,
                type: 'scroll',
                options: { passive: true },
                mapEvent: () => {
                  sessionStorage.setItem(
                    'creaseui-docs-sidebar-scroll',
                    String(element.scrollTop),
                  )
                  return config.sidebarScrolled
                },
              })
            },
          }),
        ],
        [
          h.nav(
            [h.AriaLabel('Component navigation')],
            [
              guideNavItems(),
              ...navGroups().map(group =>
                h.div(
                  [h.Class(className(styles.navGroup))],
                  [
                    h.p(
                      [
                        h.Class(
                          className(
                            reset.text,
                            styles.label,
                            styles.labelIndent,
                          ),
                        ),
                      ],
                      [group.label],
                    ),
                    h.ul(
                      [h.Class(className(reset.list, styles.navList))],
                      group.items,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      h.main(
        [h.Class(className(styles.main))],
        [
          h.div(
            [h.Class(className(styles.content))],
            [
              h.header(
                [h.Class(className(styles.stack))],
                [
                  h.div(
                    [
                      h.AriaLabel('Breadcrumb'),
                      h.Class(className(styles.breadcrumb)),
                    ],
                    [
                      h.a(
                        [
                          h.Href(gettingStartedPath()),
                          h.Class(className(reset.link, styles.breadcrumbLink)),
                        ],
                        ['Docs'],
                      ),
                      h.span([h.AriaHidden(true)], ['/']),
                      h.a(
                        [
                          h.Href(componentDocsPath('accordion')),
                          h.Class(className(reset.link, styles.breadcrumbLink)),
                        ],
                        ['Components'],
                      ),
                      h.span([h.AriaHidden(true)], ['/']),
                      h.span([h.AriaCurrent('page')], [config.name]),
                    ],
                  ),
                  h.h1(
                    [h.Class(className(reset.text, styles.title))],
                    [config.name],
                  ),
                  h.p(
                    [
                      h.Class(
                        className(reset.text, styles.description, styles.lead),
                      ),
                    ],
                    [config.description],
                  ),
                  h.div(
                    [h.Class(className(styles.row))],
                    [
                      h.span(
                        [h.Class(className(styles.badge))],
                        [
                          config.kind === 'helper'
                            ? 'Stateless helper'
                            : config.kind === 'submodel'
                              ? 'Stateful submodel'
                              : 'Composed recipe',
                        ],
                      ),
                      h.span(
                        [h.Class(className(styles.metaText))],
                        ['Installed as source'],
                      ),
                      h.span(
                        [h.AriaHidden(true), h.Class(className(styles.sep))],
                        ['·'],
                      ),
                      h.a(
                        [
                          h.Href(config.apiHref),
                          h.Class(className(reset.link, styles.linkSmall)),
                        ],
                        ['API reference'],
                      ),
                      ...(config.sourceHref === undefined
                        ? []
                        : [
                            h.a(
                              [
                                h.Href(config.sourceHref),
                                h.Class(
                                  className(reset.link, styles.linkSmall),
                                ),
                              ],
                              ['Source'],
                            ),
                          ]),
                    ],
                  ),
                ],
              ),
              ...(config.heroExample === undefined ? [] : [config.heroExample]),
              h.section(
                [h.Id('architecture'), h.Class(className(styles.architecture))],
                [
                  h.div(
                    [h.Class(className(styles.archRow))],
                    [
                      h.div(
                        [h.Class(className(styles.archText))],
                        [
                          h.h2(
                            [
                              h.Class(
                                className(reset.text, styles.archHeading),
                              ),
                            ],
                            ['How it fits Foldkit'],
                          ),
                          h.p(
                            [
                              h.Class(
                                className(reset.text, styles.description),
                              ),
                            ],
                            [config.architecture],
                          ),
                        ],
                      ),
                      h.span(
                        [h.Class(className(styles.kindTag))],
                        [config.kind],
                      ),
                    ],
                  ),
                ],
              ),
              section('installation', 'Installation', [
                h.div(
                  [h.Class(className(styles.stackTight))],
                  [
                    h.div(
                      [h.Class(className(styles.hintRow))],
                      [
                        'Source install',
                        h.span([h.AriaHidden(true)], ['·']),
                        'Copy the StyleX source and its imports into your application; no Tailwind reset is required',
                      ],
                    ),
                    code(
                      config.installation,
                      'install.txt',
                      'installation instructions',
                    ),
                  ],
                ),
              ]),
              section('usage', 'Usage', [
                code(config.usage, 'usage.ts', 'usage example'),
              ]),
              ...(config.sections ?? []).map(item =>
                section(item.id, item.title, [
                  paragraph(item.description),
                  ...(item.code === undefined
                    ? []
                    : [code(item.code, `${item.id}.ts`, item.title)]),
                ]),
              ),
              ...(config.composition === undefined
                ? []
                : [
                    section('composition', 'Composition', [
                      code(
                        config.composition,
                        'composition.ts',
                        'composition example',
                      ),
                    ]),
                  ]),
              ...config.examples,
              ...(config.styling === undefined
                ? []
                : [
                    section(
                      'styling',
                      'Styling',
                      [paragraph(config.styling)],
                      styles.stackTight,
                    ),
                  ]),
              ...(config.keyboard === undefined
                ? []
                : [
                    section(
                      'keyboard-interaction',
                      'Keyboard interaction',
                      [
                        h.dl(
                          [h.Class(className(reset.text, styles.frame))],
                          config.keyboard.map(([key, behavior]) =>
                            h.div(
                              [
                                h.Class(
                                  className(
                                    styles.keyboard,
                                    styles.keyboardRow,
                                  ),
                                ),
                              ],
                              [
                                h.dt([h.Class(className(styles.mono))], [key]),
                                h.dd(
                                  [
                                    h.Class(
                                      className(reset.text, styles.description),
                                    ),
                                  ],
                                  [behavior],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                      styles.stackTight,
                    ),
                  ]),
              ...(config.accessibility === undefined
                ? []
                : [
                    section(
                      'accessibility',
                      'Accessibility',
                      [paragraph(config.accessibility)],
                      styles.stackTight,
                    ),
                  ]),
              section(
                'api-reference',
                'API Reference',
                [
                  h.p(
                    [h.Class(className(reset.text, styles.apiParagraph))],
                    [
                      config.apiDescription ??
                        'Behavior, keyboard interaction, and accessibility follow Foldkit conventions. ',
                      ' ',
                      h.a(
                        [
                          h.Href(config.apiHref),
                          h.Class(className(reset.link, styles.apiLink)),
                        ],
                        ['Read the Foldkit UI reference'],
                      ),
                      '.',
                    ],
                  ),
                  h.div(
                    [
                      h.Class(className(styles.scroll)),
                      h.Attribute('tabindex', '0'),
                    ],
                    [
                      h.table(
                        [h.Class(className(styles.table))],
                        [
                          h.thead(
                            [h.Class(className(styles.tableHead))],
                            [
                              h.tr(
                                [],
                                ['Export', 'Kind', 'Signature', 'Purpose'].map(
                                  title =>
                                    h.th(
                                      [h.Class(className(styles.headCell))],
                                      [title],
                                    ),
                                ),
                              ),
                            ],
                          ),
                          h.tbody(
                            [],
                            config.apiEntries.map(entry =>
                              h.tr(
                                [],
                                [
                                  h.td(
                                    [
                                      h.Class(
                                        className(styles.cell, styles.cellMono),
                                      ),
                                    ],
                                    [entry.name],
                                  ),
                                  h.td(
                                    [
                                      h.Class(
                                        className(
                                          styles.cell,
                                          styles.cellMuted,
                                        ),
                                      ),
                                    ],
                                    [entry.kind],
                                  ),
                                  h.td(
                                    [h.Class(className(styles.cell))],
                                    [
                                      h.code(
                                        [
                                          h.Class(
                                            className(styles.cellSignature),
                                          ),
                                        ],
                                        [entry.signature],
                                      ),
                                    ],
                                  ),
                                  h.td(
                                    [
                                      h.Class(
                                        className(
                                          styles.cell,
                                          styles.cellPurpose,
                                        ),
                                      ),
                                    ],
                                    [apiPurpose(entry)],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  h.div(
                    [h.Class(className(styles.apiLinks))],
                    [
                      h.a(
                        [
                          h.Href(config.apiHref),
                          h.Class(className(reset.link, styles.apiLink)),
                        ],
                        ['Foldkit API'],
                      ),
                      ...(config.sourceHref === undefined
                        ? []
                        : [
                            h.a(
                              [
                                h.Href(config.sourceHref),
                                h.Class(className(reset.link, styles.apiLink)),
                              ],
                              ['View source'],
                            ),
                          ]),
                    ],
                  ),
                ],
                styles.apiSection,
              ),
              h.nav(
                [
                  h.AriaLabel('Component pagination'),
                  h.Class(className(styles.pagination)),
                ],
                [
                  previous === undefined
                    ? h.span([], [])
                    : h.a(
                        [
                          h.Href(componentDocsPath(toSlug(previous))),
                          h.Class(className(reset.link, styles.pageLink)),
                        ],
                        [`← ${previous}`],
                      ),
                  next === undefined
                    ? h.span([], [])
                    : h.a(
                        [
                          h.Href(componentDocsPath(toSlug(next))),
                          h.Class(
                            className(
                              reset.link,
                              styles.pageLink,
                              styles.pageLinkNext,
                            ),
                          ),
                        ],
                        [`${next} →`],
                      ),
                ],
              ),
            ],
          ),
        ],
      ),
      h.aside(
        [h.Class(className(styles.toc))],
        [
          h.nav(
            [h.AriaLabel('On this page')],
            [
              h.p(
                [h.Class(className(reset.text, styles.label))],
                ['On this page'],
              ),
              h.ul(
                [h.Class(className(reset.list, styles.tocList))],
                toc.map(([id, title]) =>
                  h.li(
                    [],
                    [
                      h.a(
                        [
                          h.Href(`#${id}`),
                          h.Class(className(reset.link, styles.link)),
                        ],
                        [title ?? ''],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
