import type { Html, HtmlBuilder } from 'foldkit/html'

import { cn } from '@/lib/utils'

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
  class?: string
  groupClass?: string
  /** Pattern accepted by the control. Defaults to ASCII digits. */
  pattern?: RegExp
  inputMode?:
    | 'numeric'
    | 'text'
    | 'tel'
    | 'decimal'
    | 'email'
    | 'url'
    | 'search'
  slotClass?: string
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

/* Inserting over a selected digit collapses the native selection. Select
   the next existing digit so the next keystroke replaces it rather than
   attempting an insertion that maxlength would reject. Deletion keeps its
   native caret position, allowing the removed character to be re-entered. */
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
   drag that already formed a range is kept. Like focus, mouseup can run
   before the browser settles its native selection, so defer the mapping. */
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
  props: InputOtpProps<Msg>,
  h: HtmlBuilder<Msg>,
): Html => {
  const length = props.length ?? 6
  const pattern = props.pattern ?? /[0-9]/
  const value = normalize(props.value, length, pattern)

  return h.div(
    [
      h.DataAttribute('slot', 'input-otp'),
      h.Class(cn('relative inline-flex items-center', props.class)),
    ],
    [
      h.input([
        h.Id(props.id),
        h.Type('text'),
        h.Value(value),
        h.InputMode(props.inputMode ?? 'numeric'),
        h.Pattern(pattern.source),
        h.Maxlength(length),
        h.Autocomplete('one-time-code'),
        h.Spellcheck(false),
        h.AriaLabel(props.ariaLabel ?? 'One-time password'),
        h.AriaInvalid(props.isInvalid ?? false),
        h.Disabled(props.isDisabled ?? false),
        ...(props.isRequired === true
          ? [h.Required(true), h.AriaRequired(true)]
          : []),
        ...(props.name === undefined ? [] : [h.Name(props.name)]),
        h.OnInput(next => props.onInput(normalize(next, length, pattern))),
        h.Attribute('oninput', ADVANCE_SELECTION),
        h.Attribute('onselect', SYNC_ACTIVE),
        h.Attribute('onkeyup', SYNC_ACTIVE),
        h.Attribute('onfocus', FOCUS_ACTIVE),
        h.Attribute('onblur', CLEAR_ACTIVE),
        h.Attribute('onmouseup', SNAP_TO_SLOT),
        h.Class(
          'peer absolute inset-0 z-10 size-full cursor-text opacity-0 disabled:cursor-not-allowed',
        ),
      ]),
      h.div(
        [
          h.DataAttribute('slot', 'input-otp-group'),
          h.AriaHidden(true),
          h.Class(
            cn('pointer-events-none flex items-center', props.groupClass),
          ),
        ],
        Array.from({ length }, (_, index) => {
          const character = value[index]
          const slot = h.div(
            [
              h.DataAttribute('slot', 'input-otp-slot'),
              h.Class(
                cn(
                  'relative flex size-9 items-center justify-center border-y border-r border-input text-sm shadow-xs transition-all first:rounded-l-md first:border-l last:rounded-r-md',
                  'data-[active]:z-10 data-[active]:border-ring data-[active]:ring-[3px] data-[active]:ring-ring/50',
                  'peer-aria-invalid:border-destructive peer-aria-invalid:ring-destructive/20 dark:peer-aria-invalid:ring-destructive/40',
                  'peer-disabled:opacity-50',
                  props.slotClass,
                ),
              ),
            ],
            [
              character ?? '',
              h.div(
                [
                  h.Class(
                    'pointer-events-none absolute inset-0 hidden items-center justify-center',
                  ),
                ],
                [
                  h.div(
                    [
                      h.Class(
                        'h-4 w-px animate-caret-blink bg-foreground duration-1000 motion-reduce:animate-none',
                      ),
                    ],
                    [],
                  ),
                ],
              ),
            ],
          )

          const separator = props.separator?.(index)
          return separator === undefined || index === length - 1
            ? slot
            : h.div([h.Class('contents')], [slot, separator])
        }),
      ),
    ],
  )
}

export const inputOtpSeparator = <Msg>(h: HtmlBuilder<Msg>): Html => {
  return h.div(
    [
      h.Role('separator'),
      h.DataAttribute('slot', 'input-otp-separator'),
      h.Class('px-2 text-muted-foreground'),
    ],
    ['·'],
  )
}
