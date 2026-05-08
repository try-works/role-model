# Responsive Design Patterns

## Breakpoint Philosophy

Mobile-first breakpoints ensure optimal experience across all devices.

### Standard Breakpoints
- **Base**: 0-639px (mobile)
- **sm**: 640px+ (large phones, small tablets)
- **md**: 768px+ (tablets)
- **lg**: 1024px+ (laptops, desktops)
- **xl**: 1280px+ (large desktops)
- **2xl**: 1536px+ (ultra-wide)

### Breakpoint Strategy
1. **Design mobile-first**: Start with smallest screen
2. **Progressive enhancement**: Add features as screen grows
3. **Test real devices**: Don't rely only on browser resize
4. **Consider touch**: Mobile isn't just about screen size

## Responsive Component Patterns

### Layout Shifts
Components adapt their structure based on available space:
- **Column to row**: Stack vertically on mobile, horizontal on desktop
- **Stacked to grid**: Single column → multi-column grid
- **Flex direction**: `flex-col` → `md:flex-row`

### Component Switching
Different components for different screen sizes:
- **Dialog on desktop, Drawer on mobile**: Better UX per device
- **Full menu vs hamburger**: Navigation patterns
- **Expanded vs collapsed**: Sidebar behavior

### Content Visibility
Strategic showing/hiding of content:
- **`hidden md:block`**: Show only on larger screens
- **`block md:hidden`**: Show only on mobile
- **Progressive disclosure**: Essential first, details later

### Typography Scaling
Text sizes adapt to screen size:
- **`text-sm md:text-base lg:text-lg`**: Responsive font sizes
- **Fluid typography**: `clamp()` for smooth scaling
- **Line height adjustments**: Tighter on mobile, looser on desktop

## Container Queries

Use for component-based responsiveness instead of viewport-based.

### Why Container Queries
- **Component-centric**: Respond to parent width, not viewport
- **Modular design**: Components work anywhere
- **Better reusability**: Same component, different contexts

### Implementation
```css
/* Component responds to container, not viewport */
@container (min-width: 400px) {
  .card {
    flex-direction: row;
  }
}
```

### Tailwind Container Queries
- Use `@container` utilities with Tailwind
- Define container contexts with `@container` directive
- Query container size with `@min-` and `@max-` variants

## Responsive Strategies

### Strategy 1: Mobile-First Classes
Start with mobile styles, add breakpoints:
```jsx
<div className="flex flex-col md:flex-row lg:gap-8">
```

### Strategy 2: Responsive Grid
Auto-responsive grids without breakpoints:
```jsx
<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">
```

### Strategy 3: Conditional Rendering
Different components per breakpoint:
```jsx
{isMobile ? <Drawer /> : <Dialog />}
```

### Strategy 4: Fluid Spacing
Use viewport-relative units:
```jsx
<div className="px-4 md:px-8 lg:px-16">
```

## Image Optimization

### Responsive Images
- **srcset**: Multiple image sizes for different screens
- **sizes**: Hint to browser about display size
- **Next.js Image**: Automatic optimization and lazy loading

### Art Direction
Different crops for different screens:
```jsx
<picture>
  <source media="(min-width: 768px)" srcset="wide.jpg" />
  <img src="square.jpg" alt="..." />
</picture>
```

## Performance Considerations

### Critical CSS
- Inline critical styles for above-the-fold content
- Defer non-critical styles
- Reduce layout shift (CLS)

### Lazy Loading
- Images below the fold
- Components not immediately visible
- Intersection Observer for trigger

### Reduced Motion
Respect user preferences:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Testing Checklist

- [ ] Test on real mobile devices (iOS and Android)
- [ ] Verify all breakpoints (320px, 375px, 768px, 1024px, 1920px)
- [ ] Check landscape and portrait orientations
- [ ] Test touch interactions (tap targets, swipe gestures)
- [ ] Validate text remains readable at all sizes
- [ ] Ensure images load appropriately per screen size
- [ ] Verify navigation works on mobile (hamburger menus)
- [ ] Test forms on mobile (input types, keyboard behavior)
- [ ] Check for horizontal scroll issues
- [ ] Validate container queries work as expected
- [ ] Test with browser zoom (200%, 400%)
- [ ] Verify reduced motion preferences respected
