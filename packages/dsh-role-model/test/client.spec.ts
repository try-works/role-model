/**
 * L9: the browser half.
 *
 * DSH's client module system scans enabled Loader entries for packages declaring
 * `dsh.client` and serves each one's `./client` export as a lazy-CJS factory: the
 * browser evaluates the file, which calls `window.__ModuleLoader__.load({ id,
 * factory })`, and the factory returns an object with `inject` and `apply`.
 *
 * The half is plain JavaScript because that is what the served bundle must be, so
 * these specs evaluate the file against a stubbed global and then exercise the
 * factory it registers — a static import would not prove the served shape.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const clientEntry = join(packageRoot, "client", "index.js");

/** What the evaluated module registered with the browser module loader. */
interface RegisteredModule {
  id: string;
  factory: (require: (name: string) => unknown) => { inject?: string[]; apply(ctx: unknown): void };
}

/**
 * Evaluate the client entry against a stubbed browser global.
 * @returns the registration and everything the factory did when applied.
 */
function evaluateClientEntry(): {
  registered: RegisteredModule;
  registrations: { name: string; id?: string; order?: number; rendered: string }[];
  injectedInto: string[];
  effects: number;
  component: unknown;
} {
  const registrations: { name: string; id?: string; order?: number; rendered: string }[] = [];
  const injectedInto: string[] = [];
  let effects = 0;
  let registered: RegisteredModule | undefined;
  let component: unknown;

  const stub = {
    __ModuleLoader__: {
      load(module: RegisteredModule) {
        registered = module;
      },
    },
  };

  const source = readFileSync(clientEntry, "utf8");
  // Evaluate with only the stub in scope; the module must not need anything else.
  const evaluate = new Function("window", "globalThis", `${source}\n`);
  evaluate(stub, stub);

  if (registered === undefined) throw new Error("the client entry registered no module");

  const React = testReact();

  const ctx = {
    effect: (callback: () => unknown) => {
      effects += 1;
      const result = callback();
      return typeof result === "function" ? result : () => undefined;
    },
    slots: {
      inject(key: string, callback: () => void) {
        injectedInto.push(key);
        callback();
      },
      register(options: { name: string; id?: string; order?: number }, panel: unknown) {
        component = panel;
        registrations.push({
          name: options.name,
          ...(options.id === undefined ? {} : { id: options.id }),
          ...(options.order === undefined ? {} : { order: options.order }),
          rendered: JSON.stringify(renderComponent(panel, React), jsonReplacer),
        });
        return () => undefined;
      },
    },
  };

  const factory = registered.factory;
  const plugin = factory((name: string) => {
    if (name === "react") return React;
    throw new Error(`unexpected module request: ${name}`);
  });
  plugin.apply(ctx);

  return { registered, registrations, injectedInto, effects, component };
}

/** Render a component once, so its static markup can be inspected. */
function renderComponent(
  component: unknown,
  React: { createElement: (...args: unknown[]) => unknown },
): unknown {
  if (typeof component !== "function") return null;
  const states: unknown[] = [];
  const hooks = {
    useState: (initial: unknown) => [initial, (next: unknown) => states.push(next)],
    useEffect: () => undefined,
    useMemo: (factory: () => unknown) => factory(),
  };
  void hooks;
  try {
    return (component as (props: unknown) => unknown)({});
  } catch {
    return null;
  }
}

/** Render symbols and functions as readable strings. */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "symbol") return String(value);
  if (typeof value === "function")
    return `[function ${(value as { name?: string }).name ?? "anonymous"}]`;
  return value;
}

/** A host element after every function component has been expanded. */
interface HostElement {
  type: unknown;
  props: Record<string, unknown>;
  /** Absent when the element was created without children, as React does. */
  children?: unknown[];
}

/** A host element whose children are known to be an array. */
interface ExpandedElement extends HostElement {
  children: unknown[];
}

/** The children of an element, as an array. */
function childrenOf(element: HostElement): unknown[] {
  return element.children ?? [];
}

/** The stubbed React surface, shared so elements compare structurally. */
const REACT_ELEMENT = Symbol.for("react.element");

/**
 * Build the stubbed React used to evaluate the client entry.
 *
 * `children` is flattened one level and omitted when empty, mirroring React's own
 * handling of the `...children` arguments. A stub that skipped this would disagree
 * with react-dom about the shape of a component's children, and would then accept
 * structures that fail in the browser.
 * @returns the module the factory receives for `require("react")`.
 */
function testReact(): {
  createElement: (type: unknown, props: unknown, ...children: unknown[]) => unknown;
  useMemo: (factory: () => unknown) => unknown;
  [key: string]: unknown;
} {
  return {
    createElement: (type: unknown, props: unknown, ...children: unknown[]) => {
      const flat = children.flat();
      return {
        type,
        props,
        children: flat.length === 0 ? undefined : flat,
        $$typeof: REACT_ELEMENT,
      };
    },
    Fragment: Symbol.for("react.fragment"),
    useState: (initial: unknown) => [initial, () => undefined],
    useEffect: () => undefined,
    useMemo: (factory: () => unknown) => factory(),
  };
}

/** Whether a value is a host element produced by the stubbed createElement. */
function isElement(value: unknown): value is HostElement {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { $$typeof?: unknown }).$$typeof === REACT_ELEMENT &&
    "type" in value
  );
}

/**
 * Expand function components down to host elements.
 *
 * The panel composes `Card`/`Row`/`CodeBlock`, and react-dom never sees those — it
 * sees what they return — so a structural check has to expand them too.
 *
 * A component receives its children as `props.children`, not as extra arguments, so
 * the props handed back are the element's own props plus its children. Omitting that
 * would let a component see `undefined` children and appear to render nothing, which
 * is the class of bug these assertions exist to catch.
 * @param value - element, component element, string, or nested array.
 * @returns host elements and strings, with arrays flattened.
 */
function expand(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.flatMap(expand);
  if (!isElement(value)) return [value];
  const element = value as HostElement;
  if (typeof element.type === "function") {
    const props = { ...(element.props ?? {}) } as Record<string, unknown>;
    if (element.children !== undefined) props.children = element.children;
    return expand((element.type as (props: unknown) => unknown)(props));
  }
  return [{ ...element, children: (element.children ?? []).flatMap(expand) }];
}

/** The expanded children of the page root. */
function panelChildren(): ExpandedElement[] {
  const { component } = evaluateClientEntry();
  if (component === undefined) throw new Error("the panel registered no component");
  const rendered = (component as (props: unknown) => unknown)({});
  // `expand` returns the expanded root itself for a single element, so descend into
  // it rather than filtering the returned list.
  const root = expand(rendered).filter(isElement)[0];
  if (root === undefined) throw new Error("the panel rendered no root element");
  return childrenOf(root).filter(isElement) as ExpandedElement[];
}

/** The `rlm-cards` wrapper's expanded card elements. */
function panelCards(): ExpandedElement[] {
  const wrapper = panelChildren().find((child) =>
    String(child.props.className ?? "").includes("rlm-cards"),
  );
  if (wrapper === undefined) throw new Error("the page has no cards wrapper");
  return childrenOf(wrapper).filter(isElement) as ExpandedElement[];
}

describe("the client module registration", () => {
  test("registers under the npm package name", () => {
    const { registered } = evaluateClientEntry();
    expect(registered.id).toBe("@try-works/dsh-role-model");
  });

  test("requests react from the browser module table", () => {
    // The factory is handed a require function; asking for anything else would
    // need a `dsh.client.external` entry this plugin does not declare.
    expect(readFileSync(clientEntry, "utf8")).toMatch(/require\(["']react["']\)/u);
  });

  test("does not import any harness client package", () => {
    const source = readFileSync(clientEntry, "utf8");
    expect(source).not.toContain("dsh-client-ui-primitives");
    expect(source).not.toContain("@deepseek-ai/dsh-client");
  });
});

describe("the settings panel registration", () => {
  test("injects into the settings section slot", () => {
    const { injectedInto } = evaluateClientEntry();
    expect(injectedInto).toContain("settings.section");
  });

  test("registers one panel with a stable id and an order", () => {
    const { registrations } = evaluateClientEntry();
    expect(registrations).toHaveLength(1);
    expect(registrations[0]?.name).toBe("settings.section");
    expect(registrations[0]?.id).toBe("role-model");
    expect(typeof registrations[0]?.order).toBe("number");
  });

  test("scopes its registration through ctx.effect", () => {
    const { effects } = evaluateClientEntry();
    expect(effects).toBeGreaterThan(0);
  });

  test("the rendered panel names the product in lower case", () => {
    const { registrations } = evaluateClientEntry();
    const rendered = registrations[0]?.rendered ?? "";
    expect(rendered).toContain("role-model");
    expect(rendered).not.toMatch(/Role[ -]Model/u);
  });

  test("the rendered panel explains the route and the intent metadata", () => {
    const { registrations } = evaluateClientEntry();
    const rendered = registrations[0]?.rendered ?? "";
    // The panel must say what the route is for and that metadata is attached.
    expect(rendered.toLowerCase()).toContain("intent");
    expect(rendered.toLowerCase()).toContain("endpoint");
  });

  test("styles use theme tokens rather than literal colours", () => {
    const source = readFileSync(clientEntry, "utf8");
    const literalColours = source.match(/#[0-9a-f]{3,8}\b/giu) ?? [];
    expect(literalColours).toEqual([]);
    // The only styling dependency is the host's own variable families.
    expect(source).toContain("--dsw-alias-");
  });

  /**
   * Every theme variable the host actually declares.
   *
   * Taken from the harness's own token sources — `ui-theme/src/styles/base.css`
   * and `design-platform.css` — plus the subset the client `Theme` inspect
   * provider publishes. A name outside this list is an invalid declaration: the
   * browser drops the value and it silently falls back to inherited text, which is
   * exactly the defect this guard exists to prevent.
   */
  const KNOWN_TOKENS = new Set([
    "--dsw-alias-label-primary",
    "--dsw-alias-label-secondary",
    "--dsw-alias-label-tertiary",
    "--dsw-alias-border-l1",
    "--dsw-alias-border-l2",
    "--dsw-alias-border-l3",
    "--dsw-alias-border-l4",
    "--dsw-alias-bg-layer-1",
    "--dsw-alias-bg-layer-2",
    "--dsw-alias-bg-overlay",
    "--dsw-alias-bg-base",
    "--dsw-alias-brand-primary",
    "--dsw-alias-interactive-bg-hover",
    "--dsw-alias-settings-card-fill",
    "--dsw-alias-settings-card-stroke",
    "--dsw-alias-state-error-primary",
    "--dsw-alias-state-success-primary",
    "--dsw-alias-state-warn-primary",
    "--dsw-alias-state-idle-primary",
    "--dsw-radius-xs",
    "--dsw-radius-sm",
    "--dsw-radius-md",
    "--dsw-radius-lg",
    "--dsw-radius-xl",
    "--ds-font-family-code",
  ]);

  test("every theme variable it references is one the host declares", () => {
    const source = readFileSync(clientEntry, "utf8");
    const referenced = source.match(/--(?:dsw|ds)-[a-z0-9-]*[a-z0-9]/gu) ?? [];
    expect(referenced.length).toBeGreaterThan(0);
    const unknown = [...new Set(referenced)].filter((token) => !KNOWN_TOKENS.has(token));
    expect(unknown).toEqual([]);
  });

  test("composes the page as a section of cards, not a wall of prose", () => {
    const source = readFileSync(clientEntry, "utf8");
    // The shipped settings page's structure: a section column, and cards that hold
    // label/value rows.
    expect(source).toContain("rlm-page");
    expect(source).toContain("rlm-cards");
    expect(source).toContain("rlm-card");
    expect(source).toContain("rlm-row");
    // Cards sit on the same elevated surface the shipped pages use.
    expect(source).toContain("--dsw-alias-settings-card-fill");
    expect(source).toContain("--dsw-alias-settings-card-stroke");
  });

  test("renders a page heading and injects its own scoped styles", () => {
    const { registrations } = evaluateClientEntry();
    const rendered = registrations[0]?.rendered ?? "";
    expect(rendered).toContain("rlm-title");
    // Styles travel with the component so unmounting removes them.
    expect(rendered).toContain("rlm-styles");
  });

  test("does not write to the document outside its component", () => {
    const source = readFileSync(clientEntry, "utf8");
    expect(source).not.toContain("document.body");
    expect(source).not.toContain("document.createElement");
  });
});

describe("the panel is a configuration guide", () => {
  /**
   * The panel's job is to tell a user how to point a client at the runtime, so the
   * exact values matter: a wrong base URL, or a model id that is not a routing
   * strategy, produces requests that cannot work. These assertions are on rendered
   * text, so they fail when the guidance is removed or drifts.
   */

  test("gives the base URL to configure, including the /v1 suffix", () => {
    const { registrations } = evaluateClientEntry();
    const rendered = registrations[0]?.rendered ?? "";
    expect(rendered).toContain("http://127.0.0.1:3457/v1");
    // The suffix is the detail people get wrong, so it is called out in prose too.
    expect(rendered).toContain("/v1");
  });

  test("states that the model id is the routing strategy", () => {
    const { registrations } = evaluateClientEntry();
    const rendered = registrations[0]?.rendered ?? "";
    expect(rendered.toLowerCase()).toContain("routing strateg");
    expect(rendered).toContain("baseline.remote-only");
  });

  test("names every model-id family so a user can choose one", () => {
    const { registrations } = evaluateClientEntry();
    const rendered = registrations[0]?.rendered ?? "";
    // `<strategy>.<scope>`; the strategies the runtime advertises.
    for (const strategy of ["baseline", "difficulty", "hybrid", "controller", "default"]) {
      expect(rendered, `missing strategy ${strategy}`).toContain(strategy);
    }
  });

  test("tells the user where to enter these values", () => {
    const { registrations } = evaluateClientEntry();
    const rendered = (registrations[0]?.rendered ?? "").toLowerCase();
    expect(rendered).toContain("settings");
    expect(rendered).toContain("models");
  });

  test("gives the bearer placeholder and a worked request example", () => {
    const { registrations } = evaluateClientEntry();
    const rendered = registrations[0]?.rendered ?? "";
    expect(rendered).toContain("role-model-local");
    // A worked request shows the three values fitting together.
    expect(rendered).toContain("chat/completions");
  });

  test("explains the guidance from the bundle alone, with no network access", () => {
    // A panel that fetched the runtime would show nothing exactly when the runtime
    // is unreachable, which is when the user is looking at it.
    const source = readFileSync(clientEntry, "utf8");
    expect(source).not.toContain("fetch(");
    expect(source).not.toContain("XMLHttpRequest");
  });
});

describe("the panel's element structure", () => {
  test("every card actually contains its rows", () => {
    // Regression guard, and the reason it is written this way: an earlier version of
    // this spec passed a component its own props without `children`, so `Card` saw
    // `undefined` children, rendered headings only, and the spec still passed. The
    // helper now hands components their children as React does, so a card that lost
    // its rows fails here.
    const cards = panelCards();
    expect(cards.length).toBeGreaterThanOrEqual(3);
    for (const card of cards) {
      const heading = childrenOf(card)[0];
      const title = isElement(heading) ? childrenOf(heading).join("") : "";
      const body = childrenOf(card).slice(1);
      expect(body.length, `card "${title}" has no body`).toBeGreaterThan(0);
      // No child may be an array: react-dom cannot key an array that is itself a child.
      for (const child of body) {
        expect(Array.isArray(child), `card "${title}" nests an array child`).toBe(false);
      }
    }
  });

  test("each card's body is a label/value row or a paragraph", () => {
    for (const card of panelCards()) {
      for (const child of childrenOf(card).slice(1)) {
        if (!isElement(child)) continue;
        const className = String(child.props.className ?? "");
        const isRow = className.includes("rlm-row") && childrenOf(child).length === 2;
        const isNote = child.type === "p";
        const isCode = child.type === "pre";
        expect(isRow || isNote || isCode, `unexpected card child: ${String(child.type)}`).toBe(
          true,
        );
      }
    }
  });

  test("the connect card states the values a client must be configured with", () => {
    const card = panelCards().find((candidate) => {
      const heading = childrenOf(candidate)[0];
      return isElement(heading) && childrenOf(heading).join("") === "Connect a client";
    });
    expect(card, "no Connect a client card").toBeDefined();
    const values = childrenOf(card as ExpandedElement)
      .filter(isElement)
      .flatMap((child) =>
        childrenOf(child).map((c) => (isElement(c) ? childrenOf(c).join("") : String(c))),
      );
    const text = values.join(" | ");
    expect(text).toContain("http://127.0.0.1:3457/v1");
    expect(text).toContain("baseline.remote-only");
    expect(text).toContain("role-model-local");
  });
});
