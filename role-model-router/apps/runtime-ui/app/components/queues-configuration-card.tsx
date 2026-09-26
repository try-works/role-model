/**
 * Run 101 / R3 + R10: the Learning -> Configuration Queues card.
 *
 * Every queue parameter is rendered from the operator API's own catalogue, so
 * the page cannot drift from the registry: the bounds, the defaults and the
 * description all come from the same place the server validates against. A
 * change is an explicit Apply per row and comes back as a receipt naming what
 * moved from what to what.
 */
import { useCallback, useEffect, useState } from "react";

import { type QueueConfigResponse, fetchQueueConfig, setQueueParameter } from "../lib/queue-api";

const numberOrString = (raw: string, type: string): unknown => {
  if (type === "integer") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : raw;
  }
  return raw;
};

export function QueuesConfigurationCard() {
  const [config, setConfig] = useState<QueueConfigResponse | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setConfig(await fetchQueueConfig());
      setError(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "queue configuration unavailable");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const apply = async (queue: string, field: string, type: string) => {
    const key = `${queue}.${field}`;
    const raw = drafts[key];
    if (raw === undefined) return;
    setBusy(key);
    setMessage(null);
    try {
      const result = await setQueueParameter({
        queue,
        name: field,
        value: numberOrString(raw, type),
      });
      setMessage(
        `${result.receipt.queue}.${result.receipt.name}: ${String(result.receipt.from)} -> ${String(
          result.receipt.to,
        )} (policy v${result.receipt.policyVersion})`,
      );
      setDrafts((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "queue change refused");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-6 rounded border border-[var(--rm-border)] p-4">
      <header className="flex flex-col gap-1">
        <h3 className="text-base font-medium">Queues</h3>
        <p className="text-sm opacity-70">
          Bounded per-queue parameters: concurrency, attempts, backoff, lock refresh and expiration,
          retention, and the plane mode. Bounds are enforced server-side, and every change is
          receipted.
        </p>
      </header>

      {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-500">{message}</p> : null}

      {config ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                {["Queue", "Parameter", "Value", "Bounds", "Default", ""].map((header) => (
                  <th className="pb-3 pr-3 font-normal opacity-70" key={header}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {config.catalogue.flatMap((queue) => {
                const effective = config.effective.find((entry) => entry.queue === queue.name);
                return queue.fields.map((field) => {
                  const key = `${queue.name}.${field.name}`;
                  const current = effective?.[field.name];
                  const draft = drafts[key];
                  return (
                    <tr className="border-t border-[var(--rm-border)] align-top" key={key}>
                      <td className="py-2 pr-3 font-mono">{queue.name}</td>
                      <td className="py-2 pr-3">
                        <p>{field.name}</p>
                        <p className="mt-1 text-xs opacity-70">{field.description}</p>
                      </td>
                      <td className="py-2 pr-3">
                        {field.type === "enum" ? (
                          <select
                            aria-label={key}
                            value={String(draft ?? current ?? "")}
                            onChange={(event) =>
                              setDrafts((state) => ({ ...state, [key]: event.target.value }))
                            }
                          >
                            {(field.values ?? []).map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            aria-label={key}
                            className="w-28 rounded border border-[var(--rm-border)] px-2 py-1"
                            value={String(draft ?? current ?? "")}
                            onChange={(event) =>
                              setDrafts((state) => ({ ...state, [key]: event.target.value }))
                            }
                          />
                        )}
                      </td>
                      <td className="py-2 pr-3 font-mono text-xs">
                        {field.type === "integer" ? `${field.min} – ${field.max}` : field.unit}
                      </td>
                      <td className="py-2 pr-3 font-mono">{String(field.default)}</td>
                      <td className="py-2 pr-3">
                        <button
                          type="button"
                          className="rounded border border-[var(--rm-border)] px-2 py-1 text-xs disabled:opacity-50"
                          disabled={draft === undefined || busy === key}
                          onClick={() => void apply(queue.name, field.name, field.type)}
                        >
                          {busy === key ? "applying…" : "apply"}
                        </button>
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {config ? (
        <p className="mt-3 text-xs opacity-70">
          kill switch: {String(config.global.killSwitch ?? false)} · policy v{config.policyVersion}{" "}
          · document {config.path}
        </p>
      ) : null}
    </section>
  );
}
