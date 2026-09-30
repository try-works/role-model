/**
 * The browser half of the role-model plugin.
 *
 * Plain JavaScript by necessity: DSH's client module system serves this file to
 * the page as a lazy-CJS bundle, so it is the shipped artifact rather than a build
 * output. It calls `window.__ModuleLoader__.load({ id, factory })`; the factory
 * receives the browser module table's `require` and returns `{ inject, apply }`.
 *
 * The only module it requests is `react`, which the module table provides. It does
 * not import any harness client package: those change without notice, a plain-JS
 * plugin has no type check against them, and a throwing component blanks the slot
 * entry. Controls and styles are therefore written here.
 *
 * The page mirrors a shipped settings section (the Models page): the same section
 * column, card chrome and type scale, using only theme tokens that actually exist —
 * the label primary/secondary/tertiary aliases, the settings card fill and stroke
 * aliases, the radius scale and the code font family. A token that does not exist is
 * an invalid declaration: the browser drops the value and it falls back to inherited
 * text, which is what made an earlier version of this page render as
 * undifferentiated prose.
 */

window.__ModuleLoader__.load({
  id: "@try-works/dsh-role-model",

  factory(require) {
    const React = require("react");
    const h = React.createElement;

    /**
     * Page styles.
     *
     * Held as one string and injected as a React element, so unmounting removes
     * them — the pattern the plugin guidance prescribes for component-local styles.
     * Every class is prefixed to avoid colliding with host styles.
     */
    const CSS = `
.rlm-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 720px;
  color: var(--dsw-alias-label-primary);
}
.rlm-title {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
  color: var(--dsw-alias-label-primary);
}
.rlm-intro {
  margin: 0;
  font-size: 14px;
  line-height: 22px;
  color: var(--dsw-alias-label-tertiary);
}
.rlm-cards {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rlm-card {
  border: 0.5px solid var(--dsw-alias-settings-card-stroke);
  background: var(--dsw-alias-settings-card-fill);
  border-radius: var(--dsw-radius-xl);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rlm-card-title {
  margin: 0 0 6px;
  font-size: 13px;
  line-height: 20px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary);
}
.rlm-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 5px 0;
}
.rlm-label {
  flex: 0 0 148px;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
}
.rlm-value {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
  overflow-wrap: anywhere;
}
.rlm-code {
  font-family: var(--ds-font-family-code);
  font-size: 12px;
}
.rlm-note {
  margin: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--dsw-alias-label-secondary);
}
`;

    /** One row inside a card: a muted label and a primary value. */
    function Row(props) {
      return h(
        "div",
        { className: "rlm-row" },
        h("span", { className: "rlm-label" }, props.label),
        h(
          "span",
          { className: props.mono === true ? "rlm-value rlm-code" : "rlm-value" },
          props.children,
        ),
      );
    }

    /** One card: a small heading and its rows. */
    function Card(props) {
      return h(
        "div",
        { className: "rlm-card" },
        h("h3", { className: "rlm-card-title" }, props.title),
        props.children,
      );
    }

    /** The settings page. */
    function RoleModelPanel() {
      const styleElement = React.useMemo(
        () => h("style", { key: "rlm-styles", dangerouslySetInnerHTML: { __html: CSS } }),
        [],
      );

      return h(
        "div",
        { className: "rlm-page" },
        styleElement,

        h("h2", { className: "rlm-title" }, "role-model"),
        h(
          "p",
          { className: "rlm-intro" },
          "This route forwards model requests to an externally running role-model runtime. The runtime " +
            "owns routing: it chooses the endpoint or alias for each request. Every ordinary request " +
            "carries role_model intent metadata — the role and task this plugin classified, plus " +
            "capabilities, modalities and tool classes — so the runtime can route on what the work needs " +
            "rather than on the prompt text alone.",
        ),

        h(
          "div",
          { className: "rlm-cards" },

          h(
            Card,
            { title: "Route" },
            h(Row, { label: "provider route", mono: true }, "role-model"),
            h(
              Row,
              { label: "endpoint" },
              "Configured in this plugin's settings. The runtime is external: this plugin never starts, " +
                "stops or updates it.",
            ),
            h(
              Row,
              { label: "intent metadata" },
              "role_model.intent on every ordinary conversation request. Compaction and session-title " +
                "calls are never annotated.",
            ),
            h(
              Row,
              { label: "credentials" },
              "The bearer token is the runtime's published local placeholder. This plugin reads no " +
                "credential and stores none.",
            ),
            h(
              Row,
              { label: "model selector" },
              "The runtime's aliases, models and endpoints all appear under this route, recommended " +
                "alias first.",
            ),
          ),

          h(
            Card,
            { title: "Commands" },
            h(
              Row,
              { label: "/role-model status", mono: true },
              "route health, discovery state, model count, selected alias",
            ),
            h(
              Row,
              { label: "/role-model doctor", mono: true },
              "every discovery check, including degraded model metadata",
            ),
            h(
              Row,
              { label: "/role-model alias list", mono: true },
              "every alias the runtime advertises",
            ),
            h(
              Row,
              { label: "/role-model alias use", mono: true },
              "record the alias to prefer, for example /role-model alias use baseline.remote-only",
            ),
            h(Row, { label: "/role-model requests", mono: true }, "recent runtime requests"),
            h(
              Row,
              { label: "/role-model explain", mono: true },
              "one request and the routing decision it produced",
            ),
          ),

          h(
            Card,
            { title: "Where to look" },
            h(
              "p",
              { className: "rlm-note" },
              "Run /role-model status for the live discovery state, model count and selected alias, and " +
                "/role-model doctor when something is wrong: it walks endpoint reachability, the discovery " +
                "contract, auth, endpoint trust, provider registration and any model whose metadata had to " +
                "be sized conservatively.",
            ),
            h(
              "p",
              { className: "rlm-note" },
              "Routing decisions, benchmarks and telemetry belong to the runtime, not to this plugin.",
            ),
          ),
        ),
      );
    }

    return {
      // The harness orders activation with these edges; the settings section slot is
      // provided by the settings shell, so wait for it.
      inject: ["slots"],

      apply(ctx) {
        ctx.effect(() =>
          ctx.slots.inject("settings.section", () =>
            ctx.slots.register(
              {
                name: "settings.section",
                id: "role-model",
                // After the shipped sections (general 0, models 10, plugins 15,
                // agent-presets 20), before anything opt-in.
                order: 60,
                label: "role-model",
              },
              RoleModelPanel,
            ),
          ),
        );
      },
    };
  },
});
