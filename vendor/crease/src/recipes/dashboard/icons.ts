import { icon, type IconConfig } from '@/lib/icon'
import type { HtmlBuilder } from 'foldkit/html'
export * from '@/lib/icon'

const named =
  (name: string) =>
  <Msg>(config: IconConfig, h: HtmlBuilder<Msg>) =>
    icon(name, config, h)
export const moon = named('moon')
export const sun = named('sun')
export const download = named('download')
export const trendingUp = named('trending-up')
export const banknote = named('banknote')
export const creditCard = named('credit-card')
export const mousePointer2 = named('mouse-pointer-2')
export const userCheck = named('user-check')
export const mail = named('mail')
export const shieldCheck = named('shield-check')
export const pencil = named('pencil')
export const listFilter = named('list-filter')
