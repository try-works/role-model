# Swiss Design System — Component Patterns

All components use IBM Plex Sans, the stone palette, and a single accent color (`[#C8102E]` shown as default — swap to your project's accent).

---

## Typography

```html
<!-- Display -->
<h1 class="text-7xl font-light tracking-tight text-stone-900 dark:text-stone-50 leading-none">
  Form und Funktion
</h1>

<!-- H1 -->
<h1 class="text-5xl font-light tracking-tight text-stone-900 dark:text-stone-50 leading-tight">
  Grid Systems in Graphic Design
</h1>

<!-- H2 -->
<h2 class="text-3xl font-light tracking-tight text-stone-900 dark:text-stone-50 leading-snug">
  The Typographic Grid
</h2>

<!-- H3 -->
<h3 class="text-xl font-normal text-stone-900 dark:text-stone-50 leading-snug">
  Alignment and Proportion
</h3>

<!-- Body -->
<p class="text-base font-normal leading-relaxed text-stone-900 dark:text-stone-50 max-w-[60ch]">
  The grid system is an aid, not a guarantee. It permits a number of possible uses and each designer can look for a solution appropriate to his personal style.
</p>

<!-- Secondary body -->
<p class="text-base leading-relaxed text-stone-900/70 dark:text-stone-50/70 max-w-[60ch]">
  Supporting text at reduced opacity.
</p>

<!-- Caption / label -->
<span class="text-xs tracking-widest uppercase text-stone-900/40 dark:text-stone-50/40">
  Figure 01 — Basel, 1961
</span>

<!-- Mono -->
<code class="font-mono text-sm text-stone-900 dark:text-stone-50 bg-stone-100 dark:bg-stone-900 px-1.5 py-0.5">
  npx skills add zeke/swiss-design-skill
</code>
```

---

## Buttons

```html
<!-- Primary: filled accent -->
<button class="px-6 py-3 bg-[#C8102E] text-white text-sm font-medium tracking-wide hover:bg-[#C8102E]/90 active:scale-[0.98] transition-all duration-150">
  Get started
</button>

<!-- Secondary: ghost with accent border -->
<button class="px-6 py-3 border border-[#C8102E] text-[#C8102E] text-sm font-medium tracking-wide hover:bg-[#C8102E]/10 active:scale-[0.98] transition-all duration-150">
  Learn more
</button>

<!-- Tertiary: text only -->
<button class="px-6 py-3 text-stone-900 dark:text-stone-50 text-sm font-medium tracking-wide hover:text-[#C8102E] transition-colors duration-150">
  View details →
</button>

<!-- Neutral: filled stone -->
<button class="px-6 py-3 bg-stone-900 dark:bg-stone-50 text-stone-50 dark:text-stone-900 text-sm font-medium tracking-wide hover:bg-stone-800 dark:hover:bg-stone-200 active:scale-[0.98] transition-all duration-150">
  Download
</button>
```

Note: No `rounded-*` on buttons. Swiss style is rectilinear.

---

## Cards

```html
<!-- Basic card -->
<div class="bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-8">
  <span class="text-xs tracking-widest uppercase text-stone-900/40 dark:text-stone-50/40">Category</span>
  <h3 class="text-xl font-normal text-stone-900 dark:text-stone-50 mt-4 leading-snug">Card Title</h3>
  <p class="text-sm leading-relaxed text-stone-900/70 dark:text-stone-50/70 mt-3 max-w-[48ch]">
    Supporting description text.
  </p>
</div>

<!-- Card with accent top border -->
<div class="bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 border-t-2 border-t-[#C8102E] p-8">
  ...
</div>

<!-- Card with accent tint background -->
<div class="bg-[#C8102E]/10 border border-[#C8102E]/20 p-8">
  ...
</div>

<!-- Horizontal rule card / entry -->
<div class="border-t border-stone-200 dark:border-stone-800 py-6 flex items-start justify-between gap-8">
  <div>
    <h3 class="text-base font-normal text-stone-900 dark:text-stone-50">Entry title</h3>
    <p class="text-sm text-stone-900/60 dark:text-stone-50/60 mt-1">Subtitle or metadata</p>
  </div>
  <span class="text-sm text-stone-900/40 dark:text-stone-50/40 shrink-0">2024</span>
</div>
```

---

## Navigation

```html
<!-- Top nav -->
<nav class="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
  <div class="max-w-6xl mx-auto px-8 flex items-center justify-between h-16">
    <a href="/" class="text-sm font-medium tracking-widest uppercase text-stone-900 dark:text-stone-50">
      Swiss Design
    </a>
    <div class="flex items-center gap-8">
      <a href="#" class="text-sm text-stone-900/60 dark:text-stone-50/60 hover:text-stone-900 dark:hover:text-stone-50 transition-colors">Typography</a>
      <a href="#" class="text-sm text-stone-900/60 dark:text-stone-50/60 hover:text-stone-900 dark:hover:text-stone-50 transition-colors">Grid</a>
      <a href="#" class="text-sm text-[#C8102E]">Color</a>
    </div>
  </div>
</nav>

<!-- Sidebar nav -->
<nav class="border-r border-stone-200 dark:border-stone-800 w-48 min-h-screen p-8">
  <ul class="space-y-1">
    <li>
      <a href="#" class="block text-sm text-[#C8102E] font-medium py-1.5">Active item</a>
    </li>
    <li>
      <a href="#" class="block text-sm text-stone-900/60 dark:text-stone-50/60 hover:text-stone-900 dark:hover:text-stone-50 py-1.5 transition-colors">Inactive item</a>
    </li>
  </ul>
</nav>
```

---

## Badges & Labels

```html
<!-- Neutral badge -->
<span class="inline-block px-2 py-0.5 text-[11px] font-medium tracking-widest uppercase bg-stone-200 dark:bg-stone-800 text-stone-900/70 dark:text-stone-50/70">
  Sans-serif
</span>

<!-- Accent badge -->
<span class="inline-block px-2 py-0.5 text-[11px] font-medium tracking-widest uppercase bg-[#C8102E]/10 text-[#C8102E]">
  Featured
</span>

<!-- Outline badge -->
<span class="inline-block px-2 py-0.5 text-[11px] font-medium tracking-widest uppercase border border-stone-300 dark:border-stone-700 text-stone-900/60 dark:text-stone-50/60">
  Draft
</span>
```

---

## Dividers

```html
<!-- Standard hairline -->
<hr class="border-none border-t border-stone-200 dark:border-stone-800 my-16">

<!-- With label -->
<div class="flex items-center gap-4 my-16">
  <div class="flex-1 border-t border-stone-200 dark:border-stone-800"></div>
  <span class="text-xs tracking-widest uppercase text-stone-900/30 dark:text-stone-50/30">or</span>
  <div class="flex-1 border-t border-stone-200 dark:border-stone-800"></div>
</div>

<!-- Bold accent rule (decorative, Swiss) -->
<div class="w-12 h-px bg-[#C8102E] my-8"></div>

<!-- Full-width bold rule -->
<div class="w-full h-px bg-stone-900 dark:bg-stone-50 my-16"></div>
```

---

## Form Elements

```html
<!-- Input -->
<div class="flex flex-col gap-2">
  <label class="text-xs tracking-widest uppercase text-stone-900/60 dark:text-stone-50/60 font-medium">
    Full name
  </label>
  <input
    type="text"
    class="border border-stone-200 dark:border-stone-800 bg-transparent text-stone-900 dark:text-stone-50 text-base px-4 py-3 outline-none focus:border-stone-900 dark:focus:border-stone-50 placeholder:text-stone-900/30 dark:placeholder:text-stone-50/30 transition-colors"
    placeholder="Josef Müller-Brockmann"
  >
</div>

<!-- Select -->
<div class="flex flex-col gap-2">
  <label class="text-xs tracking-widest uppercase text-stone-900/60 dark:text-stone-50/60 font-medium">
    Country
  </label>
  <select class="border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50 text-base px-4 py-3 outline-none focus:border-stone-900 dark:focus:border-stone-50 appearance-none">
    <option>Switzerland</option>
  </select>
</div>

<!-- Textarea -->
<div class="flex flex-col gap-2">
  <label class="text-xs tracking-widest uppercase text-stone-900/60 dark:text-stone-50/60 font-medium">
    Message
  </label>
  <textarea
    rows="4"
    class="border border-stone-200 dark:border-stone-800 bg-transparent text-stone-900 dark:text-stone-50 text-base px-4 py-3 outline-none focus:border-stone-900 dark:focus:border-stone-50 resize-none transition-colors"
  ></textarea>
</div>

<!-- Checkbox -->
<label class="flex items-start gap-3 cursor-pointer group">
  <input type="checkbox" class="mt-0.5 w-4 h-4 border border-stone-300 dark:border-stone-700 accent-[#C8102E]">
  <span class="text-sm text-stone-900/70 dark:text-stone-50/70 group-hover:text-stone-900 dark:group-hover:text-stone-50 transition-colors">
    I agree to the terms
  </span>
</label>
```

---

## Tables

```html
<table class="w-full text-sm border-t border-stone-200 dark:border-stone-800">
  <thead>
    <tr class="border-b border-stone-200 dark:border-stone-800">
      <th class="text-left text-xs tracking-widest uppercase text-stone-900/40 dark:text-stone-50/40 font-medium py-3 pr-8">Font</th>
      <th class="text-left text-xs tracking-widest uppercase text-stone-900/40 dark:text-stone-50/40 font-medium py-3 pr-8">Year</th>
      <th class="text-left text-xs tracking-widest uppercase text-stone-900/40 dark:text-stone-50/40 font-medium py-3">Origin</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b border-stone-100 dark:border-stone-900 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors">
      <td class="py-4 pr-8 text-stone-900 dark:text-stone-50 font-normal">IBM Plex Sans</td>
      <td class="py-4 pr-8 text-stone-900/60 dark:text-stone-50/60">2017</td>
      <td class="py-4 text-stone-900/60 dark:text-stone-50/60">USA</td>
    </tr>
    <tr class="border-b border-stone-100 dark:border-stone-900 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors">
      <td class="py-4 pr-8 text-stone-900 dark:text-stone-50">Helvetica Neue</td>
      <td class="py-4 pr-8 text-stone-900/60 dark:text-stone-50/60">1983</td>
      <td class="py-4 text-stone-900/60 dark:text-stone-50/60">Switzerland</td>
    </tr>
  </tbody>
</table>
```

---

## Code Block

```html
<pre class="bg-stone-900 dark:bg-stone-950 text-stone-50 p-8 overflow-x-auto">
  <code class="font-mono text-sm leading-relaxed">
npx skills add zeke/swiss-design-skill
  </code>
</pre>
```

---

## Hero Section

```html
<section class="relative min-h-screen flex items-center bg-stone-50 dark:bg-stone-950 overflow-hidden">
  <!-- Large background numeral (geometric anchor) -->
  <div class="absolute top-0 right-0 text-[clamp(12rem,30vw,28rem)] font-light leading-none text-stone-900/5 dark:text-stone-50/5 select-none pointer-events-none pr-8 pt-4">
    01
  </div>
  
  <div class="max-w-6xl mx-auto px-8 py-32 relative z-10">
    <span class="text-xs tracking-widest uppercase text-stone-900/40 dark:text-stone-50/40">Swiss Design System</span>
    <div class="w-8 h-px bg-[#C8102E] mt-6 mb-8"></div>
    <h1 class="text-5xl md:text-7xl font-light tracking-tight text-stone-900 dark:text-stone-50 leading-none max-w-3xl">
      Form follows function.
    </h1>
    <p class="text-lg leading-relaxed text-stone-900/60 dark:text-stone-50/60 mt-8 max-w-[52ch]">
      A design system built on the principles of the Swiss International Style.
    </p>
    <div class="flex items-center gap-4 mt-12">
      <button class="px-6 py-3 bg-stone-900 dark:bg-stone-50 text-stone-50 dark:text-stone-900 text-sm font-medium tracking-wide hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors">
        Get started
      </button>
      <button class="px-6 py-3 border border-stone-200 dark:border-stone-800 text-stone-900/60 dark:text-stone-50/60 text-sm font-medium tracking-wide hover:border-stone-900 dark:hover:border-stone-50 transition-colors">
        View examples
      </button>
    </div>
  </div>
</section>
```
