"use client";

import * as React from "react";

import { SegmentedControl } from "./segmented-control";

const STUDIO_NAV = [
  { value: "chat", label: "Chat" },
  { value: "images", label: "Images" },
  { value: "audio", label: "Audio" },
  { value: "rerank", label: "Rerank" },
  { value: "advanced", label: "Advanced APIs" },
] as const;

type StudioNav = (typeof STUDIO_NAV)[number]["value"];

/** Interactive SegmentedControl fixtures for visual review and Paper sync. */
export function SegmentedControlSpecimensDemo() {
  const [studio, setStudio] = React.useState<StudioNav>("chat");
  const [range, setRange] = React.useState<"day" | "week" | "month">("week");

  return (
    <div className="flex flex-col gap-8 p-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">SegmentedControl · Studio page nav</h2>
        <SegmentedControl
          value={studio}
          options={STUDIO_NAV}
          onChange={setStudio}
          aria-label="Studio page"
        />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">SegmentedControl · short options</h2>
        <SegmentedControl
          value={range}
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
          ]}
          onChange={setRange}
          aria-label="Range"
        />
      </section>
    </div>
  );
}
