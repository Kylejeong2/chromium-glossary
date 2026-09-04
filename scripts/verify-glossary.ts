import rawDocument from "../src/data/chromium-glossary.json";
import rawEvidenceLock from "../evidence/chromium-evidence-lock.json";
import { chromiumGlossary } from "../src/data/chromium-glossary";
import { validateEvidenceLock } from "../src/domain/evidence-lock";
import { DIAGRAM_PATTERNS, validateGlossary, type GlossaryIssue } from "../src/domain/glossary";

const issues: GlossaryIssue[] = [...validateGlossary(rawDocument), ...validateEvidenceLock(chromiumGlossary, rawEvidenceLock)];
const entries = chromiumGlossary.stages.flatMap((stage) => stage.entries);
const issue = (code: string, path: string, message: string) => issues.push({ code, path, message });
const normalized = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

if (JSON.stringify(rawDocument) !== JSON.stringify(chromiumGlossary)) {
  issue("authority.transformed", "src/data/chromium-glossary.json", "The runtime document must match the direct JSON authority byte for value.");
}

const patterns = new Set(entries.map((entry) => entry.diagram.intent.pattern));
for (const pattern of DIAGRAM_PATTERNS) {
  if (!patterns.has(pattern)) issue("pattern.coverage", "entries", `No entry exercises the ${pattern} diagram pattern.`);
}

const ledes = new Set<string>();
for (const entry of entries) {
  const path = `entry.${entry.slug}`;
  const lede = normalized(entry.lede.text);
  if (ledes.has(lede)) issue("copy.lede-duplicate", `${path}.lede`, "Every entry needs a distinct lede.");
  ledes.add(lede);

  const mechanismText = entry.explanation.map((claim) => normalized(claim.text));
  if (new Set(mechanismText).size !== mechanismText.length || mechanismText.includes(lede)) {
    issue("copy.mechanism-duplicate", `${path}.explanation`, "Mechanism sentences cannot repeat each other or the lede.");
  }
  const detailText = entry.details.flatMap((section) => section.claims.map((claim) => normalized(claim.text)));
  const fullEntryCopy = [lede, ...mechanismText, ...detailText];
  if (new Set(fullEntryCopy).size !== fullEntryCopy.length) {
    issue("copy.detail-duplicate", `${path}.details`, "Deeper explanations cannot repeat the lede or mechanism copy.");
  }
  const proseWords = [entry.lede.text, ...entry.explanation.map((claim) => claim.text), ...entry.details.flatMap((section) => section.claims.map((claim) => claim.text))].join(" ").trim().split(/\s+/).length;
  if (proseWords < 100) issue("copy.depth", path, `Entry prose needs at least 100 words; found ${proseWords}.`);

  const nodeIds = new Set(entry.diagram.nodes.map((node) => node.id));
  const groupIds = new Set(entry.diagram.groups.map((group) => group.id));
  for (const edge of entry.diagram.edges) {
    const validFrom = edge.from.kind === "node" ? nodeIds.has(edge.from.id) : groupIds.has(edge.from.id);
    const validTo = edge.to.kind === "node" ? nodeIds.has(edge.to.id) : groupIds.has(edge.to.id);
    if (!validFrom || !validTo) issue("diagram.endpoint", `${path}.diagram.edges.${edge.id}`, "Both authored endpoints must resolve with the declared endpoint kind.");
    if (!edge.label.trim()) issue("diagram.edge-label", `${path}.diagram.edges.${edge.id}`, "Every relationship needs a human label.");
  }
  for (const group of entry.diagram.groups) {
    if (group.nodeIds.some((id) => !nodeIds.has(id))) issue("diagram.group-member", `${path}.diagram.groups.${group.id}`, "Every group member must resolve to an authored node.");
  }

  for (const source of entry.sources) {
    if (source.reviewedUrl.includes("/+/HEAD/")) issue("source.mutable-review", `${path}.sources.${source.id}`, "Reviewed evidence cannot use HEAD.");
    if (!source.publicUrl.includes("/+/HEAD/")) issue("source.public-head", `${path}.sources.${source.id}`, "The public convenience link must follow HEAD.");
  }
}

const serialized = JSON.stringify(rawDocument);
for (const forbidden of ["semanticKind", "node-1", "Conceptual, not exhaustive", "//content/browser/child_process_security_policy_impl.cc", "docs/bitmap_pipeline.md", "//base/trace_event"]) {
  if (serialized.includes(forbidden)) issue("legacy.remnant", "document", `Legacy or inaccurate token remains: ${forbidden}`);
}
for (const required of ["content/browser/security/cpsp/child_process_security_policy_impl.cc", "docs/how_cc_works.md", "base/tracing/README.md", "NetworkAnonymizationKey", "TaskSchedulingInBlink.md"]) {
  if (!serialized.includes(required)) issue("audit.required-fix", "document", `Required audited correction is missing: ${required}`);
}

if (issues.length > 0) {
  console.error(JSON.stringify({ ok: false, issues }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  schemaVersion: chromiumGlossary.schemaVersion,
  stages: chromiumGlossary.stages.length,
  entries: entries.length,
  uniqueSlugs: new Set(entries.map((entry) => entry.slug)).size,
  relationships: entries.reduce((count, entry) => count + entry.relatedSlugs.length, 0),
  evidenceSources: entries.reduce((count, entry) => count + entry.sources.length, 0),
  reviewedCodePaths: entries.reduce((count, entry) => count + entry.codePaths.length, 0),
  lockedSources: rawEvidenceLock.sources.length,
  lockedCodePaths: rawEvidenceLock.codePaths.length,
  evidenceVerifiedAt: rawEvidenceLock.generatedAt,
  diagramPatterns: [...patterns].sort(),
}, null, 2));
