# S274 — native bounded re-check of the S272 URL repair (frozen bytes)

Reviewer model identity: **deepseek-flash** — verified live, not assumed: my system prompt declares the
deepseek-flash model and `list_agents` (read 2026-10-27T16:16+08:00) reports target `s5-health-wait`,
`model: "deepseek-flash"`, status running. Not taken from an inactive teammate record.
Mode: read-only. No product writes, no children, no CLI launches, no provider/operator calls, no
suites, no commits. Only this file was written.
Basis: S272 writer report `evidence/other/s272-url-review-repair.md`, S271 review
`evidence/other/s271-url-review.md`, and the frozen working tree. Writer reported complete/exit 0 and
the Lead declared the URL source/tests frozen; I re-hashed all eight reviewed files before and after
the inspection and the bytes were unchanged during it (table below), so the findings apply to frozen bytes.

## Verdict: PASS (bounded) for P1 and P2

The two S271 defects are repaired in the frozen code, the suppression is now keyed to our own pending
replace echo only, and the genuine same-route path keeps its baseline read/refresh-reset/resync/scroll.
Limits are listed at the end; none re-opens the two defects.

## P1 — own-echo-only suppression (PASS)

Evidence (file:line):

- `src/model.ts:19-20` — `pendingRedirectHref` is an optional `Schema.String` model field (the exact
  canonical href of the one pending replace echo). Per-instance model state, not closure-global.
- `src/update.ts:122-136` — `isPendingRedirectEcho` requires all of: `resolved.redirectHref === undefined`
  (the incoming URL is already canonical), the marker exists, the marker **equals the incoming canonical
  href exactly** (`canonicalHrefForUrl`, path+query+hash), and `sameRoute(...)`. The old
  `sameRoute`-only no-op is gone.
- `src/update.ts:284-286` — the first exact match consumes the marker and returns **zero** commands
  (no duplicate read), and the marker is cleared.
- `src/update.ts:287-289` — every other canonical navigation clears the marker and runs the baseline
  `navigateToRoute` path: read command + `refresh { message: undefined, resyncToken + 1, status: "idle" }`
  + `ScrollShellToTop` (readback branch `src/update.ts:235-255`; scroll at 218/240/257).
- `src/update.ts:291-298` and `src/init.ts:172-178` — a legacy navigation emits the real
  `replaceLegacyUrlCommand` and records the exact href it expects to echo back.
- Tests on frozen bytes: `test/s269-canonical-url.test.ts:421-447` (one echo consumed with 0 commands and
  no resync bump, then a genuine same-route `ChangedUrl` produces one read, a scroll, refresh reset and
  `resyncToken + 1`); 449-471 (changed/ repeated query); 473-495 (different detail IDs); 497-515
  (repeated diagnostics IDs); 517-536 (interleaved real navigation clears the marker, late echo reads);
  538-555 (the first exact match is always treated as the echo, and the real echo then reads — the read
  is delayed, never dropped).

Re-check of the two S271 failure modes: (a) clicking the active nav link / re-pushing the current URL
with no marker → `navigateToRoute` → read/resync/scroll (unit 421-447 and 572-576; mounted
`test/s269-canonical-url.scene.test.ts:292-311` shows a second `/requests` read after a same-path
`pushState` + `foldkit:urlchange`); (b) `/studio?tab=images` → bare `/studio` no longer keeps `images`.

## P2 — bare /studio becomes chat (PASS)

- `src/update.ts:191-213` — the `Studio` branch of `navigateToRoute` now always re-seeds Studio state as
  `studioIdle(studioTabFromUrl(canonicalUrl) ?? "chat")` (`src/update.ts:210`). A bare `/studio` has no
  `tab`, so the tab becomes `chat`; `?tab=<valid>` still selects that tab.
- `src/studio.ts:8-16` (`studioTabFromSearch`/`studioTabFromUrl`, undefined when absent/invalid) and
  `src/studio.ts:37-56` (`studioIdle(tab = "chat")`).
- Tests: `test/s269-canonical-url.test.ts:557-563` (`/studio` from `studioIdle("images")` → `chat`, one
  read, `resyncToken + 1`); 565-569 (`/studio?tab=audio` → `audio` and reads); 590-602 (initial legacy
  Studio alias + initial `/studio?tab=images`). Mounted: `test/s269-canonical-url.scene.test.ts:167-188`
  (`/app/studio/images` → `/studio?tab=images`, `aria-selected` tab = images, title).

## Exact redirect map / no fabricated success (re-verified statically)

- `src/legacy-redirects.ts:24-47` — 22 map strings, verbatim; :58-79 — 20 `legacy-redirect.tsx` route
  entries; :87-123 — 35 static canonical targets; :129-144 — the 2 detail patterns
  (`/app/observe/requests/:requestId`, `/app/router/decisions/:requestId`); :147-150 — 37 supported
  (35 + 2); :157-200 — 15 explicit missing targets; :202-225 — resolver returns `undefined` for missing
  targets (they stay NotFound; no generic success page).
- 37 supported + always-canonical `/` + 15 missing = the 53 original canonical patterns; map-only keys
  are exactly `/app/local/models` and `/app/router/config`; the 4 unresolvable entries are
  `/app/local/policy`, `/app/local/matrix`, `/app/control/routing-strategy`, `/app/control/roles`.
  Tests: `test/s269-canonical-url.test.ts:273-297` (20↔22 inventory, map-only pair, 4 unresolvable),
  :299-333 literal 16 resolvable href/tag table, :43-62 literal route-entry list.
- Query/hash and detail contracts: `src/legacy-redirects.ts:270-278` (canonical href keeps incoming
  query and prefers the incoming hash) and the replace Command `src/legacy-redirects.ts:297-301`
  (`Navigation.replaceUrl`, executed as a Command, not a reducer mutation); tests :408-419 (one read +
  one `ReplaceLegacyUrl` with href), :578+ (detail ID in both read and replace), :242-246, :325-333.

## Current bytes and limits (frozen at review time)

| File | Bytes | SHA-256 |
|---|---|---|
| src/model.ts | 1702 | 9548B2164F2A9AB5AECE582E9CC0DB88CA314ADF5C20AC1C903106D9C7CF8163 |
| src/route.ts | 9206 | C68B365A7751F50DE1A5FBEA81C70E4D17C275FE9102289A9D2FEC635D007C47 |
| src/legacy-redirects.ts | 12122 | 577AFD6DB0268C9E9E74A59CAA45259C04868F77E0CC431041339D46AD1E49A0 |
| src/init.ts | 8228 | EAFD1F6D87D1591D2E432E006D9BC54E182544EF03F0D24E9ACBDC251D060995 |
| src/update.ts | 31580 | 4CB2880ECE9D56E712EDEC0C9D2CB40358CC775C446299970746B864AAD47D7A |
| src/studio.ts | 4575 | FF3EFE50089DE67E68E36F63937079A05B627D3CEE0F0C9CF162BD0344F079FD |
| test/s269-canonical-url.test.ts | 23344 | F5AD216720EEBDC7ED434A13E5AAB6EB6AF9EA9B98B4AE1BF02655EE97D19FC6 |
| test/s269-canonical-url.scene.test.ts | 10356 | FF5862CC98BF4FF4C82C3D472F5F4B1914B1C5EF0102DF7460EE466FF7F7CFA9 |

Contract limits observed: 22 map strings, 20 route entries, 16 resolvable + 4 missing entries,
35 static + 2 dynamic = 37 supported patterns, 15 explicit missing targets, 53 original canonical
patterns total; the resolver accepts one detail segment with no further `/`
(`src/legacy-redirects.ts:218-223`).

## Limits of this PASS (bounded, no silent-drop claim beyond them)

1. **Echo identity is exact-string only.** The marker is compared against
   `canonicalHrefForUrl(url)` with no trailing-slash/case normalisation (`src/update.ts:134-135`). A
   differently spelled echo of our own replace (e.g. a normalised `/requests/`) is not consumed and
   produces one extra baseline read. That direction is safe: it never suppresses a user navigation.
2. **One exact-href URL change can be absorbed.** If a genuine navigation to the pending exact href
   arrives before the real echo, it is consumed as the echo; the real echo then reads. The read is
   delayed, not dropped (`src/update.ts:122-126`; test :538-555). Any other navigation clears the marker
   (:287-289), so the window is one URL change.
3. **Mounted coverage is partial.** The mounted same-route re-read proof (scene :292-311) covers the
   no-marker case; the marker→echo→genuine path is covered only by the unit update tests
   (:421-447). A mounted variant remains a fair follow-up, not a blocker for P1/P2.
4. **Studio reset is a full idle re-seed** (`studioIdle`, `src/update.ts:210`): switching to bare
   `/studio` resets Studio form state, not only the tab. This matches the baseline route-navigation
   behaviour, but "query preserved" still must not be read as "filters applied" (R12 scope).
5. **Review is static read-only.** Per instruction I ran no suites, no tsc and no new RED/GREEN; the
   writer's logs (`s272-red-tests.log` 7 failed / 84 passed; `s272-green-tests.log` 91/91 targeted and
   108/108 typed lane) are cited as supplied, and the Lead's pending tsc/108 run remains authoritative.
   No packaged acceptance is claimed: source changed, so a rebuild is still required.
6. **Marker lifetime.** `pendingRedirectHref` is model state; any model snapshot/rehydrate that keeps it
   mid-echo could carry it into a later session, bounded to one exact-href navigation and cleared by any
   other navigation. I found no persistence/rehydrate path for the model in the reviewed files.
