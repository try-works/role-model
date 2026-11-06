import { Command, Navigation } from "@role-model-router/foldkit";
import { type Url, fromString as urlFromString } from "@role-model-router/foldkit/url";
import { Effect, Option, Schema } from "effect";

import { Message } from "./message";

/**
 * S269 (R11): original runtime-ui URL compatibility.
 *
 * The React client served canonical `/app/*` routes and 20 `legacy-redirect.tsx` entries
 * (`apps/runtime-ui/app/routes.ts`, `app/routes/legacy-redirect.tsx`). The Foldkit shell uses
 * shorter bare URLs. This module is the single inventory + resolver for the already-implemented
 * families:
 *
 * - a supported original path resolves to its real typed route (through `./route`), and the
 *   address bar is canonicalised with a `Navigation.replaceUrl` Command;
 * - a missing original feature target (roles, strategy, workloads, Learning child panels, local
 *   policy/matrix, operator/extensions, ...) is deliberately absent from the target table, so it
 *   stays NotFound and is never redirected to a generic success page;
 * - existing bare URLs stay canonical, compatible aliases. No dependency/vendor change.
 */

/** The 22 map strings copied from the original `legacy-redirect.tsx` redirect table. */
export const LEGACY_REDIRECT_MAP = {
  "/app/local/models": "/app/local/choose",
  "/app/local/swap": "/app/local/llama-swap/swap",
  "/app/local/policy": "/app/local/llama-swap/policy",
  "/app/local/logs": "/app/local/llama-swap/logs",
  "/app/local/matrix": "/app/local/llama-swap/matrix",
  "/app/local/peers": "/app/local/endpoints",
  "/app/control/providers": "/app/remote/providers",
  "/app/control/routing-strategy": "/app/router/strategy",
  "/app/control/runtime-config": "/app/system/runtime-config",
  "/app/control/session-readiness": "/app/system/session-readiness",
  "/app/control/controller": "/app/router/controller",
  "/app/control/endpoints": "/app/connect",
  "/app/control/roles": "/app/models/roles",
  "/app/control/models": "/app/models",
  "/app/control/benchmark": "/app/models/benchmark",
  "/app/endpoints": "/app/connect",
  "/app/endpoints/downstream": "/app/connect/downstream",
  "/app/endpoints/upstream": "/app/connect/upstream",
  "/app/observe": "/app/observe/requests",
  "/app/router/config": "/app/router/strategy",
  "/app/integrations/downstream": "/app/connect/downstream",
  "/app/integrations/upstream": "/app/connect/upstream",
};

/**
 * Typed lookup for the exact map above. `Object.entries` keeps the keys checked against the
 * literal table; the Map's `get` returns `string | undefined` instead of an unchecked index read.
 */
const LEGACY_REDIRECT_LOOKUP: ReadonlyMap<string, string> = new Map(
  Object.entries(LEGACY_REDIRECT_MAP),
);

/** The 20 routes registered with `routes/legacy-redirect.tsx` in the original routes.ts. */
export const LEGACY_REDIRECT_ROUTE_ENTRIES: readonly string[] = [
  "/app/local/swap",
  "/app/local/policy",
  "/app/local/logs",
  "/app/local/matrix",
  "/app/local/peers",
  "/app/control/providers",
  "/app/control/routing-strategy",
  "/app/control/runtime-config",
  "/app/control/controller",
  "/app/endpoints",
  "/app/control/endpoints",
  "/app/control/roles",
  "/app/control/benchmark",
  "/app/control/models",
  "/app/observe",
  "/app/endpoints/downstream",
  "/app/integrations/downstream",
  "/app/endpoints/upstream",
  "/app/integrations/upstream",
  "/app/control/session-readiness",
];

/**
 * Original canonical paths whose surface exists in this shell, mapped to the current canonical
 * URL. `/app/system/runtime` and `/app/system/runtime-config` both map to `/runtime` because the
 * current runtime page is the one implemented route that renders the runtime readback AND the
 * config editor; that merge is recorded explicitly in the S269 evidence.
 */
const CANONICAL_TARGETS = {
  "/app": "/",
  "/app/connect": "/control/endpoints",
  "/app/connect/downstream": "/integrations/downstream",
  "/app/connect/upstream": "/integrations/upstream",
  "/app/learning": "/learning",
  "/app/learning/configuration": "/learning/configuration",
  "/app/learning/decisions": "/learning/decisions",
  "/app/learning/evidence": "/learning/evidence",
  "/app/learning/history": "/learning/history",
  "/app/learning/packs": "/learning/packs",
  "/app/local/choose": "/local/choose",
  "/app/local/endpoints": "/local/peers",
  "/app/local/llama-swap/logs": "/local/logs",
  "/app/local/llama-swap/matrix": "/local/llama-swap/models?view=grid",
  "/app/local/llama-swap/policy": "/local/llama-swap/policy",
  "/app/local/llama-swap/swap": "/local/swap",
  "/app/local/models": "/local/choose",
  "/app/local/peer-models": "/local/peer-models",
  "/app/models": "/models",
  "/app/models/roles": "/models/roles",
  "/app/models/benchmark": "/system/benchmark",
  "/app/observe/activity": "/observe/activity",
  "/app/observe/logs": "/observe/logs",
  "/app/observe/observability-snapshot": "/observe/observability-snapshot",
  "/app/observe/queues": "/observe/queues",
  "/app/observe/requests": "/requests",
  "/app/observe/routing": "/observe/routing",
  "/app/observe/store-degradation-receipts": "/observe/store-degradation-receipts",
  "/app/remote/providers": "/control/providers",
  "/app/router": "/router",
  "/app/router/agent-strategy": "/router/agent-strategy",
  "/app/router/candidates": "/router/candidates",
  "/app/router/config": "/router/config",
  "/app/router/strategy": "/router/strategy",
  "/app/router/workloads": "/router/workloads",
  "/app/router/controller": "/control/controller",
  "/app/router/decisions": "/router/decisions",
  "/app/studio/advanced": "/studio?tab=advanced",
  "/app/studio/audio": "/studio?tab=audio",
  "/app/studio/chat": "/studio?tab=chat",
  "/app/studio/images": "/studio?tab=images",
  "/app/studio/rerank": "/studio?tab=rerank",
  "/app/local/llama-swap/models": "/local/llama-swap/models",
  "/app/system/extensions": "/system/extensions",
  "/app/system/operator": "/system/operator",
  "/app/system/peers": "/system/peers",
  "/app/system/runtime": "/runtime",
  "/control/runtime-config": "/runtime/config",
  "/app/system/runtime-config": "/runtime/config",
  "/app/system/session-readiness": "/session-readiness",
  "/app/system/storage-retention": "/system/storage-retention",
};

const CANONICAL_TARGET_LOOKUP: ReadonlyMap<string, string> = new Map(
  Object.entries(CANONICAL_TARGETS),
);

const DYNAMIC_TARGETS: readonly {
  readonly build: (id: string) => string;
  readonly pattern: string;
  readonly prefix: string;
}[] = [
  {
    build: (id) => `/requests/${id}`,
    pattern: "/app/observe/requests/:requestId",
    prefix: "/app/observe/requests/",
  },
  {
    build: (id) => `/router/decisions/${id}`,
    pattern: "/app/router/decisions/:requestId",
    prefix: "/app/router/decisions/",
  },
];

/** Supported original patterns (static + the two detail patterns), for inventory/reporting. */
export const SUPPORTED_ORIGINAL_PATHS: readonly string[] = [
  ...Object.keys(CANONICAL_TARGETS),
  ...DYNAMIC_TARGETS.map((target) => target.pattern),
];

/**
 * Original feature targets that are NOT implemented in this shell. They stay NotFound and are
 * tracked here so a later feature slice can claim them instead of aliasing them to unrelated
 * success pages now.
 */
export const MISSING_ORIGINAL_TARGETS: readonly {
  readonly path: string;
  readonly reason: string;
}[] = [];

const normalizePath = (pathname: string): string => {
  if (pathname.length <= 1) return pathname;
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed.length === 0 ? "/" : trimmed;
};

/**
 * Resolves an original pathname to the current canonical path (with query/hash), following at
 * most the original redirect map and then the implemented target table. Returns undefined for an
 * original canonical path whose feature is missing, and for unrelated paths.
 */
export const canonicalTargetForPath = (pathname: string): string | undefined => {
  const normalized = normalizePath(pathname);
  const mapped = LEGACY_REDIRECT_LOOKUP.get(normalized) ?? normalized;
  const direct = CANONICAL_TARGET_LOOKUP.get(mapped);
  if (direct !== undefined) return direct;
  for (const target of DYNAMIC_TARGETS) {
    if (mapped.startsWith(target.prefix)) {
      const id = mapped.slice(target.prefix.length);
      if (id.length > 0 && !id.includes("/")) return target.build(id);
    }
  }
  return undefined;
};

export interface LegacyRedirect {
  /** The canonical href the address bar should show. */
  readonly href: string;
  /** The original pathname that triggered the replace. */
  readonly originalPath: string;
  /** The canonical URL the typed route is parsed from. */
  readonly url: Url;
}

const splitTarget = (
  target: string,
): { readonly hash: string; readonly pathname: string; readonly query: string | undefined } => {
  const hashIndex = target.indexOf("#");
  const withoutHash = hashIndex === -1 ? target : target.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : target.slice(hashIndex);
  const queryIndex = withoutHash.indexOf("?");
  return queryIndex === -1
    ? { hash, pathname: withoutHash, query: undefined }
    : {
        hash,
        pathname: withoutHash.slice(0, queryIndex),
        query: withoutHash.slice(queryIndex + 1),
      };
};

interface UrlSearchAndHash {
  readonly hash: string;
  readonly search: string;
}

const searchAndHash = (url: Url): UrlSearchAndHash => ({
  hash: Option.getOrUndefined(url.hash) ?? "",
  search: Option.getOrUndefined(url.search) ?? "",
});

/** The exact path + query + hash an address bar shows for this Url (empty parts omitted). */
export const canonicalHrefForUrl = (url: Url): string => {
  const { hash, search } = searchAndHash(url);
  const query = search.length > 0 ? `?${search}` : "";
  const fragment = hash.length > 0 ? `#${hash}` : "";
  return `${url.pathname}${query}${fragment}`;
};

const FIXED_SEARCH_ORIGINAL_PATHS: ReadonlySet<string> = new Set([
  "/app/local/matrix",
  "/app/local/llama-swap/matrix",
]);

const fixedTargetHref = (target: string): string => {
  const { hash, pathname, query } = splitTarget(target);
  return pathname + (query === undefined || query.length === 0 ? "" : `?${query}`) + hash;
};

const canonicalHref = (target: string, url: Url): string => {
  const { hash, pathname, query } = splitTarget(target);
  const incoming = searchAndHash(url);
  const search = [query, incoming.search]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join("&");
  const suffixHash = incoming.hash.length > 0 ? `#${incoming.hash}` : hash;
  return pathname + (search.length > 0 ? `?${search}` : "") + suffixHash;
};

/**
 * Returns the canonical replace target for an original `/app/*` URL whose family is implemented.
 * Returns undefined for bare canonical URLs and for explicit missing targets.
 */
export const legacyRedirectForUrl = (url: Url): LegacyRedirect | undefined => {
  const target = canonicalTargetForPath(url.pathname);
  if (target === undefined) return undefined;
  const href = FIXED_SEARCH_ORIGINAL_PATHS.has(normalizePath(url.pathname))
    ? fixedTargetHref(target)
    : canonicalHref(target, url);
  const parsed = Option.getOrThrow(urlFromString(`http://foldkit.local${href}`));
  return { href, originalPath: url.pathname, url: parsed };
};

/**
 * The redirect itself is a Command, not a history call inside update: the runtime owns effects.
 * Navigation.replaceUrl replaces the current entry (no extra back-button stop) and emits
 * `foldkit:urlchange`, which the routing config turns into a `ChangedUrl` message.
 */
export const replaceLegacyUrlCommand = Command.define("ReplaceLegacyUrl", {
  args: { href: Schema.String },
  messages: [Message.NavigationCompleted],
  execute: ({ href }) =>
    Navigation.replaceUrl(href).pipe(Effect.map(() => Message.NavigationCompleted())),
});
