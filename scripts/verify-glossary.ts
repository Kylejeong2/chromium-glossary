import { chromiumGlossary } from "../src/data/chromium-glossary";
import { DIAGRAM_KINDS, validateGlossary } from "../src/domain/glossary";

const APPROVED_STAGE_ORDER = [
  "meet-the-browser",
  "process-boundaries",
  "url-to-document",
  "rendering-pixels",
  "javascript-scheduling",
  "security-boundaries",
  "observe-verify",
];

const entries = chromiumGlossary.stages.flatMap((stage) => stage.entries);
const issues = validateGlossary(chromiumGlossary);
const stageOrder = chromiumGlossary.stages.map((stage) => stage.id);

if (JSON.stringify(stageOrder) !== JSON.stringify(APPROVED_STAGE_ORDER)) {
  issues.push({ code: "stage.order", path: "stages", message: "Stage order does not match the approved learning journey." });
}

for (const entry of entries) {
  if (!DIAGRAM_KINDS.includes(entry.diagram.kind)) {
    issues.push({ code: "diagram.kind", path: `entry.${entry.slug}.diagram`, message: "Diagram must use the semantic four-kind grammar." });
  }
  if (entry.primaryDocs.some((source) => !source.href.includes("/+/HEAD/"))) {
    issues.push({ code: "source.head", path: `entry.${entry.slug}.primaryDocs`, message: "Primary docs must use stable HEAD Gitiles links." });
  }
}

if (issues.length > 0) {
  console.error(JSON.stringify({ ok: false, issues }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  stages: chromiumGlossary.stages.length,
  entries: entries.length,
  uniqueSlugs: new Set(entries.map((entry) => entry.slug)).size,
  relationships: entries.reduce((count, entry) => count + entry.relatedTerms.length, 0),
  sourceLinks: entries.reduce((count, entry) => count + entry.primaryDocs.length, 0),
  diagramKinds: [...new Set(entries.map((entry) => entry.diagram.kind))].sort(),
}, null, 2));
