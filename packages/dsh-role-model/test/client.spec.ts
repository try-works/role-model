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
          // Fully expanded, so assertions see the real content rather than an opaque
          // component element. The page is registered behind an error boundary, and a
          // shallow render would stop at that boundary. The element is built through the
          // stub so it carries the same `$$typeof` react-dom sets.
          rendered: JSON.stringify(deepRender(React.createElement(panel, null)), jsonReplacer),
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

/** Whether a value is a class component (the error boundary) rather than a function. */
function isClassComponent(value: unknown): boolean {
  return (
    typeof value === "function" && /^\s*class[\s{]/.test(Function.prototype.toString.call(value))
  );
}

/**
 * Render one component element to what it returns.
 *
 * Both shapes occur: the page and its cards are functions, and the error boundary is a
 * class. react-dom reaches the same result, so the helpers must as well.
 * @param element - a component element (its `type` is a function or class).
 * @returns the rendered output.
 */
function invokeComponent(element: HostElement): unknown {
  const type = element.type as (props: unknown) => unknown;
  // Children reach a component through its props, never as separate arguments — that is
  // how react-dom does it, and a boundary that reads `this.props.children` sees nothing
  // otherwise. The same mistake in the client's own shell blanked the real page.
  const props = { ...(element.props ?? {}) } as Record<string, unknown>;
  if (element.children !== undefined) props.children = element.children;
  if (isClassComponent(type)) {
    const instance = new (
      type as unknown as new (
        props: unknown,
      ) => {
        props: unknown;
        render(): unknown;
      }
    )(props);
    return instance.render();
  }
  return type(props);
}

/**
 * Render one component to the deepest host tree.
 *
 * Equivalent to `expand(invokeComponent(element))`, as a single recursion: the
 * `rendered` fixture wants a finished tree, not one that still contains component
 * elements the assertions would have to reach through.
 * @param value - element, component element, string, or nested array.
 * @returns host elements and strings, with every component expanded.
 */
function deepRender(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(deepRender);
  if (!isElement(value)) return value;
  const element = value as HostElement;
  if (typeof element.type === "function") return deepRender(invokeComponent(element));
  return { ...element, children: childrenOf(element).map(deepRender) };
}

/**
 * Render a component once, so its static markup can be inspected.
 *
 * The hooks are the shallowest thing that lets a component render: state starts at
 * its initial value and re-renders are not simulated. That is enough to inspect the
 * control names a form renders, which is what these assertions need.
 */
function renderComponent(
  component: unknown,
  React: { createElement: (...args: unknown[]) => unknown },
): unknown {
  if (typeof component !== "function") return null;
  try {
    return invokeComponent({
      type: component,
      props: {},
      children: undefined,
    } as unknown as HostElement);
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
    // The error boundary is a class component, so the stub needs a base class that
    // records constructor props and carries the state the boundary sets.
    Component: class {
      props: unknown;
      state: unknown;
      constructor(props: unknown) {
        this.props = props;
        this.state = {};
      }
      setState(next: unknown) {
        this.state = { ...(this.state as object), ...(next as object) };
      }
    },
    useState: (initial: unknown) => [initial ?? {}, () => undefined],
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
  if (typeof element.type === "function") return expand(invokeComponent(element));
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
    "--dsw-alias-button-primary-fill",
    "--dsw-alias-button-primary-hover",
    "--dsw-alias-label-primary-inverted",
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
        // The configuration card holds form fields and the action row.
        const isField = className.includes("rlm-field") || className.includes("rlm-actions");
        expect(
          isRow || isNote || isCode || isField,
          `unexpected card child: ${String(child.type)} .${className}`,
        ).toBe(true);
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

describe("editing configuration from the panel", () => {
  /**
   * The Models settings page cannot edit this route: its provider editor is hardcoded
   * to the `llm-deepseek` and `llm-pi-ai` adapter families
   * (`ProviderEditor.tsx: layoutOf`), and any other namespace renders "edit
   * cordis.patch.yml" with Apply disabled. So this plugin's own settings page carries
   * the form, writing through the host's `settings` Remote namespace — the same
   * surface the shipped settings pages use (`ctx.remote.settings.update(ns, patch, rev)`).
   */

  /** The `Answer` contract every Remote call returns. */
  interface Answer {
    ok: boolean;
    value?: unknown;
    error?: { message: string };
  }

  /** The client-side write helpers the panel is built on. */
  interface PanelInternals {
    SETTINGS_NS: string;
    CONFIG_FIELDS: readonly string[];
    SELECT_FIELDS: ReadonlySet<string>;
    RUNTIME_CHANNELS: readonly { port: number; name: string; runtime: string }[];
    settingsRemote: (ctx: unknown) => unknown;
    readConfig: (ctx: unknown) => Promise<Record<string, unknown> | undefined>;
    buildPatch: (
      current: Record<string, unknown>,
      draft: Record<string, unknown>,
    ) => Record<string, unknown>;
    writeConfig: (ctx: unknown, patch: Record<string, unknown>) => Promise<string | undefined>;
  }

  /** A `ctx.remote.settings` double recording writes. */
  function fakeSettings(options: { updateError?: string; describeError?: string } = {}) {
    const writes: { ns: string; patch: Record<string, unknown>; revision?: number }[] = [];
    const current = {
      endpoint: "http://127.0.0.1:3456",
      allowRemote: false,
      requestTimeoutMs: 2500,
      providerRoute: "role-model",
      selectedAlias: "baseline.remote-only",
      hostLlmModule: "",
    };
    const settings = {
      describe: (): Promise<Answer> =>
        Promise.resolve(
          options.describeError === undefined
            ? {
                ok: true,
                value: {
                  writable: true,
                  namespaces: [{ ns: "dsh-role-model", revision: 7, value: current }],
                },
              }
            : { ok: false, error: { message: options.describeError } },
        ),
      update: (ns: string, patch: Record<string, unknown>, revision?: number): Promise<Answer> => {
        writes.push({ ns, patch, ...(revision === undefined ? {} : { revision }) });
        return Promise.resolve(
          options.updateError === undefined
            ? { ok: true, value: {} }
            : { ok: false, error: { message: options.updateError } },
        );
      },
    };
    return { settings, writes, current };
  }

  /**
   * Apply the client half with a settings Remote attached.
   * @param settings - the Remote double.
   */
  function applyWith(settings: unknown) {
    let registered: RegisteredModule | undefined;
    const stub = {
      __ModuleLoader__: {
        load(module: RegisteredModule) {
          registered = module;
        },
      },
    };
    new Function("window", `${readFileSync(clientEntry, "utf8")}\n`)(stub);
    if (registered === undefined) throw new Error("the client entry registered no module");
    const components: ((props: unknown) => unknown)[] = [];
    const ctx = {
      effect: (callback: () => unknown) => {
        callback();
        return () => undefined;
      },
      remote: { settings },
      slots: {
        inject: (_key: string, callback: () => void) => callback(),
        register: (_options: unknown, panel: unknown) => {
          components.push(panel as (props: unknown) => unknown);
          return () => undefined;
        },
      },
    };
    const plugin = registered.factory((name: string) => {
      if (name === "react") return testReact();
      throw new Error(`unexpected module request: ${name}`);
    }) as RegisteredModule["factory"] extends never
      ? never
      : {
          inject?: string[];
          apply(ctx: unknown): void;
          __internals?: PanelInternals;
        };
    plugin.apply(ctx);
    const component = components[0];
    if (component === undefined) throw new Error("the panel registered no component");
    if (plugin.__internals === undefined) throw new Error("the client exposes no internals");
    return { component, inject: plugin.inject ?? [], internals: plugin.__internals, ctx };
  }

  test("mounts on the settings slot alone, so an absent Remote cannot blank the page", () => {
    const { inject } = applyWith(fakeSettings().settings);
    expect(inject).toContain("slots");
    // A Remote namespace is a Cordis child service, and an injection edge that cannot
    // resolve stops the plugin mounting — which blanks the whole settings page. The
    // Remote is read through `ctx.remote` behind a guard instead.
    expect(inject).not.toContain("remote.settings");
  });

  test("renders an editable control for every configurable setting", () => {
    const { internals } = applyWith(fakeSettings().settings);
    // Walk the expanded tree: the controls live inside `Field`, so a JSON dump of the
    // unexpanded element would not contain them.
    const names = new Set<string>();
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const child of value) walk(child);
        return;
      }
      if (!isElement(value)) return;
      const name = value.props.name;
      if (typeof name === "string") names.add(name);
      for (const child of childrenOf(value)) walk(child);
    };
    for (const child of panelChildren()) walk(child);
    for (const field of internals.CONFIG_FIELDS) {
      expect([...names], `no control for ${field}`).toContain(field);
    }
  });

  test("offers the runtime channels as a choice, production first", () => {
    const { internals } = applyWith(fakeSettings().settings);
    expect(internals.RUNTIME_CHANNELS.map((channel) => channel.port)).toEqual([3456, 3457, 3458]);
    // Locate the real select element rather than asserting on source text.
    let select: ExpandedElement | undefined;
    const walk = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const child of value) walk(child);
        return;
      }
      if (!isElement(value)) return;
      if (value.type === "select" && value.props.name === "port") {
        select = { ...value, children: childrenOf(value) };
      }
      for (const child of childrenOf(value)) walk(child);
    };
    for (const child of panelChildren()) walk(child);
    expect(select, "no port select").toBeDefined();
    const options = childrenOf(select as ExpandedElement).filter(isElement);
    // The unset state comes first and names the default it resolves to; production is
    // not listed twice, because choosing it is the same as leaving the field alone.
    expect(options[0]?.props.value).toBe(0);
    expect(childrenOf(options[0] as ExpandedElement).join("")).toContain("default");
    expect(options[0] && childrenOf(options[0]).join("")).toContain("3456");
    expect(options.map((option) => option.props.value)).toEqual([0, 3457, 3458]);
    const labels = options.map((option) => childrenOf(option).join(""));
    expect(labels[1]).toContain("stage");
    expect(labels[2]).toContain("development");
  });

  test("the port is a closed choice, not free text", () => {
    const { internals } = applyWith(fakeSettings().settings);
    // A plain number input would let a typo select a runtime that is not running.
    expect(internals.SELECT_FIELDS.has("port")).toBe(true);
  });

  test("reads the current values from its settings namespace", async () => {
    const { settings } = fakeSettings();
    const { internals, ctx } = applyWith(settings);
    const current = await internals.readConfig(ctx);
    expect(current?.endpoint).toBe("http://127.0.0.1:3456");
    expect(current?.selectedAlias).toBe("baseline.remote-only");
  });

  test("returns undefined rather than throwing when settings are unavailable", async () => {
    const { settings } = fakeSettings({ describeError: "settings are unavailable" });
    const { internals, ctx } = applyWith(settings);
    await expect(internals.readConfig(ctx)).resolves.toBeUndefined();
  });

  test("writes only the fields the user changed", () => {
    const { internals } = applyWith(fakeSettings().settings);
    const current = { endpoint: "http://127.0.0.1:3456", selectedAlias: "baseline.remote-only" };
    const patch = internals.buildPatch(current, {
      endpoint: "http://127.0.0.1:3459",
      selectedAlias: "baseline.remote-only",
    });
    // An unchanged field must not be restated, or an inherited value would be pinned.
    expect(patch).toEqual({ endpoint: "http://127.0.0.1:3459" });
  });

  test("writes the edited values to its own namespace", async () => {
    const { settings, writes } = fakeSettings();
    const { internals, ctx } = applyWith(settings);
    const failure = await internals.writeConfig(ctx, { endpoint: "http://127.0.0.1:3459" });
    expect(failure).toBeUndefined();
    expect(writes.length).toBe(1);
    expect(writes[0]?.ns).toBe("dsh-role-model");
    expect(writes[0]?.patch).toEqual({ endpoint: "http://127.0.0.1:3459" });
  });

  test("surfaces a refused write instead of reporting success", async () => {
    const { settings } = fakeSettings({ updateError: "read only" });
    const { internals, ctx } = applyWith(settings);
    // The message is returned so the panel can show it; silence would claim success.
    await expect(internals.writeConfig(ctx, { endpoint: "http://x" })).resolves.toBe("read only");
  });

  test("an empty patch is not written at all", async () => {
    const { settings, writes } = fakeSettings();
    const { internals, ctx } = applyWith(settings);
    const failure = await internals.writeConfig(ctx, {});
    expect(failure).toBeUndefined();
    expect(writes).toEqual([]);
  });

  test("a context without the settings Remote degrades instead of throwing", async () => {
    // This is the case that matters: the page must still render when the Remote is
    // absent, so every access is guarded rather than assumed.
    const { internals } = applyWith(undefined);
    const bare = {};
    expect(internals.settingsRemote(bare)).toBeUndefined();
    await expect(internals.readConfig(bare)).resolves.toBeUndefined();
    // The write reports why it could not save, rather than appearing to succeed.
    await expect(internals.writeConfig(bare, { endpoint: "http://x" })).resolves.toContain(
      "unavailable",
    );
  });

  /**
   * A component that throws during render leaves the settings pane blank, and nothing
   * in the browser says the plugin is responsible. Tests over the markup and the write
   * path cannot catch that — a blank `role-model` pane was reported while every one of
   * them passed — so the failure is rendered as text instead.
   */
  test("keeps a render failure visible instead of blanking the pane", () => {
    const source = readFileSync(clientEntry, "utf8");
    // The message must name the plugin, so a user can tell whose fault it is.
    expect(source).toContain("role-model could not render");
    // A real error boundary, because a parent function component's try/catch cannot see
    // a child's render error: the child renders later, inside react-dom's traversal.
    expect(source).toContain("getDerivedStateFromError");
    expect(source).toContain("class PanelBoundary");
    // The page is handed over as an element, never invoked. Invoking it outside React's
    // render phase makes its own hooks throw "Invalid hook call", which blanked this page
    // twice. Asserted on the call form, since a comment mentions the mistake by name.
    expect(source).toContain("h(RoleModelPanel, null)");
    expect(source).not.toMatch(/=\s*RoleModelPanel\(\)/u);
    expect(source).not.toMatch(/\breturn\s+RoleModelPanel\(\)/u);
  });

  test("the boundary passes the page through while nothing has thrown", () => {
    const { component } = applyWith(undefined);
    // Deep-render the registered component: the boundary must yield the real page, not
    // its own fallback and not a blank node.
    const rendered = JSON.stringify(
      deepRender({ type: component, props: {}, children: undefined, $$typeof: REACT_ELEMENT }),
      jsonReplacer,
    );
    expect(rendered).toContain("rlm-page");
    expect(rendered).toContain("role-model");
    expect(rendered).not.toContain("could not render");
  });
});
