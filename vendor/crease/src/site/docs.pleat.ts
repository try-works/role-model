import { Style, When } from '@pleat/core'
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
import { reset } from '@/pleat/reset'
import { className } from '@/pleat/style'
import { tokens } from '../pleat/tokens'
import { codeToggleScope, headingScope } from './docs.markers.pleat'

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

const styles = {
  navGroup: Style.make({ marginBottom: '1.5rem' }),
  layout: Style.make({
    marginInline: 'auto',
    display: 'grid',
    width: '100%',
    maxWidth: '1500px',
    gridTemplateColumns: 'minmax(0,1fr)',
  }).pipe(
    Style.when(When.minWidth('1024px'), {
      gridTemplateColumns: '220px minmax(0,1fr) 190px',
    }),
  ),
  sidebar: Style.make({
    display: 'none',
    position: 'sticky',
    top: '3.5rem',
    height: 'calc(100vh - 3.5rem)',
    overflowY: 'auto',
    borderRightStyle: 'solid',
    borderRightWidth: 1,
    borderRightColor: tokens.border,
    padding: '2.5rem 1.25rem',
  }).pipe(Style.when(When.minWidth('1024px'), { display: 'block' })),
  toc: Style.make({
    display: 'none',
    position: 'sticky',
    top: '3.5rem',
    height: 'calc(100vh - 3.5rem)',
    overflowY: 'auto',
    padding: '2.5rem 1.25rem',
  }).pipe(Style.when(When.minWidth('1024px'), { display: 'block' })),
  summary: Style.make({
    cursor: 'pointer',
    padding: '.75rem 1rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
  }),
  mobile: Style.make({
    display: 'block',
    margin: '1.25rem 1.25rem 0',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '.5rem',
    backgroundColor: tokens.background,
  }).pipe(Style.when(When.minWidth('1024px'), { display: 'none' })),
  mobileNavOuter: Style.make({
    maxHeight: '55vh',
    overflowY: 'auto',
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    padding: '.5rem',
  }),
  mobileNav: Style.make({
    display: 'grid',
    gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
    gap: '.125rem',
  }).pipe(
    Style.when(When.minWidth('640px'), {
      gridTemplateColumns: 'repeat(3,minmax(0,1fr))',
    }),
  ),
  main: Style.make({
    minWidth: 0,
    paddingBlock: '2.5rem',
    paddingInline: '1.25rem',
  }).pipe(
    Style.when(When.minWidth('1024px'), {
      paddingBlock: '3.5rem',
      paddingInline: '3rem',
    }),
    Style.when(When.minWidth('640px'), { paddingInline: '2rem' }),
  ),
  content: Style.make({
    marginInline: 'auto',
    maxWidth: '56rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '3.5rem',
  }),
  stack: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    scrollMarginTop: '6rem',
    minWidth: 0,
  }),
  stackTight: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '.75rem',
    scrollMarginTop: '6rem',
    minWidth: 0,
  }),
  apiSection: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '.75rem',
    scrollMarginTop: '6rem',
    minWidth: 0,
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    paddingTop: '2.5rem',
  }),
  tight: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '.375rem',
  }),
  row: Style.make({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '.5rem',
  }),
  title: Style.make({
    fontSize: '2.25rem',
    lineHeight: '2.5rem',
    fontWeight: 600,
    letterSpacing: '-.035em',
    textWrap: 'balance',
  }),
  heading: Style.make({
    fontSize: '1.25rem',
    lineHeight: '1.75rem',
    fontWeight: 600,
    letterSpacing: '-.025em',
    display: 'flex',
    alignItems: 'center',
    gap: '.5rem',
  }),
  headingAnchor: Style.make({
    color: tokens.mutedForeground,
    opacity: 0,
    transitionProperty: 'opacity',
    transitionDuration: '.15s',
  }).pipe(
    Style.when(When.within(headingScope, When.hover), { opacity: 1 }),
    Style.when(When.focusVisible, { opacity: 1 }),
  ),
  label: Style.make({
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
    marginBottom: '.75rem',
  }),
  labelIndent: Style.make({ paddingInline: '.5rem' }),
  description: Style.make({
    maxWidth: '70ch',
    color: tokens.mutedForeground,
    fontSize: '.875rem',
    lineHeight: '1.5rem',
  }),
  lead: Style.make({ fontSize: '1rem', lineHeight: '1.75rem' }),
  link: Style.make({
    color: tokens.mutedForeground,
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    textUnderlineOffset: '4px',
  }).pipe(Style.when(When.hover, { color: tokens.foreground })),
  underline: Style.make({ textDecorationLine: 'underline' }),
  navLink: Style.make({
    display: 'block',
    padding: '.375rem .5rem',
    borderRadius: '.375rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    color: tokens.mutedForeground,
    backgroundColor: tokens.transparent,
    transitionProperty: 'color, background-color',
    transitionDuration: '.15s',
  }).pipe(
    Style.when(When.hover, {
      color: tokens.foreground,
      backgroundColor: 'color-mix(in oklab, var(--muted) 60%, transparent)',
    }),
  ),
  navActive: Style.make({
    color: tokens.foreground,
    backgroundColor: tokens.muted,
    fontWeight: 500,
  }),
  navList: Style.make({ display: 'grid', gap: '.125rem' }),
  badge: Style.make({
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
  }),
  metaText: Style.make({
    fontSize: '.75rem',
    lineHeight: '1rem',
    color: tokens.mutedForeground,
  }),
  breadcrumb: Style.make({
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '.5rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    color: tokens.mutedForeground,
  }),
  breadcrumbLink: Style.make({ color: tokens.mutedForeground }).pipe(
    Style.when(When.hover, { color: tokens.foreground }),
  ),
  sep: Style.make({ color: tokens.border }),
  linkSmall: Style.make({
    fontSize: '.75rem',
    lineHeight: '1rem',
    fontWeight: 500,
    color: tokens.foreground,
    textDecorationLine: 'underline',
    textUnderlineOffset: '4px',
  }),
  surfaceCopy: Style.make({ color: tokens.secondaryForeground }),
  architecture: Style.make({
    borderBlockStyle: 'solid',
    borderBlockWidth: 1,
    borderBlockColor: tokens.border,
    paddingBlock: '1.25rem',
    paddingInline: '1.25rem',
    backgroundColor: 'color-mix(in oklab, var(--muted) 25%, transparent)',
    scrollMarginTop: '6rem',
  }).pipe(Style.when(When.minWidth('640px'), { paddingInline: '1.5rem' })),
  archRow: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '.5rem',
    alignItems: 'stretch',
    justifyContent: 'normal',
  }).pipe(
    Style.when(When.minWidth('640px'), {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    }),
  ),
  archText: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '.25rem',
  }),
  archHeading: Style.make({
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 600,
  }),
  kindTag: Style.make({
    flexShrink: 0,
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '.75rem',
    lineHeight: '1rem',
    color: tokens.mutedForeground,
  }),
  hintRow: Style.make({
    display: 'flex',
    flexWrap: 'wrap',
    gap: '.5rem',
    fontSize: '.75rem',
    lineHeight: '1rem',
    color: tokens.mutedForeground,
  }),
  timePickerFrameOverflow: Style.make({ overflow: 'hidden' }).pipe(
    Style.when(When.has(When.data('slot', 'popover-content')), {
      overflow: 'visible',
    }),
    Style.when(
      When.has(
        When.pseudo(
          ':is([data-slot="time-input"] [data-slot="select-content"])',
        ),
      ),
      { overflow: 'visible' },
    ),
    Style.when(When.has(When.data('slot', 'hover-card-content')), {
      overflow: 'visible',
    }),
    Style.when(
      When.has(
        When.pseudo(
          ':is([data-slot="multi-selector"] [data-slot="select-content"])',
        ),
      ),
      { overflow: 'visible' },
    ),
  ),
  timePickerPreviewOverflow: Style.make({ overflowX: 'auto' }).pipe(
    Style.when(When.has(When.data('slot', 'popover-content')), {
      overflowX: 'visible',
    }),
    Style.when(
      When.has(
        When.pseudo(
          ':is([data-slot="time-input"] [data-slot="select-content"])',
        ),
      ),
      { overflowX: 'visible' },
    ),
    Style.when(When.has(When.data('slot', 'hover-card-content')), {
      overflowX: 'visible',
    }),
    Style.when(
      When.has(
        When.pseudo(
          ':is([data-slot="multi-selector"] [data-slot="select-content"])',
        ),
      ),
      { overflowX: 'visible' },
    ),
  ),
  frame: Style.make({
    overflow: 'hidden',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '.5rem',
    backgroundColor: tokens.background,
  }).pipe(
    Style.when(When.has(When.data('slot', 'popover-content')), {
      overflow: 'visible',
    }),
  ),
  preview: Style.make({
    display: 'flex',
    minHeight: '16rem',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
    overflowX: 'auto',
  }).pipe(
    Style.when(When.minWidth('640px'), { padding: '2.5rem' }),
    Style.when(When.has(When.data('slot', 'popover-content')), {
      overflowX: 'visible',
    }),
  ),
  stretch: Style.make({ justifyContent: 'stretch' }),
  fullBleedPreview: Style.make({ padding: 0 }).pipe(
    Style.when(When.minWidth('640px'), { padding: 0 }),
  ),
  code: Style.make({
    position: 'relative',
    minWidth: 0,
    maxWidth: '100%',
    overflow: 'hidden',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '.5rem',
    backgroundColor: 'color-mix(in oklab, var(--muted) 35%, transparent)',
  }),
  codeContent: Style.make({
    minWidth: 0,
    maxWidth: '100%',
    overflowX: 'auto',
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '13px',
    lineHeight: '1.5rem',
  }),
  codeArea: Style.make({
    position: 'relative',
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    backgroundColor: 'color-mix(in oklab, var(--muted) 35%, transparent)',
  }),
  codeToggle: Style.make({
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
  }),
  codeClip: Style.make({
    position: 'relative',
    maxHeight: '7.25rem',
    overflow: 'hidden',
    paddingBottom: '2.75rem',
    maskImage: 'linear-gradient(to bottom, black 35%, transparent 100%)',
  }).pipe(
    Style.when(When.pseudo(`:has(~ .${codeToggleScope.className}:checked)`), {
      maxHeight: 'none',
      maskImage: 'none',
    }),
  ),
  codeClipInner: Style.make({
    minWidth: 0,
    maxWidth: '100%',
    overflowX: 'auto',
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '13px',
    lineHeight: '1.5rem',
  }),
  copyLarge: Style.make({
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
    backgroundColor: tokens.transparent,
    boxShadow: 'none',
    transform: 'scale(1)',
    transitionProperty: 'color, background-color, transform',
    transitionDuration: '.2s',
  }).pipe(
    Style.when(When.hover, { backgroundColor: tokens.background }),
    Style.when(When.focusVisible, { boxShadow: tokens.focusRingShadow }),
    Style.when(When.active, { transform: 'scale(0.96)' }),
  ),
  copyLargeCopied: Style.make({ color: tokens.alertSuccess }),
  swapIcon: Style.make({
    position: 'absolute',
    width: '1rem',
    height: '1rem',
    transitionProperty: 'scale, opacity, filter',
    transitionDuration: '.2s',
    transitionTimingFunction: 'cubic-bezier(0.2,0,0,1)',
  }),
  swapIconOut: Style.make({ scale: '0.25', opacity: 0, filter: 'blur(4px)' }),
  swapIconIn: Style.make({ scale: '1', opacity: 1, filter: 'blur(0)' }),
  viewCodeLabel: Style.make({
    position: 'absolute',
    bottom: '.625rem',
    left: '50%',
    transform: 'translateX(-50%)',
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
    backgroundColor: tokens.background,
    paddingInline: '.75rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 500,
    color: tokens.foreground,
    boxShadow: tokens.shadowSm,
    transitionProperty: 'color, background-color, transform',
    transitionDuration: '.2s',
    userSelect: 'none',
  }).pipe(
    Style.when(When.active, { transform: 'translateX(-50%) scale(0.96)' }),
    Style.when(When.hover, { backgroundColor: tokens.accent }),
    Style.when(When.focusVisible, { boxShadow: tokens.focusRingShadow }),
  ),
  viewCodeToggle: Style.make({ display: 'flex' }).pipe(
    Style.when(When.pseudo(`:has(~ .${codeToggleScope.className}:checked)`), {
      display: 'none',
    }),
  ),
  hideCodeToggle: Style.make({ display: 'none' }).pipe(
    Style.when(When.pseudo(`:has(~ .${codeToggleScope.className}:checked)`), {
      display: 'flex',
    }),
  ),
  copy: Style.make({
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
    color: tokens.mutedForeground,
    backgroundColor: tokens.transparent,
    boxShadow: 'none',
    transitionProperty: 'color, background-color',
    transitionDuration: '.15s',
  }).pipe(
    Style.when(When.hover, {
      color: tokens.foreground,
      backgroundColor: tokens.background,
    }),
    Style.when(When.focusVisible, { boxShadow: tokens.focusRingShadow }),
  ),
  icon: Style.make({ width: '1rem', height: '1rem' }),
  scroll: Style.make({
    overflowX: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '.5rem',
  }),
  table: Style.make({
    width: '100%',
    minWidth: '54rem',
    textAlign: 'left',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    borderCollapse: 'collapse',
  }),
  tableHead: Style.make({
    backgroundColor: 'color-mix(in oklab, var(--muted) 45%, transparent)',
  }),
  cell: Style.make({
    padding: '.75rem 1rem',
    verticalAlign: 'top',
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  }),
  headCell: Style.make({
    padding: '.75rem 1rem',
    verticalAlign: 'top',
    fontWeight: 500,
  }),
  cellMuted: Style.make({ color: tokens.mutedForeground }),
  cellMono: Style.make({
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '.75rem',
    lineHeight: '1rem',
    fontWeight: 500,
    verticalAlign: 'top',
  }),
  cellSignature: Style.make({
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '.75rem',
    lineHeight: '1.25rem',
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
  }),
  cellPurpose: Style.make({ color: tokens.mutedForeground, maxWidth: '20rem' }),
  keyboardRow: Style.make({
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    borderBottomColor: tokens.border,
  }).pipe(
    Style.when(When.lastChild, {
      borderBottomStyle: 'none',
      borderBottomWidth: 0,
    }),
  ),
  mono: Style.make({
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '.75rem',
    lineHeight: '1rem',
    whiteSpace: 'normal',
    overflowWrap: 'break-word',
  }),
  keyboard: Style.make({
    display: 'grid',
    gridTemplateColumns: 'minmax(0,1fr)',
    gap: '.25rem',
    padding: '.75rem 1rem',
  }).pipe(
    Style.when(When.minWidth('640px'), {
      gridTemplateColumns: '10rem minmax(0,1fr)',
    }),
  ),
  pagination: Style.make({
    display: 'grid',
    gap: '.75rem',
    gridTemplateColumns: 'minmax(0,1fr)',
    borderTopStyle: 'solid',
    borderTopWidth: 1,
    borderTopColor: tokens.border,
    paddingTop: '2rem',
  }).pipe(
    Style.when(When.minWidth('640px'), {
      gridTemplateColumns: 'repeat(2,minmax(0,1fr))',
    }),
  ),
  pageLink: Style.make({
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: '.5rem',
    padding: '1rem',
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    color: tokens.foreground,
    backgroundColor: tokens.transparent,
  }).pipe(
    Style.when(When.hover, {
      backgroundColor: 'color-mix(in oklab, var(--muted) 50%, transparent)',
    }),
  ),
  pageLinkNext: Style.make({ textAlign: 'right' }),
  apiParagraph: Style.make({
    fontSize: '.875rem',
    lineHeight: '1.5rem',
    color: tokens.mutedForeground,
  }),
  apiLinks: Style.make({ display: 'flex', flexWrap: 'wrap', gap: '1rem' }),
  apiLink: Style.make({
    fontSize: '.875rem',
    lineHeight: '1.25rem',
    fontWeight: 500,
    color: tokens.foreground,
    textDecorationLine: 'underline',
    textUnderlineOffset: '4px',
  }),
  tocList: Style.make({
    display: 'flex',
    flexDirection: 'column',
    gap: '.5rem',
  }),
  tightHeading: Style.make({ textWrap: 'balance' }),
}

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
    style: Style.Style = styles.stack,
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
