/**
 * Parent-layout properties a caller may set on a component's public
 * `layoutStyle` slot. Shared by the Pleat contract and the docs program
 * repair so both enforce the same closed allowlist.
 */
export const COMPONENT_LAYOUT_PROPERTY_NAMES: ReadonlySet<string> = new Set([
  'aspectRatio',
  'alignSelf',
  'flexBasis',
  'flexGrow',
  'flexShrink',
  'gridArea',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnStart',
  'gridRow',
  'gridRowEnd',
  'gridRowStart',
  'height',
  'justifySelf',
  'margin',
  'marginBlock',
  'marginBlockEnd',
  'marginBlockStart',
  'marginBottom',
  'marginInline',
  'marginInlineEnd',
  'marginInlineStart',
  'marginLeft',
  'marginRight',
  'marginTop',
  'maxHeight',
  'maxWidth',
  'minHeight',
  'minWidth',
  'order',
  'width',
])
