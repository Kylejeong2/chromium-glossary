export const DIAGRAM_KINDS = ["pipeline", "boundary", "hierarchy", "cycle"] as const;

export type DiagramKind = (typeof DIAGRAM_KINDS)[number];

export type DiagramNode = Readonly<{
  id: string;
  label: string;
}>;

export type DiagramEdge = Readonly<{
  from: string;
  to: string;
  label: string;
}>;

export type ConceptDiagram = Readonly<{
  kind: DiagramKind;
  description: string;
  nodes: readonly DiagramNode[];
  edges: readonly DiagramEdge[];
}>;

export type PrimarySource = Readonly<{
  label: string;
  href: string;
}>;

export type GlossaryEntry = Readonly<{
  order: number;
  slug: string;
  term: string;
  aliases: readonly string[];
  summary: string;
  definition: readonly string[];
  diagram: ConceptDiagram;
  codePaths: readonly string[];
  relatedTerms: readonly string[];
  primaryDocs: readonly PrimarySource[];
}>;

export type GlossaryStage = Readonly<{
  id: string;
  title: string;
  promise: string;
  entries: readonly GlossaryEntry[];
}>;

export type GlossaryDocument = Readonly<{
  title: string;
  description: string;
  updatedAt: string;
  stages: readonly GlossaryStage[];
}>;

export type GlossaryIssue = Readonly<{
  code: string;
  path: string;
  message: string;
}>;

const ALLOWED_SOURCE_HOSTS = new Set([
  "chromium.googlesource.com",
  "v8.googlesource.com",
]);

export function validateGlossary(document: GlossaryDocument): GlossaryIssue[] {
  const issues: GlossaryIssue[] = [];
  const entries = document.stages.flatMap((stage) => stage.entries);
  const slugs = new Set<string>();

  if (document.stages.length !== 7) {
    issues.push({ code: "stage.count", path: "stages", message: "Expected exactly 7 stages." });
  }
  if (entries.length !== 50) {
    issues.push({ code: "entry.count", path: "stages", message: "Expected exactly 50 entries." });
  }

  for (const [stageIndex, stage] of document.stages.entries()) {
    if (!stage.id || !stage.title || !stage.promise || stage.entries.length === 0) {
      issues.push({ code: "stage.required", path: `stages.${stageIndex}`, message: "Stage fields and entries are required." });
    }
    for (const [entryIndex, entry] of stage.entries.entries()) {
      const path = `stages.${stageIndex}.entries.${entryIndex}`;
      if (slugs.has(entry.slug)) {
        issues.push({ code: "slug.duplicate", path: `${path}.slug`, message: `Duplicate slug ${entry.slug}.` });
      }
      slugs.add(entry.slug);
      if (!entry.slug || !entry.term || !entry.summary || entry.definition.length === 0) {
        issues.push({ code: "entry.required", path, message: "Entry text fields are required." });
      }
      if (entry.codePaths.length === 0 || entry.relatedTerms.length === 0 || entry.primaryDocs.length === 0) {
        issues.push({ code: "entry.collections", path, message: "Code paths, related terms, and primary docs are required." });
      }
      if (!DIAGRAM_KINDS.includes(entry.diagram.kind) || entry.diagram.nodes.length < 2) {
        issues.push({ code: "diagram.invalid", path: `${path}.diagram`, message: "Diagram kind and nodes must be valid." });
      }
      const nodeIds = new Set(entry.diagram.nodes.map((node) => node.id));
      for (const edge of entry.diagram.edges) {
        if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
          issues.push({ code: "diagram.endpoint", path: `${path}.diagram.edges`, message: "Diagram edge has an unknown endpoint." });
        }
      }
      for (const codePath of entry.codePaths) {
        if (!/^\/\/[A-Za-z0-9_./-]+$/.test(codePath) || codePath.includes("..")) {
          issues.push({ code: "path.invalid", path: `${path}.codePaths`, message: `Unsafe source path ${codePath}.` });
        }
      }
      for (const source of entry.primaryDocs) {
        try {
          const url = new URL(source.href);
          if (url.protocol !== "https:" || !ALLOWED_SOURCE_HOSTS.has(url.hostname)) {
            throw new Error("unsupported source");
          }
        } catch {
          issues.push({ code: "source.invalid", path: `${path}.primaryDocs`, message: `Unsupported primary source ${source.href}.` });
        }
      }
    }
  }

  for (const [index, entry] of entries.entries()) {
    if (entry.order !== index + 1) {
      issues.push({ code: "order.invalid", path: `entry.${entry.slug}.order`, message: "Entry order must be contiguous." });
    }
    for (const related of entry.relatedTerms) {
      if (!slugs.has(related) || related === entry.slug) {
        issues.push({ code: "relationship.invalid", path: `entry.${entry.slug}.relatedTerms`, message: `Invalid related term ${related}.` });
      }
    }
  }
  return issues;
}

export function defineGlossary(document: GlossaryDocument): GlossaryDocument {
  const issues = validateGlossary(document);
  if (issues.length > 0) {
    throw new Error(`Invalid glossary:\n${issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n")}`);
  }
  return document;
}

export type CatalogQuery = Readonly<{ text?: string; stage?: string }>;

export type GlossaryCatalog = Readonly<{
  stages: readonly GlossaryStage[];
  entry: (slug: string) => GlossaryEntry | undefined;
  query: (query: CatalogQuery) => readonly GlossaryEntry[];
  navigation: (slug: string) => Readonly<{ previous?: GlossaryEntry; next?: GlossaryEntry }>;
}>;

export function createCatalog(document: GlossaryDocument): GlossaryCatalog {
  const entries = document.stages.flatMap((stage) => stage.entries);
  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const stageByEntry = new Map(document.stages.flatMap((stage) => stage.entries.map((entry) => [entry.slug, stage.id] as const)));
  const searchText = new Map(entries.map((entry) => [entry.slug, [entry.term, ...entry.aliases, entry.summary, ...entry.definition, ...entry.codePaths].join(" ").toLowerCase()]));

  return {
    stages: document.stages,
    entry: (slug) => bySlug.get(slug),
    query: ({ text = "", stage }) => {
      const words = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
      return entries
        .filter((entry) => !stage || stageByEntry.get(entry.slug) === stage)
        .map((entry) => {
          const haystack = searchText.get(entry.slug) ?? "";
          const title = entry.term.toLowerCase();
          const score = words.reduce((total, word) => total + (title === word ? 20 : title.startsWith(word) ? 10 : title.includes(word) ? 6 : haystack.includes(word) ? 2 : -100), 0);
          return { entry, score };
        })
        .filter(({ score }) => words.length === 0 || score >= 0)
        .sort((a, b) => b.score - a.score || a.entry.order - b.entry.order)
        .map(({ entry }) => entry);
    },
    navigation: (slug) => {
      const index = entries.findIndex((entry) => entry.slug === slug);
      if (index < 0) return {};
      return { previous: entries[index - 1], next: entries[index + 1] };
    },
  };
}

export type GlossaryRoute = Readonly<{ open: false }> | Readonly<{ open: true; slug?: string }>;

export function parseGlossaryPath(pathname: string): GlossaryRoute {
  if (pathname === "/glossary" || pathname === "/glossary/") return { open: true };
  const match = pathname.match(/^\/glossary\/([a-z0-9-]+)\/?$/);
  return match ? { open: true, slug: match[1] } : { open: false };
}
