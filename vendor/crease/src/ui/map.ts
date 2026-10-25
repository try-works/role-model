import type { Html, HtmlBuilder } from 'foldkit/html'
import type { MapViewProps, MapSkin } from '@/lib/map-view'
import { renderMap } from '@/lib/map-view'
import { cn } from '@/lib/utils'

export { MapMessage } from '@/lib/map-runtime'
export type { MapConfig, MapViewport } from '@/lib/map-runtime'
export { OPENFREEMAP_STYLES } from '@/lib/map-style'

/** Shared presentation for the composable Tailwind map overlays. */
export const mapSkin: MapSkin = {
  // Keep themed in-tree menus above their portaled backdrops.
  root: 'relative h-[420px] min-h-64 w-full overflow-hidden bg-muted text-foreground',
  canvas: 'absolute inset-0',
  status:
    'absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-background/95 p-6 text-sm text-muted-foreground [&[hidden]]:hidden',
  controlGroup:
    'absolute z-20 flex flex-col overflow-hidden rounded-lg bg-background text-foreground shadow-md',
  control:
    'flex min-h-10 min-w-10 items-center justify-center px-2 text-lg font-medium hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:opacity-50 [&[hidden]]:hidden',
  marker:
    'group absolute z-10 flex min-h-10 min-w-10 -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center border-0 bg-transparent p-0 text-foreground focus-visible:rounded-full focus-visible:outline-2 focus-visible:outline-ring',
  markerContent:
    'flex size-6 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground shadow-md ring-2 ring-background',
  label:
    'absolute top-full mt-1 whitespace-nowrap rounded-md bg-background px-2 py-1 text-xs font-medium text-foreground shadow-sm',
  tooltip:
    'pointer-events-none absolute bottom-full mb-1 hidden whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md group-hover:block group-focus-visible:block',
  popup:
    'absolute z-20 w-60 max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-[calc(100%+20px)] rounded-lg bg-popover p-4 pr-10 text-sm text-popover-foreground shadow-lg',
  close:
    'absolute right-0 top-0 flex size-10 items-center justify-center rounded-lg text-lg text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring',
}

export type MapProps<Msg> = MapViewProps<Msg> & Readonly<{ class?: string }>
export const map = <Msg>(props: MapProps<Msg>, h: HtmlBuilder<Msg>): Html => {
  const { class: className, ...viewProps } = props
  return renderMap(
    viewProps,
    { ...mapSkin, root: cn(mapSkin.root, className) },
    h,
  )
}
