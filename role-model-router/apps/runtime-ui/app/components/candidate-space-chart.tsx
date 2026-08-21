import { Link } from "react-router";

import {
  CANDIDATE_SPACE_VIEW,
  type CandidateSpaceColorToken,
  type CandidateSpacePoint,
  formatCandidateMetricTriplet,
  formatRouteScore,
  projectCandidateSpacePoint,
} from "../lib/candidate-space";
import {
  compactFieldButtonClassName,
  compactFieldButtonEmphasisClassName,
} from "../lib/design-system";

const STROKE: Record<CandidateSpaceColorToken, string> = {
  serria: "var(--rm3-chart-cost)",
  royal: "var(--rm3-chart-1)",
  emerald: "var(--rm3-chart-cache)",
  coral: "var(--rm3-chart-error)",
  muted: "var(--rm3-chart-nodata)",
};

const FILL: Record<CandidateSpaceColorToken, string> = {
  serria: "color-mix(in srgb, var(--rm3-chart-cost) 28%, transparent)",
  royal: "color-mix(in srgb, var(--rm3-chart-1) 24%, transparent)",
  emerald: "color-mix(in srgb, var(--rm3-chart-cache) 26%, transparent)",
  coral: "color-mix(in srgb, var(--rm3-chart-error) 20%, transparent)",
  muted: "transparent",
};

const SWATCH: Record<CandidateSpaceColorToken, string> = {
  serria: "bg-[var(--rm3-chart-cost)]",
  royal: "bg-[var(--rm3-chart-1)]",
  emerald: "bg-[var(--rm3-chart-cache)]",
  coral: "bg-[var(--rm3-chart-error)]",
  muted: "border border-dashed border-[var(--rm3-chart-nodata)] bg-transparent",
};

type CandidateSpaceChartProps = {
  readonly points: readonly CandidateSpacePoint[];
};

function CandidateSpaceAxes({ points }: { readonly points: readonly CandidateSpacePoint[] }) {
  const { width, height, originX, originY } = CANDIDATE_SPACE_VIEW;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full max-h-[360px]"
      role="img"
      aria-label="Model pool scatter of cost, quality, and speed"
    >
      <polygon
        points="200,310 316.9,242.5 200,175 83.1,242.5"
        fill="color-mix(in srgb, var(--rm-fg) 4%, transparent)"
        stroke="var(--rm-border)"
      />
      <line x1="200" y1="175" x2="316.9" y2="242.5" stroke="var(--rm-border)" />
      <line x1="200" y1="175" x2="83.1" y2="242.5" stroke="var(--rm-border)" />
      <line x1="200" y1="175" x2="200" y2="310" stroke="var(--rm-border)" />
      <line x1="258.5" y1="208.8" x2="141.5" y2="276.3" stroke="var(--rm-border)" />
      <line x1="141.5" y1="208.8" x2="258.5" y2="276.3" stroke="var(--rm-border)" />
      <line
        x1={originX}
        y1={originY}
        x2="83.1"
        y2="242.5"
        stroke="var(--rm-fg)"
        strokeWidth="1.5"
      />
      <line
        x1={originX}
        y1={originY}
        x2={originX}
        y2="40"
        stroke="var(--rm-fg)"
        strokeWidth="1.5"
      />
      <line
        x1={originX}
        y1={originY}
        x2="316.9"
        y2="242.5"
        stroke="var(--rm-fg)"
        strokeWidth="1.5"
      />
      <text
        x="75"
        y="248"
        textAnchor="end"
        className="fill-[var(--rm-fg)]"
        style={{ fontFamily: "var(--rm3-font-mono, ui-monospace, monospace)", fontSize: 12 }}
      >
        ← Cost
      </text>
      <text
        x="200"
        y="26"
        textAnchor="middle"
        className="fill-[var(--rm-fg)]"
        style={{ fontFamily: "var(--rm3-font-mono, ui-monospace, monospace)", fontSize: 12 }}
      >
        ↑ Quality
      </text>
      <text
        x="325"
        y="248"
        textAnchor="start"
        className="fill-[var(--rm-fg)]"
        style={{ fontFamily: "var(--rm3-font-mono, ui-monospace, monospace)", fontSize: 12 }}
      >
        Speed →
      </text>
      {points.map((point) => {
        const projection = projectCandidateSpacePoint(point);
        const stroke = STROKE[point.colorToken];
        const fill = FILL[point.colorToken];
        return (
          <g key={point.endpointId}>
            <line
              x1={projection.floorX}
              y1={projection.floorY}
              x2={projection.markerX}
              y2={projection.markerY}
              stroke={stroke}
              strokeDasharray="3 3"
              opacity={point.excluded ? 0.35 : 0.5}
            />
            <circle
              cx={projection.floorX}
              cy={projection.floorY}
              r={point.selected ? 3 : 2.5}
              fill={stroke}
              opacity={0.5}
            />
            <circle
              cx={projection.markerX}
              cy={projection.markerY}
              r={projection.radius}
              fill={fill}
              stroke={stroke}
              strokeWidth={point.selected ? 2 : 1.75}
              strokeDasharray={point.excluded ? "3 2" : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}

function EmptyCandidateInventory() {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 pb-2">
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium leading-5 text-foreground">No models configured</p>
        <p className="text-xs leading-4 text-muted-foreground">
          Configure models on Remote or Local to score and place candidates here.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link className={compactFieldButtonEmphasisClassName} to="/app/remote/providers">
          Remote
        </Link>
        <Link className={compactFieldButtonClassName} to="/app/local/choose">
          Local
        </Link>
      </div>
    </div>
  );
}

export function CandidateSpaceChart({ points }: CandidateSpaceChartProps) {
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
      <div className="flex min-h-[280px] w-full items-center justify-center overflow-hidden">
        <CandidateSpaceAxes points={points} />
      </div>

      <div className="flex h-full min-h-[280px] flex-col gap-3">
        <p className="font-mono text-[11px] font-normal uppercase tracking-[0.08em] text-muted-foreground">
          Candidates · route score (0–1)
        </p>
        {points.length === 0 ? (
          <EmptyCandidateInventory />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {points.map((point) => (
              <li key={point.endpointId} className="flex items-start gap-2.5">
                <span
                  className={`mt-[3px] h-2.5 w-2.5 shrink-0 rounded-[2px] ${SWATCH[point.colorToken]}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`truncate text-[13px] font-semibold leading-4 ${
                        point.excluded ? "text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {point.label}
                    </span>
                    <span
                      className={`w-11 shrink-0 text-right font-mono text-[12px] tabular-nums leading-4 ${
                        point.selected
                          ? "text-[var(--rm3-chart-cost)]"
                          : point.excluded
                            ? "text-muted-foreground"
                            : "text-foreground"
                      }`}
                    >
                      {point.excluded ? "—" : formatRouteScore(point.routeScore)}
                    </span>
                  </div>
                  <p className="font-mono text-[10px] leading-[13px] text-muted-foreground">
                    {formatCandidateMetricTriplet(point)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
