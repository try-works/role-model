# Swiss Design System — Applying the System

## Applying to an existing page

When asked to apply this design system to an existing design, follow this sequence:

### 1. Audit first

Read the existing code and identify:
- How many distinct colors are in use? (target: 2 — stone + one accent)
- Are headings bold? (they should be light/normal)
- Is body text wider than 60ch? (it should not be)
- Are backgrounds pure white or black? (should be stone-50 / stone-950)
- Is line height generous? (`leading-relaxed` minimum on body)
- Is section spacing generous? (minimum `py-16`)
- Are there decorative colors being used for hierarchy? (should be opacity instead)

### 2. Collapse the palette

The most common fix: too many colors.

```
Before:  bg-white, bg-gray-100, bg-gray-200, text-gray-500, text-gray-700
After:   bg-stone-50, bg-stone-100, text-stone-900/70, text-stone-900/40
```

Remove mid-scale stone values (stone-400–700) that are used for text hierarchy. Replace with opacity modifiers on stone-900 (light) or stone-50 (dark).

### 3. Fix typography

```
Before:  font-bold text-2xl
After:   font-light text-3xl tracking-tight

Before:  text-gray-600
After:   text-stone-900/60 dark:text-stone-50/60

Before:  max-w-prose (65ch)
After:   max-w-[60ch]

Before:  leading-normal
After:   leading-relaxed
```

### 4. Add whitespace

Swiss design errs on the side of too much whitespace, not too little.

```
Before:  py-8 md:py-12
After:   py-16 md:py-24

Before:  gap-4
After:   gap-8

Before:  p-4
After:   p-8
```

### 5. Introduce geometric structure

Replace decorative elements with simple geometric forms:

```html
<!-- Instead of a decorative icon or image -->
<div class="w-8 h-px bg-[#C8102E] mb-8"></div>

<!-- Instead of a styled card header image -->
<div class="h-1 bg-[#C8102E] mb-8 -mx-8 -mt-8"></div>
```

### 6. Fix responsiveness

The Swiss grid must adapt gracefully from 320px to 1440px. Check:

```
Mobile (default):   Single column. px-4. py-16. text-3xl headings.
Tablet (md:):       2-col layouts emerge. px-8. py-24. text-5xl headings.
Desktop (lg:):      Full 12-col grid. max-w-6xl. py-32. text-7xl display.
```

Common fixes:
```
Before:  grid-cols-3 gap-8
After:   grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8

Before:  text-7xl font-normal
After:   text-4xl md:text-6xl lg:text-7xl font-normal

Before:  px-8
After:   px-4 md:px-8

Before:  <table class="w-full">
After:   <div class="overflow-x-auto"><table class="w-full min-w-[640px]">

Before:  flex items-center gap-8  (nav links)
After:   hidden md:flex items-center gap-8
```

Touch targets on mobile:
- Buttons: minimum `min-h-[44px]`
- Nav links: minimum `py-3` to ensure tap area
- Never rely on hover-only states for mobile users

### 7. Fix dark mode

Ensure every color has a `dark:` variant. Quick audit pattern:
- Every `bg-stone-*` should have a `dark:bg-stone-*` counterpart
- Every `text-stone-*` should have a `dark:text-stone-*` counterpart
- Every `border-stone-*` should have a `dark:border-stone-*` counterpart

---

## Picking an accent color

Ask: what is the emotional register of this project?

| If the project is... | Use |
| -------------------- | --- |
| Bold, assertive, commercial | Swiss Red `#C8102E` |
| Technical, corporate, trustworthy | Cobalt `#003B8E` |
| Warm, editorial, cultural | Golden `#F0B429` |
| Natural, calm, sustainable | Forest `#2D6A4F` |

**Commit to one.** If a second color feels necessary, use opacity of the first instead.

---

## When to use accent vs. stone

| Element | Use accent | Use stone |
| ------- | ---------- | --------- |
| Primary CTA button | ✓ | |
| Secondary button | | ✓ |
| Active nav item | ✓ | |
| Decorative rule above heading | ✓ (sparingly) | |
| Card top border (featured) | ✓ (sparingly) | |
| Section backgrounds | | ✓ |
| Body text | | ✓ |
| All heading levels | | ✓ |
| Borders, dividers | | ✓ |
| Tags / badges (standard) | | ✓ |
| Tags / badges (featured) | ✓ at /10 opacity | |

---

## Opacity decision guide

Before reaching for a different color, ask: can opacity solve this?

```
Need to de-emphasize text?        → /70 or /40 opacity
Need a subtle background?         → bg-[#C8102E]/10
Need a hover state?               → bg-stone-900/5 dark:bg-stone-50/5
Need a disabled state?            → opacity-40 on the element
Need a secondary badge?           → bg-[#C8102E]/10 text-[#C8102E]/60
```

---

## Grid discipline

When laying out a new section:

1. Start with a 12-column grid
2. Decide on the split: 8/4, 6/6, 4/4/4, or 3/9
3. Apply `gap-8` minimum between columns
4. Never use fractional columns (no 5/7 splits)
5. On mobile, all columns collapse to `col-span-12`

---

## Pre-ship checklist

Before declaring a design done:

- [ ] Body text is `max-w-[60ch]` or narrower
- [ ] No `font-bold` on any heading — use `font-light` or `font-normal`
- [ ] No pure `bg-white` or `bg-black` — stone scale only
- [ ] Every color has a `dark:` variant
- [ ] Only one accent color in use
- [ ] All text hierarchy uses opacity, not different hues
- [ ] Section padding is at least `py-16`
- [ ] IBM Plex Sans Google Fonts `<link>` is present
- [ ] No border-radius larger than `rounded-sm` on structural elements
- [ ] Line height on body is `leading-relaxed` or greater
- [ ] Tested at 375px (iPhone SE) — no horizontal scroll, no broken layouts
- [ ] Tested at 768px (tablet) — 2-col layouts appear correctly
- [ ] Tested at 1280px (desktop) — full grid, max-width container centered
- [ ] All grid columns have `col-span-12` mobile fallback
- [ ] Heading type scales down on mobile (`text-3xl md:text-5xl lg:text-7xl`)
- [ ] Section padding reduces on mobile (`py-16 md:py-24`)
- [ ] Horizontal padding reduces on mobile (`px-4 md:px-8`)
- [ ] All tables wrapped in `overflow-x-auto`
- [ ] All interactive elements at least 44×44px on mobile
- [ ] Desktop-only nav links hidden below `md:` breakpoint
