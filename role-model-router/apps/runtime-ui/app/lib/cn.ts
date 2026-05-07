import { twMerge } from "tailwind-merge";

export function cn(...values: Array<string | false | null | undefined>): string {
  return twMerge(values.filter(Boolean).join(" "));
}
