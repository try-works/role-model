import type { HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Message } from "../../src/message";
import type { Model } from "../../src/model";
import { AppRoute } from "../../src/route";
import { view } from "../../src/view";
import { shellModel } from "./runtime-shell";

/**
 * S617: handler presence — a structural walker for route Html.
 *
 * Route views receive an HtmlBuilder from the runtime, so outside a runtime there is no builder to call
 * them with. This module supplies a RECORDING builder: it records tag/attribute calls instead of patching
 * a DOM, which preserves the OnClick/OnInput/OnChange/OnSubmit/Href wiring that never survives
 * renderToString. The walker then reports every interactive element whose wiring is absent, and the route
 * scan pins the resulting inventory as a committed baseline.
 *
 * Deliberate limits: elements produced inside a component submodel are only visible when the recorded
 * submodel config exposes a callable view; otherwise the submodel is a container and its inner controls are
 * not inspected. The walker judges wiring that a view supplies — it is not a DOM/runtime listener audit.
 */

type RecordedAttr = Readonly<{ args: ReadonlyArray<unknown>; kind: "attr"; name: string }>;
type RecordedText = Readonly<{ kind: "text"; text: string }>;
type RecordedNode = Readonly<{ attrs: ReadonlyArray<RecordedAttr>; children: ReadonlyArray<RecordedChild>; kind: "node"; tag: string }>;
type RecordedChild = RecordedNode | RecordedText;

export interface InteractiveElement {
  readonly attributeNames: ReadonlyArray<string>;
  readonly dead: boolean;
  readonly disabled: boolean;
  readonly disabledReason: string | null;
  readonly handlers: ReadonlyArray<string>;
  readonly href: string | null;
  readonly label: string;
  readonly path: string;
  readonly role: string | null;
  readonly tag: string;
  readonly wired: boolean;
}

export interface RouteScan {
  readonly disabled: ReadonlyArray<InteractiveElement>;
  readonly elements: ReadonlyArray<InteractiveElement>;
  readonly error?: string;
  readonly route: string;
  readonly unwired: ReadonlyArray<InteractiveElement>;
  readonly wired: ReadonlyArray<InteractiveElement>;
}

export interface InventoryEntry {
  readonly label: string;
  readonly path: string;
  readonly role: string | null;
  readonly tag: string;
}
export interface InventoryRoute {
  readonly disabledCount: number;
  readonly elementCount: number;
  readonly route: string;
  readonly unwired: ReadonlyArray<InventoryEntry>;
  readonly wiredCount: number;
}
export interface Inventory {
  readonly routes: ReadonlyArray<InventoryRoute>;
  readonly totals: Readonly<{ deadControls: number; disabledControls: number; elements: number; routes: number }>;
}

export const INTERACTIVE_TAGS: ReadonlySet<string> = new Set(["a", "button", "input", "select", "textarea"]);
export const INTERACTIVE_ROLES: ReadonlySet<string> = new Set(["button", "option", "tab", "link", "switch", "checkbox", "menuitem", "radio"]);
export const WIRING_EVENTS: ReadonlySet<string> = new Set(["click", "input", "change", "submit", "keydown", "keyup", "pointerdown", "pointerup", "touchstart", "mousedown", "focus", "blur"]);

const isAttr = (value: unknown): value is RecordedAttr => value !== null && typeof value === "object" && (value as { kind?: string }).kind === "attr";
const isNode = (value: unknown): value is RecordedNode => value !== null && typeof value === "object" && (value as { kind?: string }).kind === "node";
const isText = (value: unknown): value is RecordedText => value !== null && typeof value === "object" && (value as { kind?: string }).kind === "text";

const flatten = (value: unknown, out: unknown[]): void => {
  if (Array.isArray(value)) {
    for (const item of value) flatten(item, out);
    return;
  }
  out.push(value);
};

/**
 * Builds a route Html tree with a recording builder. The returned value is structurally a VNode-like
 * RecordedNode root (or null for an empty view), and the same object is re-exported through HtmlBuilder so
 * production view signatures typecheck unchanged.
 */
export const recordingHtmlBuilder = <MessageT>(): HtmlBuilder<MessageT> => {
  const node = (tag: string, rawArgs: ReadonlyArray<unknown>): RecordedNode => {
    const items: unknown[] = [];
    for (const arg of rawArgs) flatten(arg, items);
    const attrs: RecordedAttr[] = [];
    const children: RecordedChild[] = [];
    for (const item of items) {
      if (isAttr(item)) attrs.push(item);
      else if (isNode(item) || isText(item)) children.push(item);
      else if (typeof item === "string" || typeof item === "number") children.push({ kind: "text", text: String(item) });
    }
    return { attrs, children, kind: "node", tag };
  };

  const builder: Record<string, unknown> = {};
  const proxy = new Proxy(builder, {
    get(_target, key) {
      if (typeof key !== "string") return undefined;
      if (key === "empty") return null;
      if (key === "keyed") return (...rawArgs: ReadonlyArray<unknown>) => node("keyed", rawArgs);
      if (key === "submodel") {
        return (config: unknown) => {
          const inner: unknown[] = [];
          try {
            const candidate = config as { model?: unknown; view?: unknown } | null;
            if (candidate !== null && typeof candidate === "object" && typeof candidate.view === "function") {
              inner.push((candidate.view as (model: unknown, h: unknown) => unknown)(candidate.model, proxy));
            }
          } catch {
            // An opaque submodel still renders its container; its inner controls stay uninspected.
          }
          return node("submodel", inner);
        };
      }
      if (/^[A-Z]/.test(key)) return (...args: ReadonlyArray<unknown>) => ({ args, kind: "attr" as const, name: key });
      return (...args: ReadonlyArray<unknown>) => node(key, args);
    },
  });
  return proxy as unknown as HtmlBuilder<MessageT>;
};

const attrValue = (attrs: ReadonlyArray<RecordedAttr>, name: string): unknown => {
  for (let index = attrs.length - 1; index >= 0; index -= 1) {
    if (attrs[index].name === name) return attrs[index].args[0];
  }
  return undefined;
};
const rawAttribute = (attrs: ReadonlyArray<RecordedAttr>, name: string): string | null => {
  for (let index = attrs.length - 1; index >= 0; index -= 1) {
    if (attrs[index].name !== "Attribute") continue;
    const [rawName, rawValue] = attrs[index].args;
    if (String(rawName).toLowerCase() === name.toLowerCase()) return rawValue === undefined ? "" : String(rawValue);
  }
  return null;
};

const collectText = (node: RecordedNode, parts: string[]): void => {
  for (const child of node.children) {
    if (child.kind === "text") parts.push(child.text);
    else collectText(child, parts);
  }
};

const normalize = (value: string): string => value.replace(/\s+/g, " ").trim();

const eventForAttribute = (name: string): string | null => {
  const match = /^On([A-Z][A-Za-z]+)$/.exec(name);
  if (match === null) return null;
  const event = match[1].toLowerCase();
  return WIRING_EVENTS.has(event) ? event : null;
};

const describe = (node: RecordedNode, path: string): InteractiveElement | null => {
  const tag = node.tag.toLowerCase();
  const role = attrValue(node.attrs, "Role") === undefined ? rawAttribute(node.attrs, "role") : String(attrValue(node.attrs, "Role"));
  const interactive = INTERACTIVE_TAGS.has(tag) || tag === "option" || (role !== null && INTERACTIVE_ROLES.has(role));
  if (!interactive) return null;
  const handlers: string[] = [];
  for (const attr of node.attrs) {
    const event = eventForAttribute(attr.name);
    if (event !== null) handlers.push(event);
  }
  const rawHandler = node.attrs.find((attr) => attr.name === "Attribute" && String(attr.args[0]).toLowerCase().startsWith("on"));
  if (rawHandler !== undefined) handlers.push(String(rawHandler.args[0]).toLowerCase().slice(2));
  const uniqueHandlers = [...new Set(handlers)].sort();
  const hrefValue = attrValue(node.attrs, "Href");
  const href = hrefValue === undefined ? rawAttribute(node.attrs, "href") : String(hrefValue);
  const disabled =
    Boolean(attrValue(node.attrs, "Disabled")) ||
    rawAttribute(node.attrs, "disabled") === "" ||
    rawAttribute(node.attrs, "disabled") === "true" ||
    rawAttribute(node.attrs, "aria-disabled") === "true";
  const labelled =
    attrValue(node.attrs, "AriaLabel") ??
    attrValue(node.attrs, "Placeholder") ??
    rawAttribute(node.attrs, "aria-label") ??
    rawAttribute(node.attrs, "placeholder") ??
    rawAttribute(node.attrs, "name") ??
    rawAttribute(node.attrs, "id") ??
    attrValue(node.attrs, "Value");
  const textParts: string[] = [];
  collectText(node, textParts);
  const text = normalize(textParts.join(" "));
  const label = normalize(String(labelled ?? "")) || text.slice(0, 80) || "(unlabelled " + tag + ")";
  const wired = uniqueHandlers.length > 0 || (tag === "a" && href !== null && href.length > 0);
  return {
    attributeNames: node.attrs.map((attr) => attr.name),
    dead: !wired && !disabled,
    disabled,
    disabledReason: disabled ? normalize(String(attrValue(node.attrs, "DisabledReason") ?? rawAttribute(node.attrs, "data-disabled-reason") ?? "")) || null : null,
    handlers: uniqueHandlers,
    href,
    label,
    path,
    role,
    tag,
    wired,
  };
};

const walk = (node: RecordedNode, path: string, out: InteractiveElement[]): void => {
  const described = describe(node, path);
  if (described !== null) out.push(described);
  const counters = new Map<string, number>();
  for (const child of node.children) {
    if (child.kind !== "node") continue;
    const key = child.tag.toLowerCase();
    const next = (counters.get(key) ?? 0) + 1;
    counters.set(key, next);
    walk(child, path + ">" + key + "[" + next + "]", out);
  }
};

/** Every interactive element in a recorded route Html tree, in document order, with a stable path. */
export const interactiveElements = (html: unknown): InteractiveElement[] => {
  const out: InteractiveElement[] = [];
  if (isNode(html)) walk(html, html.tag.toLowerCase() + "[1]", out);
  else {
    const items: unknown[] = [];
    flatten(html, items);
    for (const item of items) if (isNode(item)) walk(item, item.tag.toLowerCase() + "[1]", out);
  }
  return out;
};

/** The controls a user can reach whose wiring is absent (disabled controls are reported, not dead). */
export const unwiredControls = (html: unknown): InteractiveElement[] => interactiveElements(html).filter((entry) => entry.dead);

const routeFor = (tag: string): Model["route"] => {
  switch (tag) {
    case "Diagnostics":
      return { _tag: "Diagnostics", id: "42" };
    case "RequestDetail":
      return { _tag: "RequestDetail", requestId: "req-1" };
    case "RouterDecisionDetail":
      return { _tag: "RouterDecisionDetail", requestId: "req-1" };
    case "NotFound":
      return { _tag: "NotFound", path: "/missing" };
    default:
      return { _tag: tag } as Model["route"];
  }
};

const routeTags = (): string[] =>
  Object.keys((AppRoute as unknown as { readonly cases: Readonly<Record<string, unknown>> }).cases);

export const scanRouteTag = (tag: string): RouteScan => {
  try {
    const h = recordingHtmlBuilder<Message>();
    const document = view(shellModel({ route: routeFor(tag) }), h);
    const elements = interactiveElements(document.body);
    return {
      disabled: elements.filter((entry) => entry.disabled),
      elements,
      route: tag,
      unwired: elements.filter((entry) => entry.dead),
      wired: elements.filter((entry) => entry.wired),
    };
  } catch (error) {
    return {
      disabled: [],
      elements: [],
      error: error instanceof Error ? error.message : String(error),
      route: tag,
      unwired: [],
      wired: [],
    };
  }
};

export const scanAllRoutes = (): RouteScan[] => routeTags().map(scanRouteTag);

/** Deterministic inventory of every route: the committed baseline is this value, JSON-serialised. */
export const renderInventory = (scans: ReadonlyArray<RouteScan>): Inventory => {
  const routes: InventoryRoute[] = scans.map((scan) => ({
    disabledCount: scan.disabled.length,
    elementCount: scan.elements.length,
    route: scan.route,
    unwired: scan.unwired.map((entry) => ({ label: entry.label, path: entry.path, role: entry.role, tag: entry.tag })),
    wiredCount: scan.wired.length,
  }));
  return {
    routes,
    totals: {
      deadControls: routes.reduce((sum, route) => sum + route.unwired.length, 0),
      disabledControls: routes.reduce((sum, route) => sum + route.disabledCount, 0),
      elements: routes.reduce((sum, route) => sum + route.elementCount, 0),
      routes: routes.length,
    },
  };
};

/** Human-readable inventory for evidence logs (the committed baseline stays JSON). */
export const formatInventoryText = (inventory: Inventory): string =>
  inventory.routes
    .map((route) => {
      const head = route.route + ": " + String(route.elementCount) + " interactive, " + String(route.wiredCount) + " wired, " + String(route.disabledCount) + " disabled, " + String(route.unwired.length) + " dead";
      const lines = route.unwired.map((entry) => "  - " + entry.tag + (entry.role === null ? "" : "[role=" + entry.role + "]") + " " + JSON.stringify(entry.label) + " @ " + entry.path);
      return [head, ...lines].join("\n");
    })
    .join("\n");
