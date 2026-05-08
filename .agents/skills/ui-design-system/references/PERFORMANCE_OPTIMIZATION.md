# Performance Optimization & Best Practices

## Performance Best Practices

### Code Splitting
Lazy load heavy components to reduce initial bundle size.

**Strategy:**
```tsx
import { lazy, Suspense } from 'react'

const DataTable = lazy(() => import('./DataTable'))
const ChartComponent = lazy(() => import('./ChartComponent'))

function Dashboard() {
  return (
    <Suspense fallback={<Skeleton />}>
      <DataTable />
      <ChartComponent />
    </Suspense>
  )
}
```

**When to split:**
- Components not immediately visible
- Heavy dependencies (charts, editors)
- Route-based splitting
- Modal/dialog content

### Tailwind Optimization

#### Configure Content Paths
Scan all component files accurately:
```js
// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
}
```

#### Remove Unused Plugins
Only include necessary plugins:
```js
module.exports = {
  plugins: [
    require('tailwindcss-animate'), // Keep if using animations
    // Remove unused plugins
  ],
}
```

#### Avoid Broad Globs
Specific paths prevent unnecessary scanning:
- ❌ `'**/*.{js,jsx,tsx}'` (too broad)
- ✅ `'./components/**/*.{jsx,tsx}'` (specific)

### Virtualization
Use @tanstack/react-virtual for long lists.

**Why virtualize:**
- Render only visible items
- Smooth scrolling with thousands of items
- Reduced memory usage
- Better performance

**Implementation:**
```tsx
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList({ items }) {
  const parentRef = useRef(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 35,
  })

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {items[virtualItem.index]}
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Dynamic Classes Warning

**Problem:**
Tailwind doesn't generate classes at runtime.

**Wrong ❌:**
```tsx
<div className={`text-${color}-500`}>
```

**Correct ✅:**
```tsx
// Option 1: Conditional logic
<div className={color === 'blue' ? 'text-blue-500' : 'text-red-500'}>

// Option 2: Safelist in config
module.exports = {
  safelist: [
    'text-blue-500',
    'text-red-500',
    'text-green-500',
  ],
}
```

## Core Web Vitals Optimization

### Largest Contentful Paint (LCP)
Target: < 2.5 seconds

**Strategies:**
- Optimize images (Next.js Image component)
- Preload critical resources
- Minimize render-blocking CSS
- Use CDN for static assets
- Server-side rendering for above-fold content

### First Input Delay (FID) / Interaction to Next Paint (INP)
Target: < 100ms (FID), < 200ms (INP)

**Strategies:**
- Minimize JavaScript execution time
- Code split large bundles
- Defer non-critical scripts
- Use web workers for heavy computation
- Optimize event handlers

### Cumulative Layout Shift (CLS)
Target: < 0.1

**Strategies:**
- Set explicit dimensions for images and videos
- Reserve space for dynamic content
- Use `aspect-ratio` CSS property
- Avoid inserting content above existing content
- Use transform animations instead of layout-triggering properties

## Bundle Optimization

### Analysis
Use bundle analyzer to identify issues:
```bash
npm install --save-dev @next/bundle-analyzer
```

```js
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // your config
})
```

Run analysis:
```bash
ANALYZE=true npm run build
```

### Tree Shaking
Import only what you need:

**Wrong ❌:**
```tsx
import * as Icons from 'lucide-react'
```

**Correct ✅:**
```tsx
import { ChevronRight, User } from 'lucide-react'
```

### Dynamic Imports
Load code only when needed:
```tsx
const heavyFunction = async () => {
  const module = await import('./heavy-module')
  return module.default()
}
```

## Common Pitfalls

### 1. Dynamic Class Generation
**Problem:** Tailwind doesn't generate classes at runtime

**Solution:** Use conditional logic or safelist

### 2. Content Configuration
**Problem:** Styles not applied, CSS purged incorrectly

**Solution:** Verify `content` paths include all component files

### 3. Import Path Issues
**Problem:** Component imports fail

**Solution:** Check path aliases in `tsconfig.json` and `components.json`

### 4. Dark Mode Not Working
**Problem:** Styles don't change in dark mode

**Solution:** Verify ThemeProvider setup, CSS variables defined in `.dark`

### 5. Accessibility Override
**Problem:** Breaking Radix accessibility features

**Solution:** Never remove ARIA attributes, use `asChild` prop correctly

### 6. Hydration Errors
**Problem:** Content mismatch between server and client

**Solution:**
- Add `suppressHydrationWarning` to theme-affected elements
- Use `useEffect` for client-only content
- Check for browser-only APIs in SSR

### 7. Large Bundle Size
**Problem:** Initial bundle too large

**Solution:**
- Code split routes and heavy components
- Tree shake unused code
- Analyze bundle with bundle analyzer
- Lazy load below-fold content

### 8. Memory Leaks
**Problem:** Component memory not released

**Solution:**
- Clean up event listeners in useEffect
- Unsubscribe from observables
- Clear timeouts and intervals
- Avoid closures over large objects

### 9. Re-render Performance
**Problem:** Too many unnecessary re-renders

**Solution:**
- Use `React.memo` for pure components
- Optimize context value with `useMemo`
- Use `useCallback` for event handlers passed to children
- Implement proper dependency arrays

### 10. Font Loading Performance
**Problem:** Flash of invisible/unstyled text (FOIT/FOUT)

**Solution:**
- Use `next/font` for automatic optimization
- Preload critical fonts
- Use `font-display: swap`
- Subset fonts to needed characters

## Performance Monitoring

### Lighthouse CI
Automated performance testing:
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://example.com/
            https://example.com/about
          uploadArtifacts: true
```

### Real User Monitoring
Track actual user experience:
```tsx
import { onCLS, onFID, onLCP } from 'web-vitals'

function sendToAnalytics({ name, delta, id }) {
  // Send to analytics endpoint
  console.log(name, delta, id)
}

onCLS(sendToAnalytics)
onFID(sendToAnalytics)
onLCP(sendToAnalytics)
```

### Performance Budget
Set limits for bundle sizes:
```js
// next.config.js
module.exports = {
  experimental: {
    bundlePagesRouterDependencies: true,
  },
  // Set size limits
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}
```

## Optimization Checklist

- [ ] Code split heavy components with React.lazy
- [ ] Configure Tailwind content paths accurately
- [ ] Virtualize long lists (>100 items)
- [ ] Optimize images with Next.js Image
- [ ] Preload critical resources
- [ ] Minimize render-blocking CSS
- [ ] Tree shake unused imports
- [ ] Set up bundle analyzer
- [ ] Monitor Core Web Vitals
- [ ] Implement performance budget
- [ ] Test on real devices and slow networks
- [ ] Audit with Lighthouse
- [ ] Fix hydration errors
- [ ] Clean up event listeners
- [ ] Optimize re-renders with memo/callback
- [ ] Use web workers for heavy computation
