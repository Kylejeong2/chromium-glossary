import rawEntries from "./chromium-entries.json";
import { defineGlossary, type DiagramKind, type GlossaryDocument, type GlossaryEntry } from "../domain/glossary";

type RawEntry = (typeof rawEntries)[number];

const STAGES = [
  { category: "01 · Orientation", id: "meet-the-browser", title: "Meet the browser", promise: "Learn the layers that turn Chromium into a browser product." },
  { category: "02 · Processes & Isolation", id: "process-boundaries", title: "Cross process boundaries", promise: "See how Chromium divides work, ownership, and failure." },
  { category: "03 · From URL to Document", id: "url-to-document", title: "Travel from URL to document", promise: "Follow a navigation through policy, network, storage, and workers." },
  { category: "04 · Rendering Pixels", id: "rendering-pixels", title: "Render the pixels", promise: "Trace content from Blink structures to composed GPU surfaces." },
  { category: "05 · JavaScript & Scheduling", id: "javascript-scheduling", title: "Run JavaScript and work", promise: "Understand V8, bindings, tasks, workers, and memory." },
  { category: "06 · Security Boundaries", id: "security-boundaries", title: "Defend the boundary", promise: "Connect sandbox policy to Chromium's process model." },
  { category: "07 · Observe & Verify", id: "observe-verify", title: "Observe the system", promise: "Use tracing to turn browser behavior into evidence." },
] as const;

const PIPELINE_KINDS = new Set(["sequence", "pipeline", "transformation", "timeline", "branch", "decision-flow", "gates", "state-transition"]);
const BOUNDARY_KINDS = new Set(["venn", "boundary", "gate", "partition", "nested-sets", "security-triangle", "diff"]);
const CYCLE_KINDS = new Set(["cycle", "timing", "reachability"]);

function semanticKind(kind: string): DiagramKind {
  if (PIPELINE_KINDS.has(kind)) return "pipeline";
  if (BOUNDARY_KINDS.has(kind)) return "boundary";
  if (CYCLE_KINDS.has(kind)) return "cycle";
  return "hierarchy";
}

function paragraphs(definition: string): readonly string[] {
  const sentences = definition.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)?.map((sentence) => sentence.trim()) ?? [definition];
  if (sentences.length < 2) return sentences;
  return [sentences[0], sentences.slice(1).join(" ")];
}

function sourceLabel(href: string): string {
  const path = new URL(href).pathname.split("/+/HEAD/")[1] ?? "Chromium documentation";
  return path.replace(/\.(md|h)$/, "").replaceAll("_", " ");
}

function normalizeEntry(raw: RawEntry): GlossaryEntry {
  const nodes = raw.diagram.nodes.map((label, index) => ({ id: `node-${index + 1}`, label }));
  return {
    order: raw.order,
    slug: raw.slug,
    term: raw.title,
    aliases: [raw.title.replaceAll(" and ", " & ")],
    summary: paragraphs(raw.definition)[0],
    definition: paragraphs(raw.definition),
    diagram: {
      kind: semanticKind(raw.diagram.kind),
      description: `A conceptual ${semanticKind(raw.diagram.kind)} diagram for ${raw.title}.`,
      nodes,
      edges: raw.diagram.edges.map((label, index) => ({
        from: nodes[index % Math.max(1, nodes.length - 1)].id,
        to: nodes[Math.min((index % Math.max(1, nodes.length - 1)) + 1, nodes.length - 1)].id,
        label,
      })),
    },
    codePaths: raw.sourcePaths,
    relatedTerms: raw.relatedTerms,
    primaryDocs: raw.docs.map((href) => ({ href, label: sourceLabel(href) })),
  };
}

export const chromiumGlossary: GlossaryDocument = defineGlossary({
  title: "The Chromium glossary",
  description: "Fifty concepts for understanding how Chromium moves from a URL to pixels, safely.",
  updatedAt: "2026-09-02",
  stages: STAGES.map((stage) => ({
    id: stage.id,
    title: stage.title,
    promise: stage.promise,
    entries: rawEntries.filter((entry) => entry.category === stage.category).map(normalizeEntry),
  })),
});
