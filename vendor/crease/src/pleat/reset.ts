import { Global } from '@pleat/core'
import { className as pleatClassName } from '@pleat/foldkit'
import type { ClassName } from '@pleat/foldkit'
import { tokens } from './tokens'

const INHERIT_ALL = {
  backgroundColor: tokens.transparent,
  color: 'inherit',
  fontFamily: 'inherit',
  fontFeatureSettings: 'inherit',
  fontSize: 'inherit',
  fontVariationSettings: 'inherit',
  fontWeight: 'inherit',
  letterSpacing: 'inherit',
  lineHeight: 'inherit',
} as const

/** Element defaults in the `pleat.globals` layer, so component atoms always win —
 *  unlike atoms, layer order (not emission order) decides. One class per entry,
 *  applied the same way the StyleX `reset` object is. */
const element = (name: string): ClassName =>
  pleatClassName(`crease-reset-${name}`)

Global.rule('.crease-reset-button', {
  margin: 0,
  padding: 0,
  borderRadius: '0px',
  borderStyle: 'solid',
  borderWidth: 0,
  ...INHERIT_ALL,
  textDecorationLine: 'none',
  textTransform: 'none',
})
Global.rule('.crease-reset-input', {
  margin: 0,
  padding: 0,
  borderRadius: '0px',
  borderStyle: 'solid',
  borderWidth: 0,
  ...INHERIT_ALL,
})
Global.rule('.crease-reset-input::placeholder', {
  color: tokens.controlPlaceholder,
  opacity: 1,
})
Global.rule('.crease-reset-list', {
  margin: 0,
  padding: 0,
  listStyleType: 'none',
})
Global.rule('.crease-reset-link', {
  color: 'inherit',
  textDecorationLine: 'none',
})
Global.rule('.crease-reset-text', {
  margin: 0,
  padding: 0,
  fontFamily: 'inherit',
  fontSize: 'inherit',
  fontWeight: 'inherit',
  lineHeight: 'inherit',
})
Global.rule('.crease-reset-fieldset', {
  margin: 0,
  padding: 0,
  borderWidth: 0,
  minWidth: 0,
})
Global.rule('.crease-reset-media', {
  display: 'block',
  verticalAlign: 'middle',
  height: 'auto',
  maxWidth: '100%',
})
Global.rule('.crease-reset-svg', { display: 'block', verticalAlign: 'middle' })
Global.rule('.crease-reset-table', {
  borderColor: 'inherit',
  borderCollapse: 'collapse',
  borderSpacing: 0,
  textIndent: 0,
})
Global.rule('.crease-reset-table-heading', {
  padding: 0,
  textAlign: 'inherit',
})
Global.rule('.crease-reset-rule', {
  margin: 0,
  borderStyle: 'solid',
  borderWidth: 0,
  color: 'inherit',
  borderTopWidth: 1,
  height: 0,
})
Global.rule('.crease-reset-code', {
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
  fontFeatureSettings: 'normal',
  fontSize: '1em',
  fontVariationSettings: 'normal',
})
export const reset = {
  button: element('button'),
  input: element('input'),
  list: element('list'),
  link: element('link'),
  text: element('text'),
  fieldset: element('fieldset'),
  media: element('media'),
  svg: element('svg'),
  table: element('table'),
  tableHeading: element('table-heading'),
  rule: element('rule'),
  code: element('code'),
}
