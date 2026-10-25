import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { MapSkin, MapViewProps } from '@/lib/map-view'
import { renderMap } from '@/lib/map-view'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import { className } from '@/stylex/style'
import { reset } from '@/stylex/reset'
import { tokens } from './tokens.stylex'
import { foundationTokens } from './foundations-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { mapMarkerScope } from './map.markers.stylex'

export { MapMessage } from '@/lib/map-runtime'
export type { MapConfig, MapViewport } from '@/lib/map-runtime'
export { OPENFREEMAP_STYLES } from '@/lib/map-style'

const styles = stylex.create({
  root: {
    // Isolation would trap themed Select menus below their portaled backdrops.
    overflow: 'hidden',
    backgroundColor: tokens.muted,
    color: tokens.foreground,
    position: 'relative',
    height: '26.25rem',
    minHeight: '16rem',
    width: '100%',
  },
  canvas: { inset: 0, position: 'absolute' },
  status: {
    inset: 0,
    padding: '1.5rem',
    gap: '0.75rem',
    alignItems: 'center',
    backgroundColor: tokens.background,
    color: tokens.mutedForeground,
    display: { default: 'flex', ':is([hidden])': 'none' },
    flexDirection: 'column',
    fontSize: '0.875rem',
    justifyContent: 'center',
    position: 'absolute',
    zIndex: 30,
  },
  controlGroup: {
    borderRadius: tokens.radius,
    overflow: 'hidden',
    backgroundColor: tokens.background,
    boxShadow: foundationTokens.shadowMd,
    color: tokens.foreground,
    display: 'flex',
    flexDirection: 'column',
    position: 'absolute',
    zIndex: 20,
  },
  control: {
    outline: { default: 'none', ':focus-visible': '2px solid' },
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: { default: tokens.background, ':hover': tokens.muted },
    cursor: interactionTokens.cursorAction,
    display: { default: 'flex', ':is([hidden])': 'none' },
    fontSize: '1.125rem',
    fontWeight: 500,
    justifyContent: 'center',
    outlineColor: tokens.ring,
    outlineOffset: '-2px',
    minHeight: '2.5rem',
    minWidth: '2.5rem',
  },
  marker: {
    padding: 0,
    borderRadius: foundationTokens.radiusFull,
    borderWidth: 0,
    outline: { default: 'none', ':focus-visible': '2px solid' },
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    color: tokens.foreground,
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    justifyContent: 'center',
    outlineColor: tokens.ring,
    position: 'absolute',
    touchAction: 'none',
    transform: 'translate(-50%, -50%)',
    zIndex: 10,
    minHeight: '2.5rem',
    minWidth: '2.5rem',
  },
  markerContent: {
    borderRadius: foundationTokens.radiusFull,
    alignItems: 'center',
    backgroundColor: tokens.primary,
    boxShadow: foundationTokens.shadowMd,
    color: tokens.primaryForeground,
    display: 'flex',
    fontSize: '0.875rem',
    justifyContent: 'center',
    outlineColor: tokens.background,
    outlineStyle: 'solid',
    outlineWidth: 2,
    height: '1.5rem',
    width: '1.5rem',
  },
  label: {
    borderRadius: tokens.controlRadius,
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    backgroundColor: tokens.background,
    boxShadow: foundationTokens.shadowSm,
    color: tokens.foreground,
    fontSize: '0.75rem',
    fontWeight: 500,
    position: 'absolute',
    whiteSpace: 'nowrap',
    marginTop: '0.25rem',
    top: '100%',
  },
  tooltip: {
    borderRadius: tokens.controlRadius,
    paddingBlock: '0.25rem',
    paddingInline: '0.5rem',
    backgroundColor: foundationTokens.popover,
    boxShadow: foundationTokens.shadowMd,
    color: foundationTokens.popoverForeground,
    fontSize: '0.75rem',
    opacity: {
      default: 0,
      [stylex.when.ancestor(':focus-visible', mapMarkerScope)]: 1,
      [stylex.when.ancestor(':hover', mapMarkerScope)]: 1,
    },
    pointerEvents: 'none',
    position: 'absolute',
    whiteSpace: 'nowrap',
    bottom: '100%',
    marginBottom: '0.25rem',
  },
  popup: {
    padding: '1rem',
    borderRadius: tokens.radius,
    backgroundColor: foundationTokens.popover,
    boxShadow: foundationTokens.shadowXl,
    color: foundationTokens.popoverForeground,
    fontSize: '0.875rem',
    position: 'absolute',
    transform: 'translate(-50%, calc(-100% - 20px))',
    zIndex: 20,
    maxWidth: 'calc(100% - 2rem)',
    paddingRight: '2.5rem',
    width: '15rem',
  },
  close: {
    borderRadius: tokens.radius,
    outline: { default: 'none', ':focus-visible': '2px solid' },
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    color: { default: tokens.mutedForeground, ':hover': tokens.foreground },
    cursor: interactionTokens.cursorAction,
    display: 'flex',
    fontSize: '1.125rem',
    justifyContent: 'center',
    outlineColor: tokens.ring,
    position: 'absolute',
    height: '2.5rem',
    right: 0,
    top: 0,
    width: '2.5rem',
  },
})

export const mapSkin: MapSkin = {
  root: className(styles.root),
  canvas: className(styles.canvas),
  status: className(styles.status),
  controlGroup: className(styles.controlGroup),
  control: className(reset.button, styles.control),
  marker: className(reset.button, styles.marker, mapMarkerScope),
  markerContent: className(styles.markerContent),
  label: className(styles.label),
  tooltip: className(styles.tooltip),
  popup: className(styles.popup),
  close: className(reset.button, styles.close),
}
export type MapProps<Msg> = MapViewProps<Msg> &
  Readonly<{ layoutStyle?: ComponentLayoutStyle }>
export const map = <Msg>(props: MapProps<Msg>, h: HtmlBuilder<Msg>): Html => {
  const { layoutStyle, ...viewProps } = props
  return renderMap(
    viewProps,
    { ...mapSkin, root: className(styles.root, props.layoutStyle) },
    h,
  )
}
