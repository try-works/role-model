import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Verbatim shadcn/ui utils.ts — nothing React-specific in it.
export const cn = (...inputs: ReadonlyArray<ClassValue>): string =>
  twMerge(clsx(inputs))
