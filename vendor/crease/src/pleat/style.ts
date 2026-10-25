import { Style } from '@pleat/core'
import type { When } from '@pleat/core'
import {
  cssClass,
  className as pleatClassName,
  type ClassName,
} from '@pleat/foldkit'

const sizing = Style.make({ boxSizing: 'border-box' })

export type Marker = When.Marker

/** Accepted parts: a Pleat style, a marker to apply, or a passthrough class token. */
export type ClassNameArg =
  | Style.Style
  | Marker
  | ClassName
  | string
  | false
  | null
  | undefined

const isMarker = (value: ClassNameArg): value is Marker =>
  typeof value === 'object' &&
  value !== null &&
  'name' in value &&
  'className' in value

/**
 * Foldkit uses `class`, while `@pleat/foldkit`'s cssClass returns a class-name
 * string. Keep that framework boundary in one place.
 *
 * Adds `box-sizing: border-box` as the element default, applied before
 * component recipes, matching the Tailwind site's base layer.
 */
export const className = (...args: ReadonlyArray<ClassNameArg>): string =>
  cssClass(
    sizing,
    ...args.flatMap((arg): Array<Style.Style | ClassName> => {
      if (arg === false || arg === null || arg === undefined) return []
      if (typeof arg === 'string') return [pleatClassName(arg)]
      if (isMarker(arg)) return [Style.mark(arg)]
      return [arg]
    }),
  )
