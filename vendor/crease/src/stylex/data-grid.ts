/* data-grid component view — StyleX. Port of
   tablecn/src/app/data-grid/components/data-grid-demo.tsx: dense editable
   grid with column headers, cell focus/edit, row selection, context menu,
   search overlay, toolbar (direction/filter/sort/height/view) and add-row. */

import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'
import { reset } from '@/stylex/reset'
import { className } from '@/stylex/style'
import { tokens } from '@/stylex/tokens.stylex'
import { foundationTokens } from '@/stylex/foundations-tokens.stylex'
import { interactionTokens } from '@/stylex/interaction-tokens.stylex.const'

import { dateFromISO } from '@/lib/date-parse'
import { icon } from '@/stylex/composition/icon'
import * as Icon from '@/lib/icon'
import * as Calendar from '@/stylex/calendar'
import * as DataGrid from '@/lib/data-grid'
import type {
  DataGridColumn,
  DataGridConfig,
  FileCellData,
} from '@/lib/data-grid'

const st = stylex.create({
  c2: {
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
  },
  c3: {
    marginBlock: '0.25rem',
    marginInline: '-0.25rem',
    backgroundColor: tokens.border,
    height: '1px',
  },
  c4: {
    borderRadius: foundationTokens.radiusSm,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': tokens.accent,
      ':focus': tokens.accent,
    },
    color: {
      default: null,
      ':hover': tokens.accentForeground,
      ':focus': tokens.accentForeground,
    },
    cursor: interactionTokens.cursorDefault,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    paddingInlineEnd: '0.5rem',
    paddingInlineStart: '2rem',
    position: 'relative',
    userSelect: 'none',
    width: '100%',
  },
  c6: { position: 'relative' },
  c7: {
    inset: '0',
    backgroundColor: 'transparent',
    cursor: interactionTokens.cursorDefault,
    position: 'fixed',
    zIndex: 40,
  },
  c15: { paddingInlineStart: '2rem' },
  c42: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    marginBottom: '0.5rem',
  },
  c110: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.375rem',
    paddingInline: '0.625rem',
    alignItems: 'center',
    backgroundColor: { default: 'transparent', ':hover': tokens.accent },
    boxShadow: foundationTokens.shadowXs,
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color, border-color, box-shadow',
    height: '2rem',
  },
  c111: { backgroundColor: tokens.accent },
  c112: {
    paddingInline: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontVariantNumeric: 'tabular-nums',
    justifyContent: 'flex-end',
    height: '100%',
    width: '100%',
  },
  c113: {
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  c114: {
    accentColor: tokens.primary,
    cursor: interactionTokens.cursorAction,
    height: '1rem',
    width: '1rem',
  },
  c115: {
    gap: '0.25rem',
    overflow: 'hidden',
    paddingInline: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    height: '100%',
  },
  c116: {
    borderRadius: foundationTokens.radiusSm,
    paddingBlock: '0.125rem',
    paddingInline: '0.375rem',
    alignItems: 'center',
    backgroundColor: tokens.secondary,
    display: 'inline-flex',
    flexShrink: '0',
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
  },
  c117: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    paddingBlock: '0.125rem',
    paddingInline: '0.375rem',
    alignItems: 'center',
    backgroundColor: tokens.muted,
    display: 'inline-flex',
    flexShrink: '0',
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  c118: {
    paddingInline: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    height: '100%',
  },
  c119: {
    overflow: 'hidden',
    color: tokens.mutedForeground,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  c120: {
    overflow: 'hidden',
    paddingInline: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    height: '100%',
  },
  c121: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.375rem',
    paddingInline: '0.625rem',
    alignItems: 'center',
    backgroundColor: { default: 'transparent', ':hover': tokens.accent },
    boxShadow: foundationTokens.shadowXs,
    display: 'inline-flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color, border-color, box-shadow',
    height: '2rem',
  },
  c122: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  c123: { padding: '0.75rem', width: '18rem' },
  c124: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    marginBottom: '0.375rem',
  },
  c125: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
    width: '6rem',
  },
  c126: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    paddingInline: '0.5rem',
    backgroundColor: 'transparent',
    boxShadow: {
      default: null,
      ':focus-visible': `inset 0 0 0 1px ${tokens.ring}`,
    },
    fontSize: '0.75rem',
    lineHeight: '1rem',
    outlineStyle: 'none',
    height: '1.75rem',
    minWidth: 0,
    width: '100%',
  },
  c127: { color: tokens.mutedForeground, marginInlineStart: 'auto' },
  c128: { justifyContent: 'center', paddingInlineStart: '2rem' },
  c129: {
    alignItems: 'center',
    display: 'flex',
    insetInlineStart: '0.5rem',
    justifyContent: 'center',
    position: 'absolute',
    height: '0.875rem',
    width: '0.875rem',
  },
  c130: {
    padding: '0.25rem',
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    gap: '0.25rem',
    alignItems: 'center',
    backgroundColor: foundationTokens.popover,
    boxShadow: foundationTokens.shadowMd,
    display: 'flex',
    insetInlineEnd: '0.5rem',
    position: 'absolute',
    zIndex: 40,
    top: '0.5rem',
  },
  c131: {
    paddingInline: '0.25rem',
    backgroundColor: 'transparent',
    color: { default: null, '::placeholder': tokens.mutedForeground },
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    height: '1.75rem',
    width: '10rem',
  },
  c132: {
    paddingInline: '0.25rem',
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: '1rem',
  },
  c133: {
    borderRadius: foundationTokens.radiusSm,
    alignItems: 'center',
    backgroundColor: { default: 'transparent', ':hover': tokens.accent },
    display: 'inline-flex',
    justifyContent: 'center',
    height: '1.5rem',
    width: '1.5rem',
  },
  c134: {
    padding: '0.25rem',
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: foundationTokens.popover,
    boxShadow: foundationTokens.shadowMd,
    color: foundationTokens.popoverForeground,
    position: 'fixed',
    zIndex: 50,
    width: '12rem',
  },
  c135: {
    padding: '0.25rem',
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    height: '100dvh',
    width: '100%',
  },
  c136: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    flex: '1',
    overflow: 'auto',
    alignContent: 'start',
    display: 'grid',
    isolation: 'isolate',
    outlineStyle: { default: null, ':focus': 'none' },
    position: 'relative',
    userSelect: 'none',
    minHeight: '0',
  },
  c137: {
    backgroundColor: tokens.background,
    display: 'grid',
    position: 'sticky',
    zIndex: 30,
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    top: '0rem',
  },
  c138: { display: 'flex', width: '100%' },
  c139: {
    alignItems: 'center',
    borderInlineEndColor: tokens.border,
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: '1px',
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
  },
  c140: { accentColor: tokens.primary, height: '0.875rem', width: '0.875rem' },
  c141: {
    borderInlineEndColor: tokens.border,
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: '1px',
    position: 'relative',
  },
  c142: {
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.75rem',
    alignItems: 'center',
    backgroundColor: { default: 'transparent', ':hover': tokens.accent },
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
    textAlign: 'left',
    height: '100%',
    width: '100%',
  },
  c143: { display: 'grid', position: 'relative' },
  c144: { display: 'flex', position: 'absolute', width: '100%' },
  c145: {
    alignItems: 'center',
    backgroundColor: tokens.background,
    borderInlineEndColor: tokens.border,
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: '1px',
    display: 'flex',
    justifyContent: 'center',
    position: 'relative',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
  c146: { backgroundColor: tokens.muted },
  c147: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: '1rem',
  },
  c148: { opacity: '1' },
  c149: { display: 'none' },
  c150: {
    accentColor: tokens.primary,
    position: 'absolute',
    height: '0.875rem',
    width: '0.875rem',
  },
  c151: { display: 'none' },
  c152: { display: 'block' },
  c153: {
    borderInlineEndColor: tokens.border,
    borderInlineEndStyle: 'solid',
    borderInlineEndWidth: '1px',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    position: 'relative',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
  },
  c154: {
    backgroundColor: `color-mix(in srgb, ${tokens.accent} 40%, transparent)`,
  },
  c155: { boxShadow: `inset 0 0 0 1px ${tokens.ring}`, zIndex: 10 },
  c156: {
    backgroundColor: `color-mix(in srgb, ${tokens.muted} 50%, transparent)`,
  },
  c157: {
    inset: '0',
    paddingInline: '0.5rem',
    backgroundColor: tokens.background,
    boxShadow: `inset 0 0 0 1px ${tokens.ring}`,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    position: 'absolute',
    height: '100%',
    width: '100%',
  },
  c158: {
    backgroundColor: tokens.background,
    display: 'grid',
    position: 'sticky',
    zIndex: 30,
    borderTopColor: tokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
    bottom: '0rem',
  },
  c159: {
    alignItems: 'center',
    backgroundColor: {
      default: `color-mix(in srgb, ${tokens.muted} 30%, transparent)`,
      ':hover': `color-mix(in srgb, ${tokens.muted} 50%, transparent)`,
      ':focus': `color-mix(in srgb, ${tokens.muted} 50%, transparent)`,
    },
    display: 'flex',
    flexGrow: '1',
    outlineStyle: { default: null, ':focus': 'none' },
    position: 'relative',
    transitionDuration: interactionTokens.motionFast,
    transitionProperty: 'color, background-color, border-color, box-shadow',
    height: '2.25rem',
  },
  c160: {
    gap: '0.5rem',
    paddingInline: '0.75rem',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'flex',
    insetInlineStart: '0',
    position: 'sticky',
  },
  c161: { fontSize: '0.875rem', lineHeight: '1.25rem' },
  icon35: { display: 'inline-flex' },
  icon36: { display: 'inline-flex', fontSize: '0.75rem' },
  icon37: { display: 'inline-flex' },
  icon38: { display: 'inline-flex' },
  icon39: { display: 'inline-flex', fontSize: '1rem' },
  icon40: { display: 'inline-flex', fontSize: '1rem' },
  icon41: {
    color: tokens.mutedForeground,
    display: 'inline-flex',
    fontSize: '1rem',
    marginInlineStart: '0.25rem',
  },
  icon42: { display: 'inline-flex' },
  icon43: { display: 'inline-flex' },
  icon44: { display: 'inline-flex' },
  icon45: { display: 'inline-flex' },
  icon46: {
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: 0,
    fontSize: '0.875rem',
  },
  colHeadText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  icon47: { display: 'inline-flex', fontSize: '0.875rem' },
  icon48: { display: 'inline-flex', fontSize: '0.875rem' },
  selWrap: {
    paddingInline: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    height: '100%',
  },
  selBadge: {
    borderRadius: foundationTokens.radiusMd,
    gap: '0.25rem',
    paddingBlock: '1px',
    paddingInline: '0.375rem',
    alignItems: 'center',
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    display: 'inline-flex',
    flexShrink: '0',
    fontSize: '0.75rem',
    fontWeight: 500,
    justifyContent: 'center',
    whiteSpace: 'pre-wrap',
    width: 'fit-content',
  },
  urlWrap: {
    overflow: 'hidden',
    paddingInline: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    height: '100%',
    width: '100%',
  },
  urlLink: {
    overflow: 'hidden',
    color: tokens.primary,
    textDecorationLine: 'underline',
    textDecorationThickness: '1px',
    textOverflow: 'ellipsis',
    textUnderlineOffset: '2px',
    whiteSpace: 'nowrap',
  },
  contents: { display: 'contents' },
  editorScrim: {
    backgroundColor: 'transparent',
    cursor: interactionTokens.cursorDefault,
    insetInlineEnd: 0,
    insetInlineStart: 0,
    position: 'fixed',
    zIndex: 40,
    bottom: 0,
    top: 0,
  },
  editorPopup: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: foundationTokens.popover,
    boxShadow: foundationTokens.shadowMd,
    color: foundationTokens.popoverForeground,
    insetInlineStart: 0,
    position: 'absolute',
    zIndex: 50,
    marginTop: '0.125rem',
    top: '100%',
  },
  longTextPopup: { padding: 0, width: '400px' },
  longTextArea: {
    padding: '0.75rem',
    borderStyle: 'none',
    backgroundColor: 'transparent',
    boxShadow: 'none',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    resize: 'none',
    maxHeight: '300px',
    minHeight: '150px',
    overflowY: 'auto',
    width: '100%',
  },
  selectPopup: {
    padding: '0.25rem',
    maxWidth: '240px',
    minWidth: 'calc(100% + 16px)',
    width: 'max-content',
  },
  selectOption: {
    borderRadius: foundationTokens.radiusSm,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    alignItems: 'center',
    backgroundColor: { default: 'transparent', ':hover': tokens.accent },
    cursor: interactionTokens.cursorDefault,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    paddingInlineEnd: '2rem',
    paddingInlineStart: '0.5rem',
    position: 'relative',
    userSelect: 'none',
    width: '100%',
  },
  selectCheck: {
    insetInlineEnd: '0.5rem',
    position: 'absolute',
    height: '1rem',
    width: '1rem',
  },
  multiPopup: { padding: 0, width: '300px' },
  multiHeader: {
    gap: '0.25rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.75rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    minHeight: '2.25rem',
  },
  multiBadge: {
    borderRadius: foundationTokens.radiusMd,
    gap: '0.25rem',
    paddingBlock: '1px',
    paddingInline: '0.375rem',
    alignItems: 'center',
    backgroundColor: tokens.secondary,
    display: 'inline-flex',
    fontSize: '0.75rem',
    fontWeight: 500,
    lineHeight: '1rem',
  },
  multiSearch: {
    backgroundColor: 'transparent',
    flexGrow: 1,
    fontSize: '0.875rem',
    outlineStyle: 'none',
    minWidth: '4rem',
  },
  multiList: { padding: '0.25rem', maxHeight: '300px', overflowY: 'auto' },
  multiEmpty: {
    paddingBlock: '1.5rem',
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    textAlign: 'center',
  },
  multiOption: {
    borderRadius: foundationTokens.radiusSm,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: { default: 'transparent', ':hover': tokens.accent },
    cursor: interactionTokens.cursorDefault,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    userSelect: 'none',
    width: '100%',
  },
  multiBox: {
    borderColor: { default: tokens.input, ':checked': tokens.primary },
    borderRadius: foundationTokens.radiusSm,
    borderStyle: 'solid',
    borderWidth: '1px',
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    height: '1rem',
    width: '1rem',
  },
  multiBoxChecked: {
    borderColor: tokens.primary,
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  multiFooter: {
    padding: '0.25rem',
    borderTopColor: tokens.border,
    borderTopStyle: 'solid',
    borderTopWidth: '1px',
  },
  multiClear: {
    borderRadius: foundationTokens.radiusSm,
    paddingBlock: '0.375rem',
    backgroundColor: { default: 'transparent', ':hover': tokens.accent },
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    outlineStyle: 'none',
    width: '100%',
  },
  datePopup: { padding: 0, width: 'auto' },
  filePopup: { padding: '0.5rem', width: '300px' },
  fileRow: {
    borderRadius: foundationTokens.radiusSm,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
  },
  fileIcon: {
    color: tokens.mutedForeground,
    flexShrink: 0,
    fontSize: '0.875rem',
  },
  fileName: {
    overflow: 'hidden',
    flexGrow: 1,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  fileSize: {
    color: tokens.mutedForeground,
    flexShrink: 0,
    fontSize: '0.75rem',
  },
  fileRemove: {
    borderRadius: foundationTokens.radiusSm,
    alignItems: 'center',
    backgroundColor: { default: 'transparent', ':hover': tokens.accent },
    display: 'inline-flex',
    flexShrink: 0,
    justifyContent: 'center',
    outlineStyle: 'none',
    height: '1.25rem',
    width: '1.25rem',
  },
  fileDrop: {
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'dashed',
    borderWidth: '1px',
    gap: '0.25rem',
    alignItems: 'center',
    backgroundColor: { default: 'transparent', ':hover': tokens.accent },
    color: tokens.mutedForeground,
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.75rem',
    justifyContent: 'center',
    height: '5rem',
    marginTop: '0.25rem',
  },
  fileHint: { fontSize: '10px' },
  hidden: { display: 'none' },
  iconXs: { fontSize: '0.75rem' },
  numberEditor: {
    appearance: 'textfield',
  },
  colPanel: {
    padding: '0.25rem',
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: foundationTokens.popover,
    boxShadow: foundationTokens.shadowMd,
    color: foundationTokens.popoverForeground,
    insetInlineStart: '0',
    outlineStyle: 'none',
    position: 'absolute',
    zIndex: 50,
    minWidth: '15rem',
    top: '100%',
    width: 'auto',
  },
  menuItemL: {
    borderRadius: foundationTokens.radiusSm,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': tokens.accent,
      ':focus': tokens.accent,
    },
    color: { default: null, ':focus': tokens.accentForeground },
    cursor: interactionTokens.cursorDefault,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    paddingInlineEnd: '2rem',
    paddingInlineStart: '0.5rem',
    position: 'relative',
    userSelect: 'none',
    width: '100%',
  },
  chevEnd: {
    color: tokens.mutedForeground,
    display: 'inline-flex',
    flexShrink: '0',
    marginInlineStart: 'auto',
  },
  checkEnd: {
    color: tokens.foreground,
    display: 'inline-flex',
    marginInlineStart: 'auto',
  },
  panelStart: { insetInlineStart: '0' },
  panelEnd: { insetInlineEnd: '0' },
  toolPanel: {
    padding: '0.25rem',
    borderColor: tokens.border,
    borderRadius: foundationTokens.radiusMd,
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: foundationTokens.popover,
    boxShadow: foundationTokens.shadowMd,
    color: foundationTokens.popoverForeground,
    marginBlockStart: '0.25rem',
    outlineStyle: 'none',
    position: 'absolute',
    zIndex: 50,
    minWidth: '12rem',
    top: '100%',
    width: 'auto',
  },
})
const MENU_ITEM_CLASS = st.c4
const MENU_LABEL_CLASS = st.c2
const MENU_SEPARATOR_CLASS = st.c3
const TRIGGER_PANEL = (
  isOpen: boolean,
  trigger: Html,
  onClose: DataGrid.Message,
  panel: Html,
  h: HtmlBuilder<DataGrid.Message>,
  align: 'start' | 'end' = 'start',
): Html =>
  h.div(
    [h.Class(className(st.c6))],
    [
      trigger,
      ...(isOpen
        ? [
            h.button([
              h.Type('button'),
              h.AriaHidden(true),
              h.Tabindex(-1),
              h.Class(className(reset.button, st.c7)),
              h.OnClick(onClose),
            ]),
            h.div(
              [
                h.Class(
                  className(
                    st.toolPanel,
                    align === 'end' ? st.panelEnd : st.panelStart,
                  ),
                ),
                h.OnKeyDownPreventDefault(key =>
                  key === 'Escape' ? Option.some(onClose) : Option.none(),
                ),
              ],
              [panel],
            ),
          ]
        : []),
    ],
  )

const columnMenuItem =
  (
    iconName: string,
    label: string,
    onClick: DataGrid.Message,
    checked: boolean,
  ): ((h: HtmlBuilder<DataGrid.Message>) => Html) =>
  (h: HtmlBuilder<DataGrid.Message>) =>
    h.button(
      [
        h.Type('button'),
        h.Role('menuitemcheckbox'),
        h.AriaChecked(checked),
        h.OnClick(onClick),
        h.Class(className(reset.button, st.menuItemL)),
      ],
      [
        h.span(
          [h.Class(className(st.icon46))],
          [icon({ name: iconName, size: 'sm' }, h)],
        ),
        label,
        ...(checked
          ? [
              h.span(
                [h.Class(className(st.checkEnd))],
                [icon({ name: 'check', size: 'sm' }, h)],
              ),
            ]
          : []),
      ],
    )

const columnMenu =
  <Row>(
    column: DataGridColumn<Row>,
    entry: { id: string; desc: boolean } | undefined,
  ): ((h: HtmlBuilder<DataGrid.Message>) => Html) =>
  (h: HtmlBuilder<DataGrid.Message>) =>
    h.div(
      [h.Class(className(st.colPanel))],
      [
        columnMenuItem(
          'chevron-up',
          'Sort asc',
          DataGrid.Message.SetSorting({ column: column.id, desc: false }),
          entry !== undefined && !entry.desc,
        )(h),
        columnMenuItem(
          'chevron-down',
          'Sort desc',
          DataGrid.Message.SetSorting({ column: column.id, desc: true }),
          entry !== undefined && entry.desc,
        )(h),
        ...(entry === undefined
          ? []
          : [
              columnMenuItem(
                'x',
                'Remove sort',
                DataGrid.Message.RemovedSort({ column: column.id }),
                false,
              )(h),
            ]),
        h.div([h.Class(className(st.c3))], []),
        h.button(
          [
            h.Type('button'),
            h.OnClick(DataGrid.Message.HidColumn({ column: column.id })),
            h.Class(className(reset.button, st.menuItemL)),
          ],
          [
            h.span(
              [h.Class(className(st.icon46))],
              [icon({ name: 'eye-off', size: 'sm' }, h)],
            ),
            'Hide column',
          ],
        ),
      ],
    )

const toolButton = (
  label: string,
  iconName: string,
  onClick: DataGrid.Message,
  h: HtmlBuilder<DataGrid.Message>,
  active = false,
): Html =>
  h.button(
    [
      h.Type('button'),
      h.AriaLabel(label),
      h.AriaPressed(String(active)),
      h.OnClick(onClick),
      h.Class(className(reset.button, st.c110, active && st.c111)),
    ],
    [
      h.span(
        [h.Class(className(st.icon35))],
        [icon({ name: iconName, size: 'sm' }, h)],
      ),
      label,
    ],
  )

const SELECT_COL_WIDTH = 48

/* ---------- cell render ---------- */

const cellContent = <Row>(
  row: Row,
  column: DataGridColumn<Row>,
  rowIndex: number,
  h: HtmlBuilder<DataGrid.Message>,
): Html | string => {
  switch (column.variant) {
    case 'number':
      return h.div([h.Class(className(st.c112))], [column.get(row)])
    case 'checkbox':
      return h.div(
        [h.Class(className(st.c113))],
        [
          h.input([
            h.Type('checkbox'),
            ...((column.getBoolean?.(row) ?? false)
              ? [h.Attribute('checked', 'true')]
              : []),
            h.Tabindex(-1),
            h.Class(className(reset.input, st.c114)),
            h.OnClick(
              DataGrid.Message.ToggledCellBoolean({
                row: rowIndex,
                column: column.id,
              }),
            ),
          ]),
        ],
      )
    case 'url':
      return h.div(
        [h.Class(className(st.urlWrap))],
        column.get(row) === ''
          ? []
          : [
              h.a(
                [
                  h.Href(column.get(row)),
                  h.Target('_blank'),
                  h.Attribute('rel', 'noopener noreferrer'),
                  h.Tabindex(-1),
                  h.Class(className(st.urlLink)),
                ],
                [column.get(row)],
              ),
            ],
      )
    case 'select':
      return h.div(
        [h.Class(className(st.selWrap))],
        [h.span([h.Class(className(st.selBadge))], [column.get(row)])],
      )
    case 'multi-select':
      return h.div(
        [h.Class(className(st.c115))],
        (column.getOptions?.(row) ?? []).map(skill =>
          h.span([h.Class(className(st.c116))], [skill]),
        ),
      )
    case 'file':
      return h.div(
        [h.Class(className(st.c115))],
        (column.getFiles?.(row) ?? []).map(file =>
          h.span(
            [h.Class(className(st.c117))],
            [
              h.span(
                [h.Class(className(st.icon36))],
                [icon({ name: 'paperclip', size: 'sm' }, h)],
              ),
              file.name,
            ],
          ),
        ),
      )
    case 'long-text':
      return h.div(
        [h.Class(className(st.c118))],
        [h.span([h.Class(className(st.c119))], [column.get(row)])],
      )
    default:
      return h.div([h.Class(className(st.c120))], [column.get(row)])
  }
}

/* ---------- cell editors ---------- */

const EDITOR_SCRIM = (
  onClose: DataGrid.Message,
  h: HtmlBuilder<DataGrid.Message>,
): Html =>
  h.button([
    h.Type('button'),
    h.AriaHidden(true),
    h.Tabindex(-1),
    h.Class(className(reset.button, st.editorScrim)),
    h.OnClick(onClose),
  ])

const textInputEditor = (
  model: DataGrid.Model,
  h: HtmlBuilder<DataGrid.Message>,
): Html =>
  h.input([
    h.Type('text'),
    h.Value(model.draftValue),
    h.OnInput(value => DataGrid.Message.ChangedDraft({ value })),
    h.Class(className(reset.input, st.c157)),
    h.OnMount(
      DataGrid.gridEditorFocusMount(() =>
        DataGrid.Message.CompletedEditorFocus({}),
      ),
    ),
  ])

const numberInputEditor = <Row>(
  model: DataGrid.Model,
  column: DataGridColumn<Row>,
  h: HtmlBuilder<DataGrid.Message>,
): Html =>
  h.input([
    h.Type('number'),
    ...(column.numberMin === undefined
      ? []
      : [h.Min(String(column.numberMin))]),
    ...(column.numberMax === undefined
      ? []
      : [h.Max(String(column.numberMax))]),
    ...(column.numberStep === undefined
      ? []
      : [h.Step(String(column.numberStep))]),
    h.Value(model.draftValue),
    h.OnInput(value => DataGrid.Message.ChangedDraft({ value })),
    h.Class(className(reset.input, st.c157, st.numberEditor)),
    h.OnMount(
      DataGrid.gridEditorFocusMount(() =>
        DataGrid.Message.CompletedEditorFocus({}),
      ),
    ),
  ])

const cellEditor = <Row>(
  model: DataGrid.Model,
  row: Row,
  column: DataGridColumn<Row>,
  rowIndex: number,
  h: HtmlBuilder<DataGrid.Message>,
): Html => {
  switch (column.variant) {
    case 'number':
      return numberInputEditor(model, column, h)
    case 'long-text':
      return h.div(
        [h.Class(className(st.contents))],
        [
          EDITOR_SCRIM(DataGrid.Message.CommittedDraft({ move: 'none' }), h),
          h.div(
            [
              h.Class(className(st.editorPopup, st.longTextPopup)),
              h.OnMount(
                DataGrid.cellEditorPopupFitMount(() =>
                  DataGrid.Message.CompletedEditorFocus({}),
                ),
              ),
            ],
            [
              h.textarea([
                h.Attribute('placeholder', 'Enter text...'),
                h.Value(model.draftValue),
                h.OnInput(value => DataGrid.Message.ChangedDraft({ value })),
                h.Class(className(reset.input, st.longTextArea)),
                h.OnMount(
                  DataGrid.gridEditorFocusMount(() =>
                    DataGrid.Message.CompletedEditorFocus({}),
                  ),
                ),
              ]),
            ],
          ),
        ],
      )
    case 'select':
      return h.div(
        [h.Class(className(st.contents))],
        [
          EDITOR_SCRIM(DataGrid.Message.CanceledEdit({}), h),
          h.div(
            [
              h.Class(className(st.editorPopup, st.selectPopup)),
              h.OnMount(
                DataGrid.cellEditorPopupFitMount(() =>
                  DataGrid.Message.CompletedEditorFocus({}),
                ),
              ),
            ],
            (column.options ?? []).map(option =>
              h.button(
                [
                  h.Type('button'),
                  h.Role('option'),
                  h.AriaSelected(option === column.get(row)),
                  h.OnClick(
                    DataGrid.Message.AppliedCellOption({
                      row: rowIndex,
                      column: column.id,
                      value: option,
                    }),
                  ),
                  h.Class(className(reset.button, st.selectOption)),
                ],
                [
                  h.span([], [option]),
                  ...(option === column.get(row)
                    ? [
                        Icon.icon(
                          'check',
                          {
                            class: className(st.selectCheck),
                          },
                          h,
                        ),
                      ]
                    : []),
                ],
              ),
            ),
          ),
        ],
      )
    case 'multi-select': {
      const selected = column.getOptions?.(row) ?? []
      const query = model.draftValue.toLowerCase()
      const options = (column.options ?? []).filter(option =>
        option.toLowerCase().includes(query),
      )
      return h.div(
        [h.Class(className(st.contents))],
        [
          EDITOR_SCRIM(DataGrid.Message.CanceledEdit({}), h),
          h.div(
            [
              h.Class(className(st.editorPopup, st.multiPopup)),
              h.OnMount(
                DataGrid.cellEditorPopupFitMount(() =>
                  DataGrid.Message.CompletedEditorFocus({}),
                ),
              ),
            ],
            [
              h.div(
                [h.Class(className(st.multiHeader))],
                [
                  ...selected.map(skill =>
                    h.span(
                      [h.Class(className(st.multiBadge))],
                      [
                        skill,
                        h.button(
                          [
                            h.Type('button'),
                            h.AriaLabel(`Remove ${skill}`),
                            h.OnClick(
                              DataGrid.Message.ToggledCellOption({
                                row: rowIndex,
                                column: column.id,
                                option: skill,
                              }),
                            ),
                            h.Class(className(reset.button)),
                          ],
                          [
                            Icon.icon(
                              'x',
                              {
                                class: className(st.iconXs),
                              },
                              h,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  h.input([
                    h.Type('text'),
                    h.Value(model.draftValue),
                    h.Attribute('placeholder', 'Search...'),
                    h.OnInput(value =>
                      DataGrid.Message.ChangedDraft({ value }),
                    ),
                    h.Class(className(reset.input, st.multiSearch)),
                    h.OnMount(
                      DataGrid.gridEditorFocusMount(() =>
                        DataGrid.Message.CompletedEditorFocus({}),
                      ),
                    ),
                  ]),
                ],
              ),
              h.div(
                [h.Class(className(st.multiList))],
                options.length === 0
                  ? [
                      h.div(
                        [h.Class(className(st.multiEmpty))],
                        ['No options found.'],
                      ),
                    ]
                  : options.map(option => {
                      const checked = selected.includes(option)
                      return h.button(
                        [
                          h.Type('button'),
                          h.OnClick(
                            DataGrid.Message.ToggledCellOption({
                              row: rowIndex,
                              column: column.id,
                              option,
                            }),
                          ),
                          h.Class(className(reset.button, st.multiOption)),
                        ],
                        [
                          h.span(
                            [
                              h.Class(
                                className(
                                  st.multiBox,
                                  checked && st.multiBoxChecked,
                                ),
                              ),
                            ],
                            checked
                              ? [
                                  Icon.icon(
                                    'check',
                                    {
                                      class: className(st.iconXs),
                                    },
                                    h,
                                  ),
                                ]
                              : [],
                          ),
                          h.span([], [option]),
                        ],
                      )
                    }),
              ),
              ...(selected.length > 0
                ? [
                    h.div(
                      [h.Class(className(st.multiFooter))],
                      [
                        h.button(
                          [
                            h.Type('button'),
                            h.OnClick(
                              DataGrid.Message.ClearedCellOptions({
                                row: rowIndex,
                                column: column.id,
                              }),
                            ),
                            h.Class(className(reset.button, st.multiClear)),
                          ],
                          ['Clear all'],
                        ),
                      ],
                    ),
                  ]
                : []),
            ],
          ),
        ],
      )
    }
    case 'date':
      return h.div(
        [h.Class(className(st.contents))],
        [
          EDITOR_SCRIM(DataGrid.Message.CanceledEdit({}), h),
          h.div(
            [
              h.Class(className(st.editorPopup, st.datePopup)),
              h.OnMount(
                DataGrid.cellEditorPopupFitMount(() =>
                  DataGrid.Message.CompletedEditorFocus({}),
                ),
              ),
            ],
            [
              Calendar.calendar(
                {
                  model: model.cellCalendar,
                  maybeSelectedDate: dateFromISO(column.get(row)),
                  toParentMessage: message =>
                    DataGrid.Message.GotCellCalendarMessage({ message }),
                  captionLayout: 'dropdown',
                  direction: model.direction,
                },
                h,
              ),
            ],
          ),
        ],
      )
    case 'file': {
      const files = column.getFiles?.(row) ?? []
      return h.div(
        [h.Class(className(st.contents))],
        [
          EDITOR_SCRIM(DataGrid.Message.CanceledEdit({}), h),
          h.div(
            [
              h.Class(className(st.editorPopup, st.filePopup)),
              h.OnMount(
                DataGrid.cellEditorPopupFitMount(() =>
                  DataGrid.Message.CompletedEditorFocus({}),
                ),
              ),
            ],
            [
              ...files.map(file =>
                h.div(
                  [h.Class(className(st.fileRow))],
                  [
                    Icon.icon(
                      'paperclip',
                      {
                        class: className(st.fileIcon),
                      },
                      h,
                    ),
                    h.span([h.Class(className(st.fileName))], [file.name]),
                    h.span(
                      [h.Class(className(st.fileSize))],
                      [formatFileSize(file.size)],
                    ),
                    h.button(
                      [
                        h.Type('button'),
                        h.AriaLabel(`Remove ${file.name}`),
                        h.OnClick(
                          DataGrid.Message.RemovedCellFile({
                            row: rowIndex,
                            column: column.id,
                            fileId: file.id,
                          }),
                        ),
                        h.Class(className(reset.button, st.fileRemove)),
                      ],
                      [Icon.icon('x', { class: className(st.iconXs) }, h)],
                    ),
                  ],
                ),
              ),
              h.label(
                [h.Class(className(st.fileDrop))],
                [
                  h.input([
                    h.Type('file'),
                    h.Attribute('multiple', ''),
                    h.Class(className(st.hidden)),
                    h.OnMount(
                      DataGrid.cellFilePickerMount(mount =>
                        mount._tag === 'FilesPicked'
                          ? DataGrid.Message.PickedCellFiles({
                              files: mount.files,
                            })
                          : DataGrid.Message.CanceledEdit({}),
                      ),
                    ),
                  ]),
                  Icon.icon(
                    'upload',
                    {
                      class: className(st.fileIcon),
                    },
                    h,
                  ),
                  'Click to upload files',
                  h.span(
                    [h.Class(className(st.fileHint))],
                    ['Max 5 files, 10MB each'],
                  ),
                ],
              ),
            ],
          ),
        ],
      )
    }
    default:
      return textInputEditor(model, h)
  }
}

const formatFileSize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(Math.round(bytes / 1024), 1)} KB`

/* ---------- toolbar ---------- */

const toolbarButtonPanel = (
  model: DataGrid.Model,
  panelId: string,
  label: string,
  iconName: string,
  panel: Html,
  h: HtmlBuilder<DataGrid.Message>,
  align: 'start' | 'end' = 'start',
): Html => {
  const isOpen = model.openPanel === panelId
  return TRIGGER_PANEL(
    isOpen,
    h.button(
      [
        h.Type('button'),
        h.AriaLabel(label),
        h.AriaHasPopup('menu'),
        h.AriaExpanded(isOpen),
        h.OnClick(DataGrid.Message.SetPanel({ panel: panelId })),
        h.Class(className(reset.button, st.c121, isOpen && st.c111)),
      ],
      [
        h.span(
          [h.Class(className(st.icon37))],
          [icon({ name: iconName, size: 'sm' }, h)],
        ),
        label,
      ],
    ),
    DataGrid.Message.SetPanel({ panel: '' }),
    panel,
    h as HtmlBuilder<DataGrid.Message>,
    align,
  )
}

const gridToolbar = <Row>(
  model: DataGrid.Model,
  config: DataGridConfig<Row>,
  h: HtmlBuilder<DataGrid.Message>,
): Html =>
  h.div(
    [h.Class(className(st.c122))],
    [
      toolButton(
        model.direction === 'ltr' ? 'LTR' : 'RTL',
        'languages',
        DataGrid.Message.SetDirection({
          direction: model.direction === 'ltr' ? 'rtl' : 'ltr',
        }),
        h as HtmlBuilder<DataGrid.Message>,
      ),
      toolbarButtonPanel(
        model,
        'filter',
        'Filter',
        'funnel',
        h.div(
          [h.Class(className(st.c123))],
          [
            h.div([h.Class(className(st.c42))], ['Filter']),
            ...config.columns.map(column =>
              h.div(
                [h.Class(className(st.c124))],
                [
                  h.span([h.Class(className(st.c125))], [column.header]),
                  h.input([
                    h.Type('text'),
                    h.Class(className(reset.input, st.c126)),
                    h.Value(
                      model.filters.find(f => f.column === column.id)?.value ??
                        '',
                    ),
                    h.OnInput(value =>
                      value === ''
                        ? DataGrid.Message.RemovedFilter({ column: column.id })
                        : DataGrid.Message.AddedFilter({
                            column: column.id,
                            value,
                          }),
                    ),
                  ]),
                ],
              ),
            ),
          ],
        ),
        h,
      ),
      toolbarButtonPanel(
        model,
        'sort',
        'Sort',
        'arrow-down-up',
        h.div(
          [],
          [
            h.div([h.Class(className(MENU_LABEL_CLASS))], ['Sort by']),
            ...config.columns.map(column => {
              const entry = model.sorting.find(s => s.id === column.id)
              return h.button(
                [
                  h.Type('button'),
                  h.OnClick(
                    DataGrid.Message.ToggledSort({ column: column.id }),
                  ),
                  h.Class(className(reset.button, MENU_ITEM_CLASS, st.c15)),
                ],
                [
                  h.span(
                    [h.Class(className(st.icon38))],
                    [icon({ name: column.iconName, size: 'sm' }, h)],
                  ),
                  column.header,
                  h.span(
                    [h.Class(className(st.c127))],
                    [entry === undefined ? '' : entry.desc ? '↓' : '↑'],
                  ),
                ],
              )
            }),
            ...(model.sorting.length > 0
              ? [
                  h.div([h.Class(className(MENU_SEPARATOR_CLASS))], []),
                  h.button(
                    [
                      h.Type('button'),
                      h.OnClick(
                        DataGrid.Message.SetSorting({
                          column: '',
                          desc: false,
                        }),
                      ),
                      h.Class(
                        className(reset.button, MENU_ITEM_CLASS, st.c128),
                      ),
                    ],
                    ['Clear sorting'],
                  ),
                ]
              : []),
          ],
        ),
        h,
      ),
      toolbarButtonPanel(
        model,
        'height',
        capitalize(model.rowHeight),
        'rows-3',
        h.div(
          [],
          [
            h.div([h.Class(className(MENU_LABEL_CLASS))], ['Row height']),
            ...DataGrid.ROW_HEIGHTS.map(entry =>
              h.button(
                [
                  h.Type('button'),
                  h.AriaChecked(model.rowHeight === entry.id),
                  h.OnClick(
                    DataGrid.Message.SetRowHeight({ height: entry.id }),
                  ),
                  h.Class(className(reset.button, MENU_ITEM_CLASS, st.c15)),
                ],
                [
                  ...(model.rowHeight === entry.id
                    ? [
                        h.span(
                          [h.Class(className(st.icon39))],
                          [icon({ name: 'check', size: 'sm' }, h)],
                        ),
                      ]
                    : []),
                  h.span([], [entry.label]),
                ],
              ),
            ),
          ],
        ),
        h,
        'end',
      ),
      toolbarButtonPanel(
        model,
        'view',
        'View',
        'eye',
        h.div(
          [],
          [
            h.div([h.Class(className(MENU_LABEL_CLASS))], ['Toggle columns']),
            h.div([h.Class(className(MENU_SEPARATOR_CLASS))], []),
            ...config.columns.map(column =>
              h.button(
                [
                  h.Type('button'),
                  h.Role('menuitemcheckbox'),
                  h.AriaChecked(!model.hiddenColumnIds.includes(column.id)),
                  h.OnClick(
                    DataGrid.Message.ToggledColumnHidden({ column: column.id }),
                  ),
                  h.Class(className(reset.button, MENU_ITEM_CLASS, st.c15)),
                ],
                [
                  h.span(
                    [h.Class(className(st.c129))],
                    [
                      !model.hiddenColumnIds.includes(column.id)
                        ? h.span(
                            [h.Class(className(st.icon40))],
                            [icon({ name: 'check', size: 'sm' }, h)],
                          )
                        : h.empty,
                    ],
                  ),
                  column.header,
                ],
              ),
            ),
          ],
        ),
        h,
        'end',
      ),
    ],
  )

const visibleCols = <Row>(
  model: DataGrid.Model,
  config: DataGridConfig<Row>,
): Array<DataGridColumn<Row>> => DataGrid.visibleColumnDefs(model, config)

const capitalize = (value: string): string =>
  value === '' ? value : value[0]!.toUpperCase() + value.slice(1)

/* ---------- search overlay ---------- */

const searchOverlay = <Row>(
  model: DataGrid.Model,
  config: DataGridConfig<Row>,
  h: HtmlBuilder<DataGrid.Message>,
): Html => {
  if (!model.searchOpen) return h.empty
  const matches = DataGrid.searchMatches(model, config)
  return h.div(
    [h.DataAttribute('slot', 'grid-search'), h.Class(className(st.c130))],
    [
      h.span(
        [h.Class(className(st.icon41))],
        [icon({ name: 'search', size: 'sm' }, h)],
      ),
      h.input([
        h.Type('text'),
        h.Placeholder('Search…'),
        h.Value(model.searchQuery),
        h.OnInput(value => DataGrid.Message.ChangedSearchQuery({ value })),
        h.Class(className(reset.input, st.c131)),
      ]),
      h.span(
        [h.Class(className(st.c132))],
        [
          matches.length === 0
            ? '0/0'
            : `${String(model.matchIndex + 1)}/${String(matches.length)}`,
        ],
      ),
      h.button(
        [
          h.Type('button'),
          h.AriaLabel('Previous match'),
          h.OnClick(DataGrid.Message.NavigatedMatch({ direction: 'prev' })),
          h.Class(className(reset.button, st.c133)),
        ],
        [
          h.span(
            [h.Class(className(st.icon42))],
            [icon({ name: 'chevron-up', size: 'sm' }, h)],
          ),
        ],
      ),
      h.button(
        [
          h.Type('button'),
          h.AriaLabel('Next match'),
          h.OnClick(DataGrid.Message.NavigatedMatch({ direction: 'next' })),
          h.Class(className(reset.button, st.c133)),
        ],
        [
          h.span(
            [h.Class(className(st.icon43))],
            [icon({ name: 'chevron-down', size: 'sm' }, h)],
          ),
        ],
      ),
      h.button(
        [
          h.Type('button'),
          h.AriaLabel('Close search'),
          h.OnClick(DataGrid.Message.ToggledSearch({})),
          h.Class(className(reset.button, st.c133)),
        ],
        [
          h.span(
            [h.Class(className(st.icon44))],
            [icon({ name: 'x', size: 'sm' }, h)],
          ),
        ],
      ),
    ],
  )
}

/* ---------- context menu ---------- */

const contextMenu = (
  model: DataGrid.Model,
  h: HtmlBuilder<DataGrid.Message>,
): Html => {
  if (!model.contextMenu.open) return h.empty
  const item = (label: string, action: string, iconName?: string): Html =>
    h.button(
      [
        h.Type('button'),
        h.Role('menuitem'),
        h.OnClick(DataGrid.Message.AppliedContextAction({ action })),
        h.Class(
          className(
            reset.button,
            MENU_ITEM_CLASS,
            iconName === undefined ? st.c15 : st.c15,
          ),
        ),
      ],
      [
        ...(iconName === undefined
          ? []
          : [
              h.span(
                [h.Class(className(st.icon45))],
                [icon({ name: iconName, size: 'sm' }, h)],
              ),
            ]),
        label,
      ],
    )
  return h.div(
    [],
    [
      h.button([
        h.Type('button'),
        h.AriaHidden(true),
        h.Tabindex(-1),
        h.Class(className(reset.button, st.c7)),
        h.OnClick(DataGrid.Message.ClosedContextMenu({})),
        h.OnContextMenu(DataGrid.Message.ClosedContextMenu({})),
      ]),
      h.div(
        [
          h.Role('menu'),
          h.DataAttribute('slot', 'grid-context-menu'),
          h.Class(className(st.c134)),
          h.Style({
            left: `${String(model.contextMenu.x)}px`,
            top: `${String(model.contextMenu.y)}px`,
          }),
        ],
        [
          item('Copy', 'copy', 'clipboard-copy'),
          item('Cut', 'cut', 'scissors'),
          item('Paste', 'paste', 'clipboard-paste'),
          h.div([h.Class(className(MENU_SEPARATOR_CLASS))], []),
          item('Add row above', 'add-row-above', 'arrow-up-to-line'),
          item('Add row below', 'add-row-below', 'arrow-down-to-line'),
          h.div([h.Class(className(MENU_SEPARATOR_CLASS))], []),
          item('Clear cell', 'clear-cell', 'eraser'),
          item('Delete row', 'delete-row', 'trash-2'),
        ],
      ),
    ],
  )
}

/* ---------- grid ---------- */

/* reference: height = max(400, window.innerHeight - 150) */
const viewportHeightPx = (model: DataGrid.Model): number =>
  Math.max(400, model.viewportHeight - 150)
const OVERSCAN = 5

export const dataGrid = <Row>(
  props: Readonly<{
    model: DataGrid.Model
    config: DataGridConfig<Row>
  }>,
  h: HtmlBuilder<DataGrid.Message>,
): Html => {
  const model = props.model
  const config = props.config
  const people = DataGrid.sortedRows(
    DataGrid.filteredRows(model, config),
    model.sorting,
    config,
  )
  const columns = visibleCols(model, config)
  const rowH = DataGrid.rowHeightPx(model.rowHeight)
  const totalHeight = people.length * rowH
  const viewHeight = viewportHeightPx(model)
  const startIndex = Math.max(0, Math.floor(model.scrollTop / rowH) - OVERSCAN)
  const endIndex = Math.min(
    people.length,
    Math.ceil((model.scrollTop + viewHeight) / rowH) + OVERSCAN,
  )
  const gridWidth = columns.reduce((acc, c) => acc + c.width, SELECT_COL_WIDTH)
  const isSelected = (row: number, column: string): boolean =>
    model.selectionAnchor.row !== -1 &&
    row >= Math.min(model.selectionAnchor.row, model.selectionEnd.row) &&
    row <= Math.max(model.selectionAnchor.row, model.selectionEnd.row) &&
    columns
      .slice(
        Math.min(
          columns.findIndex(c => c.id === model.selectionAnchor.column),
          columns.findIndex(c => c.id === model.selectionEnd.column),
        ),
        Math.max(
          columns.findIndex(c => c.id === model.selectionAnchor.column),
          columns.findIndex(c => c.id === model.selectionEnd.column),
        ) + 1,
      )
      .some(c => c.id === column)

  return h.div(
    [
      h.DataAttribute('slot', 'grid-wrapper'),
      h.Dir(model.direction),
      h.Class(className(st.c135)),
    ],
    [
      searchOverlay(model, config, h),
      contextMenu(model, h),
      gridToolbar(model, config, h),
      h.div(
        [
          h.Role('grid'),
          h.AriaLabel('Data grid'),
          h.DataAttribute('slot', 'grid'),
          h.Tabindex(0),
          h.Class(className(st.c136)),
          /* mount on the scroller: scroll events don't bubble, and toolbar
             inputs outside it can't leak ctrl/meta combos into grid keys */
          h.OnMount(
            DataGrid.gridKeysMount(mount => {
              if (mount._tag === 'GridKeydown')
                return DataGrid.Message.GridKey({
                  key: mount.key,
                  ctrl: mount.ctrl,
                  shift: mount.shift,
                  meta: mount.meta,
                })
              if (mount._tag === 'GridContextMenu')
                return DataGrid.Message.OpenedContextMenu({
                  x: mount.x,
                  y: mount.y,
                  row: mount.row,
                  column: mount.column,
                })
              if (mount._tag === 'GridViewportHeight')
                return DataGrid.Message.SetViewportHeight({
                  height: mount.height,
                })
              return DataGrid.Message.Scrolled({ scrollTop: mount.scrollTop })
            }),
          ),
        ],
        [
          /* header */
          h.div(
            [
              h.Role('rowgroup'),
              h.DataAttribute('slot', 'grid-header'),
              h.Class(className(st.c137)),
            ],
            [
              h.div(
                [
                  h.Role('row'),
                  h.DataAttribute('slot', 'grid-header-row'),
                  h.Tabindex(-1),
                  h.Class(className(st.c138)),
                  h.Style({ width: `${String(gridWidth)}px` }),
                ],
                [
                  h.div(
                    [
                      h.Role('columnheader'),
                      h.DataAttribute('slot', 'grid-header-cell'),
                      h.Class(className(st.c139)),
                      h.Style({ width: `${String(SELECT_COL_WIDTH)}px` }),
                    ],
                    [
                      h.input([
                        h.Type('checkbox'),
                        h.AriaLabel('Select all'),
                        h.Tabindex(-1),
                        ...(model.selectedRowIndexes.length === people.length &&
                        people.length > 0
                          ? [h.Attribute('checked', 'true')]
                          : []),
                        h.Class(className(reset.input, st.c140)),
                        h.OnClick(
                          DataGrid.Message.ToggledAllRows({
                            checked:
                              model.selectedRowIndexes.length !== people.length,
                          }),
                        ),
                      ]),
                    ],
                  ),
                  ...columns.map(column => {
                    const entry = model.sorting.find(s => s.id === column.id)
                    const panelId = `column-${column.id}`
                    const isOpen = model.openPanel === panelId
                    return h.div(
                      [
                        h.Role('columnheader'),
                        h.DataAttribute('slot', 'grid-header-cell'),
                        h.DataAttribute('column-id', column.id),
                        h.Tabindex(-1),
                        h.Class(className(st.c141)),
                        h.Style({ width: `${String(column.width)}px` }),
                      ],
                      [
                        h.button(
                          [
                            h.Type('button'),
                            h.Tabindex(-1),
                            h.AriaHasPopup('menu'),
                            h.AriaExpanded(isOpen),
                            h.OnClick(
                              DataGrid.Message.SetPanel({ panel: panelId }),
                            ),
                            h.Class(className(reset.button, st.c142)),
                          ],
                          [
                            h.span(
                              [h.Class(className(st.icon46))],
                              [icon({ name: column.iconName, size: 'sm' }, h)],
                            ),
                            h.span(
                              [h.Class(className(st.colHeadText))],
                              [column.header],
                            ),
                            ...(entry === undefined
                              ? []
                              : [
                                  h.span(
                                    [h.Class(className(st.icon47))],
                                    [
                                      icon(
                                        {
                                          name: entry.desc
                                            ? 'chevron-down'
                                            : 'chevron-up',
                                          size: 'sm',
                                        },
                                        h,
                                      ),
                                    ],
                                  ),
                                ]),
                            h.span(
                              [h.Class(className(st.chevEnd))],
                              [icon({ name: 'chevron-down', size: 'sm' }, h)],
                            ),
                          ],
                        ),
                        ...(isOpen
                          ? [
                              h.button([
                                h.Type('button'),
                                h.AriaHidden(true),
                                h.Tabindex(-1),
                                h.Class(className(reset.button, st.c7)),
                                h.OnClick(
                                  DataGrid.Message.SetPanel({ panel: '' }),
                                ),
                              ]),
                              columnMenu(column, entry)(h),
                            ]
                          : []),
                      ],
                    )
                  }),
                ],
              ),
            ],
          ),
          /* body */
          h.div(
            [
              h.Role('rowgroup'),
              h.DataAttribute('slot', 'grid-body'),
              h.Class(className(st.c143)),
              h.Style({
                height: `${String(totalHeight)}px`,
                width: `${String(gridWidth)}px`,
              }),
            ],
            people.slice(startIndex, endIndex).map((person, offset) => {
              const rowIndex = startIndex + offset
              const isRowSelected = model.selectedRowIndexes.includes(rowIndex)
              return h.div(
                [
                  h.Role('row'),
                  h.AriaRowindex(rowIndex + 1),
                  h.AriaSelected(isRowSelected),
                  h.DataAttribute('slot', 'grid-row'),
                  h.DataAttribute(
                    'state',
                    isRowSelected ? 'selected' : 'unselected',
                  ),
                  h.Class(className(st.c144)),
                  h.Style({
                    top: `${String(rowIndex * rowH)}px`,
                    height: `${String(rowH)}px`,
                  }),
                ],
                [
                  /* row marker / select cell */
                  h.div(
                    [
                      h.Role('gridcell'),
                      h.DataAttribute('slot', 'grid-cell'),
                      h.Class(className(st.c145, isRowSelected && st.c146)),
                      h.Style({ width: `${String(SELECT_COL_WIDTH)}px` }),
                      h.OnClick(
                        DataGrid.Message.SelectedRowIndex({
                          index: rowIndex,
                          shiftKey: false,
                          additive: false,
                        }),
                      ),
                    ],
                    [
                      h.span(
                        [
                          h.Class(
                            className(
                              st.c147,
                              st.c148,
                              isRowSelected && st.c149,
                            ),
                          ),
                        ],
                        [String(rowIndex + 1)],
                      ),
                      h.input([
                        h.Type('checkbox'),
                        h.AriaLabel(`Select row ${String(rowIndex + 1)}`),
                        h.Tabindex(-1),
                        ...(isRowSelected
                          ? [h.Attribute('checked', 'true')]
                          : []),
                        h.Class(
                          className(
                            reset.input,
                            st.c150,
                            st.c151,
                            isRowSelected && st.c152,
                          ),
                        ),
                        h.OnClick(
                          DataGrid.Message.SelectedRowIndex({
                            index: rowIndex,
                            shiftKey: false,
                            additive: true,
                          }),
                        ),
                      ]),
                    ],
                  ),
                  /* data cells */
                  ...columns.map(column => {
                    const isFocused =
                      model.focusedCell.row === rowIndex &&
                      model.focusedCell.column === column.id
                    const isEditing =
                      model.editingCell.row === rowIndex &&
                      model.editingCell.column === column.id
                    const inSelection = isSelected(rowIndex, column.id)
                    return h.div(
                      [
                        h.Role('gridcell'),
                        h.DataAttribute('slot', 'grid-cell'),
                        h.DataAttribute('row-index', String(rowIndex)),
                        h.DataAttribute('column-id', column.id),
                        h.AriaSelected(inSelection || isFocused),
                        h.Class(
                          className(
                            st.c153,
                            inSelection && st.c154,
                            isFocused && st.c155,
                            isRowSelected && st.c156,
                          ),
                        ),
                        h.Style({ width: `${String(column.width)}px` }),
                        h.OnMouseDown(
                          DataGrid.Message.FocusedCell({
                            row: rowIndex,
                            column: column.id,
                          }),
                        ),
                        h.OnDoubleClick(
                          DataGrid.Message.StartedEditing({
                            row: rowIndex,
                            column: column.id,
                            seed: '',
                          }),
                        ),
                      ],
                      [
                        isEditing
                          ? cellEditor(model, person, column, rowIndex, h)
                          : cellContent(person, column, rowIndex, h),
                      ],
                    )
                  }),
                ],
              )
            }),
          ),
          /* footer — add row */
          h.div(
            [
              h.Role('rowgroup'),
              h.DataAttribute('slot', 'grid-footer'),
              h.Class(className(st.c158)),
            ],
            [
              h.div(
                [
                  h.Role('row'),
                  h.DataAttribute('slot', 'grid-add-row'),
                  h.Class(className(st.c138)),
                ],
                [
                  h.button(
                    [
                      h.Type('button'),
                      h.OnClick(DataGrid.Message.AddedRow({})),
                      h.Class(className(reset.button, st.c159)),
                    ],
                    [
                      h.div(
                        [h.Class(className(st.c160))],
                        [
                          h.span(
                            [h.Class(className(st.icon48))],
                            [icon({ name: 'plus', size: 'sm' }, h)],
                          ),
                          h.span([h.Class(className(st.c161))], ['Add row']),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
