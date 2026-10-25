---
title: Foldkit 0.169.0
description: Runtime and overlay fixes, better DevTools MCP discovery, and new testing and Route transition helpers.
date: 2026-10-20
coverImage: /blog/foldkit-0-169-0/cover.png
coverImageAlt: The number 169 outlined in light gray above a dashed 168 on a black background.
coverImageWidth: 3600
coverImageHeight: 2400
---

Foldkit 0.169.0 is out, with fixes for lost input, portals, and overlays. This post also covers 0.168.0.

## Runtime and UI fixes

Typing during deferred updates no longer loses keystrokes. Portaled views update without crashing, and focused overlays close cleanly. Other fixes cover trigger clicks, focus handling, repeated opens, inert state, and input-method composition.

Thank you to [@servaasvdc](https://github.com/servaasvdc) for the input fix, [@artile](https://github.com/artile) for the portal and teardown fixes, and [@armancharan](https://github.com/armancharan) for the overlay and keyboard fixes!

## DevTools MCP discovery

An agent can find several running Foldkit apps, and the dev server can start after the agent. Upgrade the Vite plugin and MCP server together; the [MCP guide](/ai/mcp) covers setup.

Thank you to [@filipfalcon](https://github.com/filipfalcon) for the discovery improvements!

## More in these releases

- [`Lazy.expectAllReused`](/core/view-memoization) checks view cache reuse, and [DragAndDrop](/ui/drag-and-drop) adds helpers for keyboard Story tests. Thank you to [@Tanner-Scadden](https://github.com/Tanner-Scadden) for the testing helpers and documentation!
- [Route transition matchers](/core/routing-and-navigation#route-transitions) handle entry, exit, and stay policies with narrowed Route payloads. Thank you to [@SyahrulBhudiF](https://github.com/SyahrulBhudiF) for contributing them!
- Generated apps get [Effect-aware linting](/tooling/oxlint-plugin), and fresh SSR projects get compatible Effect dependencies. Other tooling fixes cover DevTools relay recovery and browser Playgrounds.
- Server rendering reduces repeated HTML parsing. Thank you to [@drobson03](https://github.com/drobson03) for the performance report!
- Meter, Nav, and Progress gain package subpaths in 0.168.0. Thank you to [@Awjin](https://github.com/Awjin) for contributing the exports!

See the [0.169.0 notes](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.169.0), [0.168.0 notes](https://github.com/foldkit/foldkit/releases/tag/foldkit%400.168.0), and [companion package releases](https://github.com/foldkit/foldkit/releases) for the complete changes and migration details.

Thanks to everyone building with Foldkit!

Devin
