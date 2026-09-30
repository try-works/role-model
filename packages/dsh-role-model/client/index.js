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
 * entry. Controls are therefore written here and styled with the host's theme
 * tokens so they follow light and dark automatically.
 */

window.__ModuleLoader__.load({
  id: "@try-works/dsh-role-model",

  factory(require) {
    const React = require("react");
    const h = React.createElement;

    /** The command surface, so the panel documents what the user can run. */
    const COMMANDS = [
      ["/role-model status", "route health, discovery state, model count, selected alias"],
      ["/role-model doctor", "every discovery check, including degraded model metadata"],
      ["/role-model alias list", "every alias the runtime advertises"],
      ["/role-model alias use <alias>", "record the alias to prefer"],
      ["/role-model requests", "recent runtime requests"],
      ["/role-model explain <id>", "one request and the routing decision it produced"],
    ];

    /** What this route does, stated once so the panel is self-explanatory. */
    const OVERVIEW = [
      "This route forwards model requests to an externally running role-model runtime.",
      "The runtime owns routing: it chooses the endpoint or alias for each request.",
      "Every ordinary request carries role_model intent metadata — the role and task this " +
        "plugin classified, plus capabilities, modalities and tool classes — so the runtime " +
        "can route on what the work needs rather than on the prompt text alone.",
      "Aliases, models and endpoints all appear in the model selector under this route.",
    ].join(" ");

    /** A section with a themed heading. */
    function Section(props) {
      return h(
        "section",
        { style: { marginBlockEnd: "24px" } },
        h(
          "h3",
          {
            style: {
              margin: "0 0 8px",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--dsw-alias-text-primary)",
            },
          },
          props.title,
        ),
        props.children,
      );
    }

    /** A label/value row, matching the host's settings rows. */
    function Row(props) {
      return h(
        "div",
        {
          style: {
            display: "flex",
            gap: "12px",
            padding: "6px 0",
            fontSize: "13px",
            borderBlockEnd: "1px solid var(--dsw-alias-border-subtle)",
          },
        },
        h(
          "span",
          { style: { flex: "0 0 168px", color: "var(--dsw-alias-text-secondary)" } },
          props.label,
        ),
        h(
          "span",
          {
            style: {
              flex: "1 1 auto",
              color: "var(--dsw-alias-text-primary)",
              // Aliases and model ids are identifiers: keep them monospaced and copyable.
              fontFamily: props.mono === true ? "var(--dsw-font-family-mono)" : "inherit",
              wordBreak: "break-word",
            },
          },
          props.children,
        ),
      );
    }

    /** The settings page. */
    function RoleModelPanel() {
      return h(
        "div",
        { style: { padding: "4px 0", color: "var(--dsw-alias-text-primary)" } },
        h(
          "p",
          {
            style: {
              margin: "0 0 20px",
              fontSize: "13px",
              color: "var(--dsw-alias-text-secondary)",
              maxWidth: "72ch",
            },
          },
          OVERVIEW,
        ),

        h(
          Section,
          { title: "Route" },
          h(Row, { label: "provider route", mono: true }, "role-model"),
          h(
            Row,
            { label: "endpoint" },
            "Configured in this plugin's settings. The runtime is external: this plugin never starts, stops or updates it.",
          ),
          h(
            Row,
            { label: "intent metadata" },
            "role_model.intent on every ordinary conversation request. Compaction and session-title calls are never annotated.",
          ),
          h(
            Row,
            { label: "credentials" },
            "The bearer token is the runtime's published local placeholder. This plugin reads no credential and stores none.",
          ),
        ),

        h(
          Section,
          { title: "Commands" },
          h(
            "div",
            { style: { display: "grid", gap: "6px" } },
            ...COMMANDS.map(([command, summary]) =>
              h(
                "div",
                { key: command, style: { display: "flex", gap: "12px", fontSize: "13px" } },
                h(
                  "code",
                  {
                    style: {
                      flex: "0 0 232px",
                      fontFamily: "var(--dsw-font-family-mono)",
                      color: "var(--dsw-alias-text-primary)",
                    },
                  },
                  command,
                ),
                h("span", { style: { color: "var(--dsw-alias-text-secondary)" } }, summary),
              ),
            ),
          ),
        ),

        h(
          Section,
          { title: "Where to look" },
          h(
            "p",
            {
              style: {
                margin: 0,
                fontSize: "13px",
                color: "var(--dsw-alias-text-secondary)",
                maxWidth: "72ch",
              },
            },
            "Run /role-model status for the live discovery state, model count and selected alias, and " +
              "/role-model doctor when something is wrong: it walks endpoint reachability, the discovery " +
              "contract, auth, endpoint trust, provider registration and any model whose metadata had to be " +
              "sized conservatively. Routing decisions, benchmarks and telemetry belong to the runtime.",
          ),
        ),
      );
    }

    return {
      // The harness orders activation with these edges; the settings slot is
      // provided by the settings shell, so wait for it.
      inject: ["slots"],

      apply(ctx) {
        ctx.effect(() =>
          ctx.slots.inject("settings.section", () =>
            ctx.slots.register(
              {
                name: "settings.section",
                id: "role-model",
                // After the shipped sections, before anything opt-in.
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
