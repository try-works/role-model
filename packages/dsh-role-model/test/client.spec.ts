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
} {
  const registrations: { name: string; id?: string; order?: number; rendered: string }[] = [];
  const injectedInto: string[] = [];
  let effects = 0;
  let registered: RegisteredModule | undefined;

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

  const React = {
    createElement: (type: unknown, props: unknown, ...children: unknown[]) => ({
      type,
      props,
      children,
      $$typeof: Symbol.for("react.element"),
    }),
    Fragment: Symbol.for("react.fragment"),
    useState: (initial: unknown) => [initial, () => undefined],
    useEffect: () => undefined,
    useMemo: (factory: () => unknown) => factory(),
  };

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
      register(options: { name: string; id?: string; order?: number }, component: unknown) {
        registrations.push({
          name: options.name,
          ...(options.id === undefined ? {} : { id: options.id }),
          ...(options.order === undefined ? {} : { order: options.order }),
          rendered: JSON.stringify(renderComponent(component, React), jsonReplacer),
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

  return { registered, registrations, injectedInto, effects };
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
