/**
 * Run 101 / R10: the queue page.
 *
 * One row per queue with the depth that matters (waiting, active, delayed,
 * failed, stalled, oldest waiting) and a drill-in that shows a job's attempts,
 * its lock owner and the error its handler threw - the three things that turn
 * "18 evals stuck in flight" into a state an operator can act on.
 */
import { useEffect, useState } from "react";

import {
  type QueueJobDetailResponse,
  type QueueJobRow,
  type QueueListResponse,
  fetchQueueJob,
  fetchQueueJobs,
  fetchQueues,
  formatQueueAge,
} from "../lib/queue-api";

const JOB_STATES = ["pending", "completed", "failed"] as const;

export default function ObserveQueuesRoute() {
  const [queues, setQueues] = useState<QueueListResponse | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [jobs, setJobs] = useState<readonly QueueJobRow[]>([]);
  const [detail, setDetail] = useState<QueueJobDetailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const next = await fetchQueues();
        if (!cancelled) {
          setQueues(next);
          setError(null);
          setSelected((current) => current ?? next.queues[0]?.name ?? null);
        }
      } catch (caught) {
        if (!cancelled)
          setError(caught instanceof Error ? caught.message : "queue readback failed");
      }
    };
    void load();
    const timer = setInterval(load, 1_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    const load = async () => {
      try {
        const next = await fetchQueueJobs(selected, { state: stateFilter });
        if (!cancelled) setJobs(next.jobs);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "job readback failed");
      }
    };
    void load();
    const timer = setInterval(load, 1_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selected, stateFilter]);

  const openDetail = async (jobId: string) => {
    if (!selected) return;
    try {
      setDetail(await fetchQueueJob(selected, jobId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "job detail failed");
    }
  };

  return (
    <section className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Queues</h1>
        <p className="text-sm opacity-70">
          Queue truth from the shared store: depth, activity, retries and stalls per queue, with job
          drill-in.
        </p>
      </header>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {queues && !queues.available ? (
        <p className="text-sm opacity-70">
          {queues.reason ?? "the queue store has no rows yet"} — a plane still on{" "}
          <code>legacy</code> does not enqueue.
        </p>
      ) : null}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left opacity-70">
            <th className="py-1">Queue</th>
            <th className="py-1">Mode</th>
            <th className="py-1">Waiting</th>
            <th className="py-1">Active</th>
            <th className="py-1">Delayed</th>
            <th className="py-1">Failed</th>
            <th className="py-1">Stalled</th>
            <th className="py-1">Oldest waiting</th>
            <th className="py-1">Last error</th>
          </tr>
        </thead>
        <tbody>
          {(queues?.queues ?? []).map((queue) => (
            <tr
              key={queue.name}
              className={`border-t border-white/10 ${selected === queue.name ? "bg-white/5" : ""}`}
            >
              <td className="py-1">
                <button
                  type="button"
                  className="cursor-pointer text-left underline-offset-2 hover:underline"
                  onClick={() => {
                    setSelected(queue.name);
                    setDetail(null);
                  }}
                >
                  {queue.name}
                </button>
              </td>
              <td className="py-1">{queue.mode}</td>
              <td className="py-1">{queue.waiting}</td>
              <td className="py-1">{queue.active}</td>
              <td className="py-1">{queue.delayed}</td>
              <td className="py-1">{queue.failed}</td>
              <td className="py-1">{queue.stalled}</td>
              <td className="py-1">{formatQueueAge(queue.oldestWaitingMs)}</td>
              <td className="py-1 max-w-[16rem] truncate" title={queue.lastError ?? ""}>
                {queue.lastError ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selected ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-medium">{selected} jobs</h2>
            <select
              className="rounded border border-white/20 bg-transparent px-2 py-1 text-sm"
              value={stateFilter ?? ""}
              onChange={(event) => setStateFilter(event.target.value || null)}
            >
              <option value="">all states</option>
              {JOB_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left opacity-70">
                <th className="py-1">Job</th>
                <th className="py-1">State</th>
                <th className="py-1">Attempts</th>
                <th className="py-1">Lock owner</th>
                <th className="py-1">Updated</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-t border-white/10">
                  <td className="py-1">
                    <button
                      type="button"
                      className="cursor-pointer text-left underline-offset-2 hover:underline"
                      onClick={() => void openDetail(job.id)}
                    >
                      {job.id}
                    </button>
                  </td>
                  <td className="py-1">{job.state}</td>
                  <td className="py-1">{job.attempts}</td>
                  <td className="py-1">{job.acquiredBy ?? "—"}</td>
                  <td className="py-1">{job.updatedAt ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {detail?.job ? (
            <aside className="flex flex-col gap-1 rounded border border-white/15 p-3 text-sm">
              <span className="opacity-70">job {detail.job.id}</span>
              <span>state {detail.job.state}</span>
              <span>attempts {detail.job.attempts}</span>
              <span>acquired by {detail.job.acquiredBy ?? "—"}</span>
              <span>visible at {detail.job.visibleAt ?? "—"}</span>
              {detail.job.lastError ? (
                <span className="text-amber-500">last error {detail.job.lastError}</span>
              ) : null}
              <pre className="mt-2 max-h-40 overflow-auto rounded bg-black/30 p-2 text-xs">
                {JSON.stringify(detail.job.payload, null, 2)}
              </pre>
            </aside>
          ) : null}
        </section>
      ) : null}
    </section>
  );
}
