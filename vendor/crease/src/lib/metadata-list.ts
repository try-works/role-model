import { Schema as S } from 'effect'
import type { Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'

/* Ported from Meta Astryx MetadataList.tsx — the show-more/less collapse
   state (isShowAll) and the column/label layout resolution. */

export type MetadataListColumns = 'multi' | 'single' | number

export type MetadataListOrientation = 'vertical' | 'horizontal'

export type MetadataListLabelConfig = Readonly<{
  /** 'start' places labels to the left; 'top' stacks them above values. */
  position: 'start' | 'top'
  /** Custom label-track width (px number or CSS string). */
  width?: number | string
}>

export const Model = S.Struct({ isOpen: S.Boolean })
export type Model = typeof Model.Type

export const Message = defineMessageUnion({
  ToggledShowAll: {},
})
export type Message = typeof Message.Type

export const init = (): Model => ({ isOpen: false })

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ToggledShowAll':
      return { model: { ...model, isOpen: !model.isOpen } }
  }
}

/** Resolves astryx's column/label rule: 'top' labels for multi-column and
   horizontal layouts, 'start' for single-column. Returns the layout the
   dl grid takes plus whether items render stacked (affects the item DOM). */
export const resolveLayout = (
  config: Readonly<{
    columns?: MetadataListColumns
    label?: MetadataListLabelConfig
    orientation?: MetadataListOrientation
  }>,
): Readonly<{
  kind:
    | 'horizontal'
    | 'grid-single'
    | 'grid-multi'
    | 'grid-stacked-single'
    | 'grid-stacked-multi'
  /** Items render their label above the value inside a wrapper. */
  isStacked: boolean
  /** Runtime grid-template-columns for numeric columns / label widths. */
  gridTemplateColumns?: string
}> => {
  const columns = config.columns ?? 'single'
  const orientation = config.orientation ?? 'vertical'
  const isMultiColumn =
    columns === 'multi' || (typeof columns === 'number' && columns > 1)
  const labelConfig =
    config.label ??
    (isMultiColumn ? { position: 'top' } : { position: 'start' })
  if (orientation === 'horizontal') {
    return { kind: 'horizontal', isStacked: true }
  }
  const isStacked = labelConfig.position === 'top'
  const kind = isStacked
    ? columns === 'single' || columns === 1
      ? ('grid-stacked-single' as const)
      : ('grid-stacked-multi' as const)
    : columns === 'single' || columns === 1
      ? ('grid-single' as const)
      : ('grid-multi' as const)
  let gridTemplateColumns: string | undefined
  if (typeof columns === 'number' && columns > 1) {
    gridTemplateColumns = isStacked
      ? `repeat(${columns}, 1fr)`
      : `repeat(${columns}, auto minmax(0, 1fr))`
  } else if (!isStacked && labelConfig.width !== undefined) {
    const width =
      typeof labelConfig.width === 'number'
        ? `${labelConfig.width}px`
        : labelConfig.width
    gridTemplateColumns = `${width} minmax(0, 1fr)`
  }
  return {
    kind,
    isStacked,
    ...(gridTemplateColumns === undefined ? {} : { gridTemplateColumns }),
  }
}
