# S181 I added a skip link, broke the app, and only loading the page showed it

The browser audit found the shell had landmarks and `lang` but **no bypass block**. The sidebar repeats on every route, so a keyboard user had to tab through it each time (WCAG 2.4.1).

## The fix, and the crash

I added:

```js
h.a([h.Href("#main-content"), h.Class("sr-only focus:not-sr-only …")], ["Skip to content"])
```

and put it in the shell div. **In the attribute array.** Foldkit treated the anchor as an attribute builder and the running app died:

```
Application Crash
Foldkit encountered an unrecoverable error while running your application.
handler is not a function
```

The build passed. The unit suites passed. `node --check` passed. Only **loading the page** showed it - and only because I was re-verifying the link in the browser rather than trusting the diff.

## Fixed properly

The anchor is now the first **child** of the shell, and `main` carries `id="main-content"`. Verified live:

```
hasSkip: true   skipText: "Skip to content"   mainTag: MAIN   crash: false
hidden state : 1x1 px, clip-path inset(50%), position absolute
focused state: 108x34 px, background rgb(255,255,255), color rgb(10,10,10)
first Tab stop: the skip link
```

## Regression guard

`test/s181-skip-link.test.mjs` (2 tests): the link and target exist, and the anchor sits **after** the shell attribute array (the exact mistake). RED 0/2 against committed source, GREEN 2/2 after; 8/8 together with the S175/S177/S178 invariants; `runtime-ui-next` **289/289**.

## What this round actually proves

Three UI rounds in a row I have found defects that the test suite could not see (invisible Run button, self-describing labels, unreadable light theme) - and this time I **created** one while fixing another. The common factor is that all four were layout/composition errors: valid code, valid markup, wrong result on screen.

An HTTP-level gate cannot catch any of them. A rendered check would have caught all four, including my own regression, which is the strongest argument yet for adding a browser-backed UI check to CI rather than relying on my browser sessions.