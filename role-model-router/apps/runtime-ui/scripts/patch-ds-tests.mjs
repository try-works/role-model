import { readFileSync, writeFileSync } from "node:fs";

const path = "app/lib/design-system.test.ts";
let s = readFileSync(path, "utf8");

const replacements = [
  [
    `    expect(workbenchRouteSource).not.toContain("buildCredentialLifecycleBanner");
    expect(studioAdvancedRouteSource).toContain("buildCredentialLifecycleBanner");`,
    `    expect(workbenchRouteSource).not.toContain("buildCredentialLifecycleBanner");
    expect(studioAdvancedRouteSource).not.toContain("buildCredentialLifecycleBanner");
    expect(studioAdvancedRouteSource).not.toContain("Execution readiness");`,
  ],
  [
    `    expect(dashboardRouteSource).toContain('label="Status family"');
    expect(dashboardRouteSource).toContain('label="Difficulty bucket"');
    expect(dashboardRouteSource).toContain('label="Provider"');
    expect(dashboardRouteSource).toContain('label="Model"');
    expect(dashboardRouteSource).toContain('label="Endpoint"');
    expect(dashboardRouteSource).toContain('label="Requested role"');`,
    `    expect(dashboardRouteSource).toContain('label: "Status"');
    expect(dashboardRouteSource).toContain('label: "Difficulty"');
    expect(dashboardRouteSource).not.toContain('label="Provider"');
    expect(dashboardRouteSource).not.toContain('label="Requested role"');
    expect(dashboardRouteSource).toContain("Candidate space");
    expect(dashboardRouteSource).toContain("onFieldChange");`,
  ],
  [
    `    expect(dashboardRouteSource).toContain("Overview filters");
    expect(dashboardRouteSource).not.toContain('SectionCard title="Overview filters"');`,
    `    expect(dashboardRouteSource).not.toContain("Overview filters");
    expect(dashboardRouteSource).not.toContain('SectionCard title="Overview filters"');`,
  ],
  [
    `    expect(dashboardRouteSource).toContain('SectionCard title="Latest requests"');
    expect(dashboardRouteSource).toContain("xl:grid-cols-[repeat(3,minmax(0,1fr))]");
    expect(dashboardRouteSource.indexOf('SectionCard title="Latest requests"')).toBeLessThan(
      dashboardRouteSource.indexOf('SectionCard title="Current endpoint inventory"'),
    );`,
    `    expect(dashboardRouteSource).not.toContain('SectionCard title="Latest requests"');
    expect(dashboardRouteSource).not.toContain('SectionCard title="Current endpoint inventory"');`,
  ],
  [
    `    expect(dashboardRouteSource).toContain("Open request analytics");`,
    `    expect(dashboardRouteSource).not.toContain("Open request analytics");`,
  ],
];

for (const [from, to] of replacements) {
  if (!s.includes(from)) {
    console.error("MISSING block:\n", from.slice(0, 120));
    process.exitCode = 1;
  } else {
    s = s.replace(from, to);
    console.log("patched block");
  }
}

// Studio titles
for (const [oldTitle, newTitle] of [
  ["Image workflows", "Images workspace"],
  ["Audio workflows", "Audio workspace"],
  ['title: "Rerank"', 'title: "Rerank workspace"'],
  ["Advanced APIs", "Advanced workspace"],
]) {
  // only designSystemSource title asserts if present
}

writeFileSync(path, s);
console.log("done");
