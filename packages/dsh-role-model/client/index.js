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
.rlm-codeblock {
  margin: 4px 0 0;
  padding: 10px 12px;
  border: 0.5px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-md);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code);
  font-size: 12px;
  line-height: 18px;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.rlm-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px 0;
}
.rlm-field-label {
  font-family: var(--ds-font-family-code);
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-secondary);
}
.rlm-field input[type="text"],
.rlm-field input[type="number"] {
  box-sizing: border-box;
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font-family: var(--ds-font-family-code);
  font-size: 12px;
}
.rlm-field input:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
.rlm-field input[type="checkbox"] {
  align-self: flex-start;
  width: 16px;
  height: 16px;
  margin: 2px 0 0;
}
.rlm-field-help {
  margin: 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
.rlm-actions {
  display: flex;
  gap: 8px;
  padding-top: 10px;
}
.rlm-button {
  height: 30px;
  padding: 0 14px;
  border: none;
  border-radius: var(--dsw-radius-sm);
  background: var(--dsw-alias-button-primary-fill);
  color: var(--dsw-alias-label-primary-inverted);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}
.rlm-button:hover:not(:disabled) {
  background: var(--dsw-alias-button-primary-hover);
}
.rlm-button-quiet {
  background: transparent;
  border: 1px solid var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
}
.rlm-button-quiet:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover);
}
.rlm-button:disabled {
  opacity: 0.6;
  cursor: default;
}
.rlm-button:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary);
  outline-offset: 1px;
}
.rlm-status {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-state-success-primary);
}
.rlm-status-error {
  color: var(--dsw-alias-state-error-primary);
}
`;

    /** One row inside a card: a muted label and a primary value. */
    function Row(props) {
      const { label, mono, children } = props ?? {};
      return h(
        "div",
        { className: "rlm-row" },
        h("span", { className: "rlm-label" }, label),
        h("span", { className: mono === true ? "rlm-value rlm-code" : "rlm-value" }, children),
      );
    }

    /**
     * One card: a small heading and its rows.
     *
     * Children are read from the extra `createElement` arguments and, when a caller
     * follows htm's convention, from `props.children` as well — React itself supplies
     * a component's children through props, so accepting both keeps the two call
     * styles straight. They are spread so no child is an array: react-dom refuses to
     * render an array that is itself a child, because it cannot key it.
     */
    function Card(props, ...rest) {
      const { title } = props ?? {};
      const supplied = rest.length > 0 ? rest : props?.children;
      const rows = supplied === undefined || supplied === null ? [] : supplied;
      return h(
        "div",
        { className: "rlm-card" },
        h("h3", { className: "rlm-card-title" }, title),
        ...(Array.isArray(rows) ? rows : [rows]),
      );
    }

    /** A monospaced block for a value or command to copy verbatim. */
    function CodeBlock(props) {
      return h("pre", { className: "rlm-codeblock" }, props?.children);
    }

    /**
     * The values a client needs, as a worked example.
     *
     * Held as one string so the example is copyable as a unit, and so the three
     * values are visibly consistent with each other.
     */
    const REQUEST_EXAMPLE = [
      "curl http://127.0.0.1:3457/v1/chat/completions \\",
      '  -H "Authorization: Bearer role-model-local" \\',
      '  -H "Content-Type: application/json" \\',
      "  -d '{",
      '    "model": "baseline.remote-only",',
      '    "messages": [{"role": "user", "content": "hello"}]',
      "  }'",
    ].join("\n");

    /**
     * The plugin's settings namespace.
     *
     * `SettingsForms.describe()` keys a namespace by its entry id
     * (`entry.options.id`), and this bundle's patch row declares `dsh-role-model`, so
     * that id is also the write target here.
     */
    const SETTINGS_NS = "dsh-role-model";

    /**
     * The settings a user may edit, in display order.
     *
     * These are exactly the fields the host schema marks `.volatile()`; a field
     * without that marker cannot be written and would be rejected by
     * `SettingsForms.write()` with "not volatile".
     */
    const CONFIG_FIELDS = [
      "endpoint",
      "selectedAlias",
      "providerRoute",
      "requestTimeoutMs",
      "allowRemote",
      "hostLlmModule",
    ];

    /** One-line explanations, so the form does not need the README. */
    const FIELD_HELP = {
      endpoint: "Runtime URL, without a trailing slash and without /v1.",
      selectedAlias:
        "Preferred routing strategy, e.g. baseline.remote-only. Empty means no preference.",
      providerRoute: "The route this plugin owns. Leave it as role-model.",
      requestTimeoutMs: "Timeout for runtime metadata calls, in milliseconds.",
      allowRemote:
        "Permit a non-loopback endpoint. Off by default; a remote endpoint is refused before any request.",
      hostLlmModule:
        "Path to the harness's dsh-llm entry. Empty auto-resolves; set it when the host runs from a profile.",
    };

    /** Fields whose value is a boolean checkbox rather than a text input. */
    const BOOLEAN_FIELDS = new Set(["allowRemote"]);

    /** Fields holding a number. */
    const NUMERIC_FIELDS = new Set(["requestTimeoutMs"]);

    /**
     * Read one namespace's current values through the settings Remote.
     *
     * Never throws: a settings surface that is unavailable must leave the form
     * usable, so the caller renders placeholders instead of an error page.
     * @param ctx - the client plugin context.
     * @returns the current values, or undefined when they cannot be read.
     */
    async function readConfig(ctx) {
      try {
        const response = await ctx.remote.settings.describe();
        if (response === undefined || response.ok !== true) return undefined;
        const namespaces = response.value?.namespaces;
        if (!Array.isArray(namespaces)) return undefined;
        const mine = namespaces.find((entry) => entry?.ns === SETTINGS_NS);
        const value = mine?.value;
        return value !== null && typeof value === "object" ? value : undefined;
      } catch {
        return undefined;
      }
    }

    /**
     * Narrow a draft value to the type its field holds.
     * @param field - the configuration field.
     * @param raw - the raw input or checkbox value.
     * @returns the typed value, or undefined when the input is blank.
     */
    function narrowField(field, raw) {
      const text = typeof raw === "string" ? raw : String(raw ?? "");
      if (BOOLEAN_FIELDS.has(field)) return raw === true || raw === "true";
      if (text.trim().length === 0)
        return field === "selectedAlias" || field === "hostLlmModule" ? "" : undefined;
      if (NUMERIC_FIELDS.has(field)) {
        const parsed = Number(text);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return text.trim();
    }

    /**
     * Build the patch for the fields the user actually changed.
     *
     * An unchanged field is deliberately omitted: `SettingsForms.update()` merges the
     * patch into the user section, so restating a value the profile never overrode
     * would pin an inherited value into this profile's document.
     * @param current - the values last read from settings.
     * @param draft - the values now in the form.
     * @returns the patch to write, possibly empty.
     */
    function buildPatch(current, draft) {
      const patch = {};
      for (const field of CONFIG_FIELDS) {
        if (!Object.hasOwn(draft, field)) continue;
        const next = narrowField(field, draft[field]);
        const before = current?.[field];
        if (next === undefined) continue;
        if (next === before) continue;
        if (
          typeof next === "string" &&
          next.length === 0 &&
          (before === undefined || before === null || before === "")
        )
          continue;
        patch[field] = next;
      }
      return patch;
    }

    /**
     * Write a patch to this plugin's settings namespace.
     * @param ctx - the client plugin context.
     * @param patch - the fields to merge.
     * @returns undefined on success, or the message to show the user.
     */
    async function writeConfig(ctx, patch) {
      if (Object.keys(patch).length === 0) return undefined;
      try {
        const response = await ctx.remote.settings.update(SETTINGS_NS, patch, undefined);
        if (response !== undefined && response.ok === true) return undefined;
        return response?.error?.message ?? "the settings service refused the write";
      } catch (error) {
        return error instanceof Error ? error.message : String(error);
      }
    }

    /** One labelled form control. */
    function Field(props) {
      const { field, value, help, onChange, disabled } = props;
      const id = `rlm-field-${field}`;
      const control = BOOLEAN_FIELDS.has(field)
        ? h("input", {
            id,
            name: field,
            type: "checkbox",
            checked: value === true,
            disabled: disabled === true,
            onChange: (event) => onChange(field, event.target.checked),
          })
        : h("input", {
            id,
            name: field,
            type: NUMERIC_FIELDS.has(field) ? "number" : "text",
            value: value ?? "",
            disabled: disabled === true,
            spellCheck: false,
            autoComplete: "off",
            onChange: (event) => onChange(field, event.target.value),
          });
      return h(
        "div",
        { className: "rlm-field" },
        h("label", { className: "rlm-field-label", htmlFor: id }, field),
        control,
        h("p", { className: "rlm-field-help" }, help),
      );
    }

    /** The editable configuration, shown at the top of the page. */
    function ConfigurationCard() {
      const [current, setCurrent] = React.useState(null);
      const [draft, setDraft] = React.useState({});
      const [message, setMessage] = React.useState(null);
      const [saving, setSaving] = React.useState(false);
      const context = panelContext;
      // Defensive: an unread settings namespace leaves this undefined, and the form
      // must still render (with placeholders) rather than blank the slot entry.
      const values = draft ?? {};

      React.useEffect(() => {
        let cancelled = false;
        void readConfig(context).then((loaded) => {
          if (cancelled || loaded === undefined) return;
          // Seed both the baseline and the draft from the same read, so an untouched
          // field is never written back.
          setCurrent(loaded);
          setDraft({ ...loaded });
        });
        return () => {
          cancelled = true;
        };
      }, []);

      const onChange = (field, value) => {
        setMessage(null);
        setDraft((previous) => ({ ...previous, [field]: value }));
      };

      const onApply = () => {
        setSaving(true);
        setMessage(null);
        const patch = buildPatch(current ?? {}, draft);
        void writeConfig(context, patch).then((failure) => {
          setSaving(false);
          if (failure === undefined) {
            setCurrent({ ...(current ?? {}), ...patch });
            setMessage({
              kind: "ok",
              text: Object.keys(patch).length === 0 ? "No changes." : "Saved.",
            });
            return;
          }
          setMessage({ kind: "error", text: failure });
        });
      };

      const onReset = () => {
        setMessage(null);
        setDraft({ ...(current ?? {}) });
      };

      return h(
        Card,
        { title: "Configuration" },
        h(
          "p",
          { className: "rlm-note" },
          "These values live in this plugin's profile patch row. The Models settings page cannot edit " +
            "them: its provider editor only knows the llm-deepseek and llm-pi-ai adapter families, so " +
            "it shows a reference and disables Apply.",
        ),
        ...CONFIG_FIELDS.map((field) =>
          h(Field, {
            key: field,
            field,
            value: values[field],
            help: FIELD_HELP[field],
            onChange,
          }),
        ),
        h(
          "div",
          { className: "rlm-actions" },
          h(
            "button",
            {
              type: "button",
              className: "rlm-button",
              "data-role": "apply",
              disabled: saving === true,
              onClick: onApply,
            },
            saving === true ? "Applying…" : "Apply",
          ),
          h(
            "button",
            {
              type: "button",
              className: "rlm-button rlm-button-quiet",
              "data-role": "reset",
              disabled: saving === true,
              onClick: onReset,
            },
            "Revert",
          ),
        ),
        message === null
          ? null
          : h(
              "p",
              {
                className: message.kind === "ok" ? "rlm-status" : "rlm-status rlm-status-error",
                "data-role": "status",
              },
              message.text,
            ),
      );
    }

    /**
     * The client context the panel writes through.
     *
     * Captured by {@link apply} rather than threaded through slot props, because the
     * slot owner passes its own props and this page needs the plugin context.
     */
    let panelContext;

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
            "owns routing: the model id you request is the routing strategy, and the runtime picks the " +
            "endpoint behind it. Every ordinary request carries role_model intent metadata — the role and " +
            "task this plugin classified, plus capabilities, modalities and tool classes — so the runtime " +
            "can route on what the work needs rather than on the prompt text alone.",
        ),

        h(
          "div",
          { className: "rlm-cards" },

          h(ConfigurationCard, null),

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
            { title: "Connect a client" },
            h(Row, { label: "base URL", mono: true }, "http://127.0.0.1:3457/v1"),
            h(Row, { label: "model", mono: true }, "baseline.remote-only"),
            h(Row, { label: "API key", mono: true }, "role-model-local"),
            h(
              "p",
              { className: "rlm-note" },
              "Use the /v1 base URL, not the bare host: an OpenAI-compatible client appends " +
                "/chat/completions to what you give it, so a base URL without /v1 fails with a 404. Any " +
                "non-empty API key is accepted; role-model-local is the runtime's published local " +
                "placeholder.",
            ),
            h(
              "p",
              { className: "rlm-note" },
              "In this harness, enter these under Settings → Models: add a provider with the base URL " +
                "above, then choose the model id you want. Every routing strategy, endpoint and concrete " +
                "model the runtime advertises appears in this route's group in the model selector.",
            ),
            h(
              "p",
              { className: "rlm-note" },
              "Ports differ by channel: 3456 is production (role-model), 3457 is stage " +
                "(role-model-stage), and 3458 is development (role-model-dev). Point the base URL at the " +
                "channel you mean.",
            ),
            h(CodeBlock, null, REQUEST_EXAMPLE),
          ),

          h(
            Card,
            { title: "Pick a routing strategy" },
            h(
              "p",
              { className: "rlm-note" },
              "A model id is <strategy>.<scope>. The strategy decides how the runtime chooses, and the " +
                "scope decides how much of the decision it makes itself: decision-only returns the " +
                "decision for you to execute, remote-only runs the chosen remote model, and hybrid picks " +
                "between local and remote. baseline.remote-only is the recommended starting point.",
            ),
            h(
              Row,
              { label: "baseline", mono: true },
              "a fixed baseline model, the simplest behaviour",
            ),
            h(Row, { label: "difficulty", mono: true }, "route on how hard the request looks"),
            h(Row, { label: "hybrid", mono: true }, "choose between local and remote execution"),
            h(
              Row,
              { label: "controller", mono: true },
              "a learned policy over the classifier signals",
            ),
            h(Row, { label: "default", mono: true }, "the runtime's own default strategy"),
            h(
              "p",
              { className: "rlm-note" },
              "Each strategy pairs with those three scopes, giving ids such as baseline.decision-only, " +
                "difficulty.remote-only and hybrid.hybrid. The runtime is the authority on the current " +
                "set: /role-model alias list prints every alias it advertises right now, and " +
                "/role-model alias recommended gives its own pick.",
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
      // provided by the settings shell, so wait for it. `remote.settings` is the
      // generated Remote namespace this page writes configuration through — without
      // it the client context carries no way to persist anything.
      inject: ["slots", "remote", "remote.settings"],

      apply(ctx) {
        panelContext = ctx;
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

      /** Pure wiring, exposed so the write path can be tested without react-dom. */
      __internals: {
        SETTINGS_NS,
        CONFIG_FIELDS,
        readConfig,
        buildPatch,
        writeConfig,
      },
    };
  },
});
