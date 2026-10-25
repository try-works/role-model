import { reset } from '@/stylex/reset'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ComponentLayoutStyle } from './contracts'
import { foundationTokens } from './foundations-tokens.stylex'
import { className } from './style'
import { tokens } from './tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
const styles = stylex.create({
  root: { alignItems: 'center', display: 'inline-flex', position: 'relative' },
  input: {
    inset: 0,
    cursor: interactionTokens.cursorText,
    opacity: 0,
    position: 'absolute',
    zIndex: 10,
    height: '100%',
    width: '100%',
  },
  group: { alignItems: 'center', display: 'flex', pointerEvents: 'none' },
  slot: {
    borderColor: {
      default: tokens.input,
      ':is([data-active])': tokens.ring,
    },
    borderStyle: 'solid',
    alignItems: 'center',
    boxShadow: {
      default: foundationTokens.shadowXs,
      ':is([data-active])': tokens.focusRingShadow,
    },
    display: 'flex',
    fontSize: '0.875rem',
    justifyContent: 'center',
    lineHeight: '1.25rem',
    position: 'relative',
    zIndex: { default: null, ':is([data-active])': 10 },
    borderBottomLeftRadius: {
      default: 0,
      ':first-child': foundationTokens.radiusMd,
    },
    borderBottomRightRadius: {
      default: 0,
      ':last-child': foundationTokens.radiusMd,
    },
    borderBottomWidth: 1,
    borderLeftWidth: { default: 0, ':first-child': 1 },
    borderRightWidth: 1,
    borderTopLeftRadius: {
      default: 0,
      ':first-child': foundationTokens.radiusMd,
    },
    borderTopRightRadius: {
      default: 0,
      ':last-child': foundationTokens.radiusMd,
    },
    borderTopWidth: 1,
    height: '2.25rem',
    width: '2.25rem',
  },
  lg: {
    fontSize: '1.25rem',
    lineHeight: '1.75rem',
    height: '3rem',
    width: '2.75rem',
  },
  caretWrap: {
    inset: 0,
    alignItems: 'center',
    display: 'none',
    justifyContent: 'center',
    pointerEvents: 'none',
    position: 'absolute',
  },
  caret: {
    animationDuration: {
      default: interactionTokens.motionLoopFast,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    animationIterationCount: 'infinite',
    animationName: stylex.keyframes({
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0 },
    }),
    backgroundColor: tokens.foreground,
    height: '1rem',
    width: '1px',
  },
  contents: { display: 'contents' },
  separator: { color: tokens.mutedForeground, paddingInline: '0.5rem' },
})
export type InputOtpProps<Msg> = Readonly<{
  id: string
  value: string
  onInput: (value: string) => Msg
  length?: number
  name?: string
  ariaLabel?: string
  isDisabled?: boolean
  isInvalid?: boolean
  isRequired?: boolean
  layoutStyle?: ComponentLayoutStyle
  groupLayoutStyle?: ComponentLayoutStyle
  pattern?: RegExp
  inputMode?:
    | 'numeric'
    | 'text'
    | 'tel'
    | 'decimal'
    | 'email'
    | 'url'
    | 'search'
  slotLayoutStyle?: ComponentLayoutStyle
  slotSize?: 'lg'
  separator?: (index: number) => Html
}>
const normalize = (value: string, length: number, pattern: RegExp): string =>
  Array.from(value)
    .filter(character => {
      pattern.lastIndex = 0
      return pattern.test(character)
    })
    .slice(0, length)
    .join('')

/* Selection state lives in the DOM, not the model: foldkit cannot read the
   input's selectionStart/End, so these inline handlers mirror the real
   selection onto the slots — data-active='caret' on the cell holding the
   caret, 'selected' on every cell inside a range — and show that cell's
   caret wrap. Never render data-active from the model or re-renders would
   desync it. */
const syncActive = (ref: string): string =>
  `const s=${ref}.selectionStart,e=${ref}.selectionEnd;` +
  `${ref}.parentElement.querySelectorAll('[data-slot="input-otp-slot"]')` +
  '.forEach((d,i)=>{' +
  "const a=s===e?i===s?'caret':'':i>=s&&i<e?'selected':'';" +
  "a?d.setAttribute('data-active',a):d.removeAttribute('data-active');" +
  "d.lastElementChild.style.display=a==='caret'?'flex':''})"

const SYNC_ACTIVE = syncActive('this')

/* Select the next filled digit after an insertion so continued typing
   replaces it even when the code is already at maxlength. Deletions retain
   their native caret position so the removed character can be re-entered. */
const ADVANCE_SELECTION =
  'if(!event.isComposing&&event.inputType?.startsWith("insert")&&' +
  'this.selectionStart===this.selectionEnd&&this.selectionStart<this.value.length){' +
  'const s=this.selectionStart;this.setSelectionRange(s,s+1)}' +
  SYNC_ACTIVE

/* focus can fire before the browser settles the caret position, so the
   mirror runs one frame later. */
const FOCUS_ACTIVE = `const t=this;requestAnimationFrame(()=>{${syncActive('t')}})`

const CLEAR_ACTIVE =
  'this.parentElement.querySelectorAll(\'[data-slot="input-otp-slot"]\')' +
  ".forEach(d=>{d.removeAttribute('data-active');" +
  "d.lastElementChild.style.display=''})"

/* A click lands on the covering input, so map its x position back to the
   slot beneath it: select that character so typing overwrites it directly,
   or collapse the caret at the end of the value past the filled cells. A
   drag that already formed a range is kept. Defer the mapping until the
   browser has settled the native mouseup selection. */
const SNAP_TO_SLOT =
  'const t=this,x=event.clientX;requestAnimationFrame(()=>{' +
  'if(t.selectionStart===t.selectionEnd){' +
  'const ds=t.parentElement.querySelectorAll(\'[data-slot="input-otp-slot"]\'),' +
  'v=t.value.length;let i=v;' +
  'ds.forEach((d,j)=>{const r=d.getBoundingClientRect();' +
  'if(x>=r.left&&x<r.right)i=j});' +
  'i<v?t.setSelectionRange(i,i+1):t.setSelectionRange(v,v)}' +
  syncActive('t') +
  '})'

export const inputOtp = <Msg>(
  p: InputOtpProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const length = p.length ?? 6,
    pattern = p.pattern ?? /[0-9]/,
    value = normalize(p.value, length, pattern)
  return h.div(
    [
      h.DataAttribute('slot', 'input-otp'),
      h.Class(className(styles.root, p.layoutStyle)),
    ],
    [
      h.input([
        h.Id(p.id),
        h.Type('text'),
        h.Value(value),
        h.InputMode(p.inputMode ?? 'numeric'),
        h.Pattern(pattern.source),
        h.Maxlength(length),
        h.Autocomplete('one-time-code'),
        h.Spellcheck(false),
        h.AriaLabel(p.ariaLabel ?? 'One-time password'),
        h.AriaInvalid(p.isInvalid ?? false),
        h.Disabled(p.isDisabled ?? false),
        ...(p.isRequired === true
          ? [h.Required(true), h.AriaRequired(true)]
          : []),
        ...(p.name === undefined ? [] : [h.Name(p.name)]),
        h.OnInput(next => p.onInput(normalize(next, length, pattern))),
        h.Attribute('oninput', ADVANCE_SELECTION),
        h.Attribute('onselect', SYNC_ACTIVE),
        h.Attribute('onkeyup', SYNC_ACTIVE),
        h.Attribute('onfocus', FOCUS_ACTIVE),
        h.Attribute('onblur', CLEAR_ACTIVE),
        h.Attribute('onmouseup', SNAP_TO_SLOT),
        h.Class(className(reset.input, styles.input)),
      ]),
      h.div(
        [
          h.DataAttribute('slot', 'input-otp-group'),
          h.AriaHidden(true),
          h.Class(className(styles.group, p.groupLayoutStyle)),
        ],
        Array.from({ length }, (_, index) => {
          const character = value[index]
          const slot = h.div(
            [
              h.DataAttribute('slot', 'input-otp-slot'),
              h.Class(
                className(
                  styles.slot,
                  p.slotSize === 'lg' && styles.lg,
                  p.slotLayoutStyle,
                ),
              ),
            ],
            [
              character ?? '',
              h.div(
                [h.Class(className(styles.caretWrap))],
                [h.div([h.Class(className(styles.caret))], [])],
              ),
            ],
          )
          const separator = p.separator?.(index)
          return separator === undefined || index === length - 1
            ? slot
            : h.div([h.Class(className(styles.contents))], [slot, separator])
        }),
      ),
    ],
  )
}
export const inputOtpSeparator = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [
      h.Role('separator'),
      h.DataAttribute('slot', 'input-otp-separator'),
      h.Class(className(styles.separator)),
    ],
    ['·'],
  )
