# Run 21: Memory Impact

## Lessons Learned

### Semantic Color System
- **Pattern**: When overhauling a design system, update CSS variables FIRST, then theme objects, then component contracts, then pages, then tests — in that order.
- **Lesson**: The `runtimeTheme` object in `design-system.ts` must be kept in sync with CSS variables. A mismatch causes subtle UI bugs that are hard to catch without visual regression testing.
- **Lesson**: Dark mode colors need careful contrast checking. The light blue (`#60a5fa`) accent works well on dark backgrounds but would fail on light backgrounds.

### Auto-detected Swap Events
- **Pattern**: Background polling with `setInterval` is a pragmatic solution when the underlying system doesn't expose events.
- **Lesson**: Always store the interval handle and clear it on shutdown to prevent memory leaks and zombie processes.
- **Lesson**: Be careful with temporal dead zones when referencing an object being constructed inside a callback. Use `let` + deferred assignment pattern.

### Peer Passthrough Backend
- **Pattern**: Proxy all external calls through the bridge to keep frontend ignorant of vendor/peer internals.
- **Lesson**: Simple JSON files are sufficient for small, infrequently-changing configuration data. Don't over-engineer with SQLite unless relational queries are needed.

## Patterns to Reuse

1. **JSON file persistence pattern**: Used for local policy, model overrides, and peer config. Simple, effective, no schema migrations needed.
2. **Bridge proxy pattern**: All vendor/peer operations go through bridge HTTP routes. Frontend only knows bridge URL.
3. **Semantic color tokens**: `--rm-accent`, `--rm-error`, `--rm-success`, `--rm-warning` with light/dark variants.

## Anti-patterns to Avoid

1. **Don't return inline objects when callbacks need to reference them**: If a `setInterval` or event listener needs to call methods on an object being constructed, declare the variable first, assign the object, then set up the callback.
2. **Don't put auto-swap logic in the frontend**: Background polling belongs on the backend where it can run continuously regardless of whether the UI is open.
