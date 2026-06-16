# Docs Site Information Architecture Proposal

This document proposes a cleanup of the public docs site information architecture in
`apps/docs-site/content/docs/`.

The current site is materially better than the older version, but its top-level
navigation still has one structural problem:

- `Router` and `Routing` both explain the same decision pipeline at different altitudes
- `Operators` is really a runtime-product section, not a generic operator theory section

That makes the site harder to scan than it needs to be, especially for first-time users
who are trying to understand the runtime router and then deepen into semantics.

## Goals

The proposed IA should do four things at once:

- keep the first-run path obvious for new users
- keep runtime-product pages close to setup pages
- collapse overlapping router documentation into one coherent section
- preserve the deeper routing semantics the old site documented well

## Current top-level structure

The docs root currently orders sections like this:

1. `index`
2. `get-started`
3. `concepts`
4. `router`
5. `operators`
6. `reference`
7. `protocol`
8. `routing`

In practice, that means a user sees:

- setup guidance
- abstract concepts
- product-facing router explanation
- runtime UI workflow
- reference and protocol
- then a second routing section later in the sidebar

The split between `Router` and `Routing` is the main source of redundancy.

## Current overlap analysis

The current `Router` section is:

- `overview`
- `routing-modes-locality-and-execution`
- `strategy-modes-and-tradeoffs`
- `candidate-selection`
- `scoring-and-tie-breaks`
- `decisions-fallbacks-and-failures`

The current `Routing` section is:

- `index`
- `how-routing-works-end-to-end`
- `candidate-discovery`
- `eligibility-and-rejection`
- `comparison-and-tradeoffs`
- `decision-semantics`
- `routing-outcomes-and-failure-modes`
- `observability-of-routing`
- `protocol-to-router-mapping`

The current `Operators` section is:

- `runtime-ui-tour`
- `models-and-role-activation`
- `benchmarks-and-evaluation`
- `routing-controls-and-decision-review`

## Where `Router` and `Routing` overlap

The duplication is not accidental. It comes from documenting the same pipeline in both a
product-facing voice and a reference-semantics voice.

### Overlap cluster 1: section entry and end-to-end explanation

These pages all serve as routing entry points:

- `router/overview.mdx`
- `routing/index.mdx`
- `routing/how-routing-works-end-to-end.mdx`

Problem:

- all three introduce the routing pipeline
- two of them explain why routing is separate from other docs
- the deep flow page is strong, but the two landing pages compete for the same reader

Recommendation:

- keep one `Router` landing page
- keep one deep end-to-end flow page
- retire the separate `Routing` landing page as a top-level concept

### Overlap cluster 2: candidate construction, eligibility, and exclusion

These pages explain the pre-scoring phase:

- `router/candidate-selection.mdx`
- `routing/candidate-discovery.mdx`
- `routing/eligibility-and-rejection.mdx`

Problem:

- `candidate-selection` already explains why policy and compatibility must exclude before scoring
- `candidate-discovery` explains upstream assembly of candidates
- `eligibility-and-rejection` explains concrete rejection codes

These are distinct depths, but they are one conceptual stage from a reader perspective.

Recommendation:

- merge these into one router page named `Candidate selection and eligibility`
- keep the page layered:
  - what enters the candidate set
  - what hard checks remove a candidate
  - which reason codes the baseline emits

### Overlap cluster 3: scoring, strategy, comparison, and tie-breaks

These pages explain the comparison phase:

- `router/strategy-modes-and-tradeoffs.mdx`
- `router/scoring-and-tie-breaks.mdx`
- `routing/comparison-and-tradeoffs.mdx`
- `routing/decision-semantics.mdx`

Problem:

- strategy meaning is documented in one place
- scoring metrics are documented in two places
- tie-break semantics and fallback ordering are split again
- a reader has to cross-reference multiple pages to understand how a saved strategy
  becomes a final ordered decision

Recommendation:

- keep `Scoring strategies and tradeoffs` as the operator-facing strategy page
- merge the deeper scoring material into a single page named
  `Scoring, tie-breaks, and decisions`
- fold `comparison-and-tradeoffs` and the determinism parts of `decision-semantics`
  into that page

### Overlap cluster 4: outcomes, failures, fallbacks, and observability

These pages explain the post-ranking artifact:

- `router/decisions-fallbacks-and-failures.mdx`
- `routing/routing-outcomes-and-failure-modes.mdx`
- `routing/observability-of-routing.mdx`

Problem:

- fallbacks and no-match outcomes are split across product and protocol language
- observability is treated as a separate routing page even though operators mostly
  experience it through the decision and runtime surfaces

Recommendation:

- merge these into one page named `Fallbacks, failures, and observability`
- keep the `RouterDecision` explanation there
- keep trace and usage observability there as the deeper follow-through

### Clearly distinct page that should survive

One `Routing` page is clearly unique and should survive as a deep router page:

- `routing/protocol-to-router-mapping.mdx`

Why it is different:

- it explains what is canonical in the protocol versus what belongs to the reference
  router implementation
- this is an architecture boundary page, not just another stage of the routing flow

## Proposed top-level structure

The proposal is to collapse `Routing` into `Router` and rename `Operators` to
`Runtime`.

Target sidebar order:

1. `index`
2. `get-started`
3. `runtime`
4. `router`
5. `concepts`
6. `reference`
7. `protocol`

Why this order is better:

- `Get Started` stays the first operational path
- `Runtime` follows immediately because it is the product surface the user touches next
- `Router` follows because it explains how the system is making decisions
- `Concepts`, `Reference`, and `Protocol` remain available as deeper study layers

## Proposed `Runtime` section

Rename `operators/` to `runtime/`.

Target `Runtime` pages:

- `runtime-ui-tour`
- `models-and-role-activation`
- `benchmarks-and-evaluation`
- `routing-controls-and-decision-review`

Why rename it:

- these pages are not general operator policy
- they document the runtime application, runtime UI, and runtime workflow
- `Runtime` is a clearer label for new users and future contributors

## Proposed `Router` section

The merged `Router` section should hold both the product-facing explanation and the
deeper semantics, but in one ordered progression.

Target `Router` pages:

1. `overview`
2. `routing-modes-locality-and-execution`
3. `strategy-modes-and-tradeoffs`
4. `candidate-selection-and-eligibility`
5. `scoring-tie-breaks-and-decisions`
6. `fallbacks-failures-and-observability`
7. `how-routing-works-end-to-end`
8. `protocol-to-router-mapping`

Why this works:

- the first three pages answer the practical product questions
- the next three pages explain the pipeline in detail without section duplication
- the final two pages preserve the deeper semantics and architecture boundaries

## Proposed page mapping

### Keep mostly as-is

Keep these pages with only local edits:

- `router/overview.mdx`
- `router/routing-modes-locality-and-execution.mdx`
- `router/strategy-modes-and-tradeoffs.mdx`
- `routing/how-routing-works-end-to-end.mdx`
- `routing/protocol-to-router-mapping.mdx`

### Merge into `candidate-selection-and-eligibility.mdx`

Source pages:

- `router/candidate-selection.mdx`
- `routing/candidate-discovery.mdx`
- `routing/eligibility-and-rejection.mdx`

Target page responsibilities:

- define what a routable candidate is
- explain upstream candidate assembly
- explain hard eligibility filtering
- preserve concrete rejection-code behavior

### Merge into `scoring-tie-breaks-and-decisions.mdx`

Source pages:

- `router/scoring-and-tie-breaks.mdx`
- `routing/comparison-and-tradeoffs.mdx`
- `routing/decision-semantics.mdx`

Target page responsibilities:

- explain metric scoring and normalization
- explain how strategies weight those metrics
- explain unknown-metric redistribution
- explain deterministic near-ties and final ordering
- explain why decisions remain stable and explainable over time

### Merge into `fallbacks-failures-and-observability.mdx`

Source pages:

- `router/decisions-fallbacks-and-failures.mdx`
- `routing/routing-outcomes-and-failure-modes.mdx`
- `routing/observability-of-routing.mdx`

Target page responsibilities:

- explain the `RouterDecision` artifact as the operator entry point
- explain fallback chain semantics
- explain no-eligible and degraded-evidence outcomes
- explain how traces, usage, and observed profiles extend the decision story

### Retire the separate `routing/index.mdx`

The section landing page becomes unnecessary once routing no longer exists as a separate
top-level section.

Its useful framing should be absorbed into:

- `router/overview.mdx`
- `routing/how-routing-works-end-to-end.mdx`

## Proposed navigation behavior

The merged structure should follow one rule:

- top-level sections represent user intent, not internal taxonomy

That means:

- `Runtime` is where users learn the running product
- `Router` is where users learn how routing decisions are made
- `Protocol` is where users inspect canonical object-model semantics
- `Reference` is where users look up stable vocabularies and schemas

The current `Router` versus `Routing` split violates that rule because both sections map
to the same user intent: “help me understand routing.”

## Why this is better for new users

A new user should be able to follow this path without guessing:

1. install
2. connect endpoints and models
3. assign roles
4. run the benchmark
5. choose and save strategy
6. inspect runtime decisions
7. deepen into router mechanics only when needed

The proposed ordering makes that path much more obvious:

- `Get Started` covers the first-run sequence
- `Runtime` covers the product surface they will use immediately
- `Router` explains the routing system they are now observing

## Why this still preserves the old site's strengths

You specifically wanted the older routing and protocol material preserved because it
documented the deeper semantics well.

This proposal keeps that material, but moves it into a stronger hierarchy:

- the semantics stay in the docs
- the duplicated entry points go away
- the reader no longer has to choose between two different routing sections

The result is not less documentation. It is the same depth with a cleaner ownership
model.

## Migration and compatibility rules

If this proposal is implemented, the migration should preserve link stability.

Recommended rules:

- keep existing pages available with redirects where possible
- do not silently break old `/routing/*` links
- where a page is merged, redirect the old page to the closest surviving merged page
- update local cross-links in the docs tree during the same change

Suggested redirect mapping:

- `/operators/*` -> `/runtime/*`
- `/routing/candidate-discovery` -> `/router/candidate-selection-and-eligibility`
- `/routing/eligibility-and-rejection` -> `/router/candidate-selection-and-eligibility`
- `/routing/comparison-and-tradeoffs` -> `/router/scoring-tie-breaks-and-decisions`
- `/routing/decision-semantics` -> `/router/scoring-tie-breaks-and-decisions`
- `/routing/routing-outcomes-and-failure-modes` -> `/router/fallbacks-failures-and-observability`
- `/routing/observability-of-routing` -> `/router/fallbacks-failures-and-observability`
- `/routing` -> `/router/overview`

The two surviving deep pages should move into `/router/` or have stable forwarding:

- `/routing/how-routing-works-end-to-end`
- `/routing/protocol-to-router-mapping`

Preferred end state:

- relocate them into `/router/`
- keep redirects from the old `/routing/*` paths

## Implementation sequence

Implementation should happen in a small number of controlled passes.

### Pass 1: rename and reorder sections

- rename `operators` section label to `runtime`
- move `runtime` directly after `get-started`
- remove `routing` from root navigation as a separate section

### Pass 2: merge router and routing content

- create the three merged router pages
- update `router/meta.json`
- reduce the old `routing/` pages to redirects or remove them after redirect support exists

### Pass 3: repair cross-links and summaries

- update all `Read next` blocks
- update any section descriptions that still mention `Operators` or separate `Routing`
- update landing pages to reflect the merged IA

### Pass 4: verify locally

- build the docs site
- click through the full sidebar order
- verify no orphaned links, dead routes, or contradictory section intros remain

## Approval criteria

This IA should be considered approved only if all of the following are true:

- a first-time reader can infer the setup path from the sidebar alone
- `Runtime` reads as the product surface section
- there is only one top-level section for routing behavior
- the deeper routing semantics still exist and are easy to find
- protocol pages remain lower in the sidebar but still complete and up to date

## Proposed decision

Approve the following structural change:

- rename `Operators` to `Runtime`
- place `Runtime` immediately after `Get Started`
- collapse `Routing` into `Router`
- keep one merged `Router` section that spans product explanation through deep routing
  semantics
- preserve routing depth through merged pages plus two deep architecture pages:
  `How routing works end to end` and `Protocol-to-router mapping`

That is the cleanest way to reduce duplication without throwing away any of the routing
material that made the older docs valuable.
