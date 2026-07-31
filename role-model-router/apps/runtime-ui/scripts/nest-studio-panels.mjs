import { readFileSync, writeFileSync } from "node:fs";

function stripPageActions(source) {
  return source
    .replace(/import \{ usePageActions \} from "\.\.\/lib\/shell-header-context";\r?\n/, "")
    .replace(/\r?\n  usePageActions\([\s\S]*?\);\r?\n/, "\n")
    .replace(/  secondaryButtonClassName,\r?\n/, "")
    .replace(/\r?\n            description="[^"]*"/g, "");
}

let audio = stripPageActions(readFileSync("app/routes/studio-audio.tsx", "utf8"));
audio = audio.replace(
  /        <div className="space-y-4">\r?\n          <SectionCard\r?\n            title="Audio result stage"\r?\n          >([\s\S]*?)\r?\n          <\/SectionCard>\r?\n\r?\n          <SectionCard\r?\n            title="Voice inventory"\r?\n          >([\s\S]*?)\r?\n          <\/SectionCard>\r?\n        <\/div>/,
  (_m, stage, inventory) =>
    `        <SectionCard title="Audio result stage">\n          <div className="space-y-4">${stage}\n            <div className="space-y-2">\n              <p className={metaTextClassName}>Voice inventory</p>${inventory}\n            </div>\n          </div>\n        </SectionCard>`,
);
writeFileSync("app/routes/studio-audio.tsx", audio);
console.log("audio", {
  pageActions: audio.includes("usePageActions"),
  nested: audio.includes("Voice inventory</p>"),
});

let rerank = stripPageActions(readFileSync("app/routes/studio-rerank.tsx", "utf8"));
rerank = rerank.replace(
  /        <div className="space-y-4">\r?\n          <SectionCard\r?\n            title="Ranked results"\r?\n          >([\s\S]*?)\r?\n          <\/SectionCard>\r?\n\r?\n          <SectionCard\r?\n            title="Contract details"\r?\n          >([\s\S]*?)\r?\n          <\/SectionCard>\r?\n        <\/div>/,
  (_m, ranked, contract) =>
    `        <SectionCard title="Ranked results">\n          <div className="space-y-4">${ranked}\n            <div className="space-y-2">\n              <p className={metaTextClassName}>Contract details</p>${contract}\n            </div>\n          </div>\n        </SectionCard>`,
);
if (!rerank.includes("metaTextClassName")) {
  rerank = rerank.replace(
    'compactTitleClassName,\n',
    'compactTitleClassName,\n  metaTextClassName,\n',
  );
}
writeFileSync("app/routes/studio-rerank.tsx", rerank);
console.log("rerank", {
  pageActions: rerank.includes("usePageActions"),
  nested: rerank.includes("Contract details</p>"),
});
