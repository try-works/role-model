import * as stylex from '@stylexjs/stylex'
import type { StaticStyles } from '@stylexjs/stylex'

const base = stylex.create({
  sizing: { boxSizing: 'border-box' },
})

export type Marker = ReturnType<typeof stylex.defineMarker>

/**
 * Foldkit uses `class`, while StyleX's primary non-JSX helper returns
 * `className`. Keep that framework boundary in one place.
 *
 * The pilot intentionally accepts only statically extracted StyleX styles.
 * Dynamic inline values would need a second adapter for Foldkit's `h.Style`.
 */
export const className = (
  ...styles: ReadonlyArray<StaticStyles | Marker>
): string => stylex.props(base.sizing, ...styles).className ?? ''
