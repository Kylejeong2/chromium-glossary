export const DIAGRAM_PATTERNS = [
  "linear",
  "branch",
  "fan-in",
  "fan-out",
  "containment",
  "boundary",
  "cycle",
  "state",
] as const;

export type DiagramPattern = (typeof DIAGRAM_PATTERNS)[number];
export type RepositoryId = "chromium" | "v8";
type DiagramTone = "neutral" | "focus" | "negative";
type NodeShape = "structure" | "action";
type EdgeDirection = "forward" | "both" | "none";
type EvidenceRef = string;

export type EvidenceLocator =
  | Readonly<{ kind: "heading"; value: string }>
  | Readonly<{ kind: "symbol"; value: string }>
  | Readonly<{ kind: "line-range"; start: number; end: number }>;

export type EvidenceSource = Readonly<{
  id: string;
  title: string;
  repository: RepositoryId;
  path: string;
  locator: EvidenceLocator;
  reviewedRevision: string;
  reviewedUrl: string;
  publicUrl: string;
  reviewedAt: string;
  scopeNote?: string;
}>;

type SupportedClaim = Readonly<{
  id: string;
  text: string;
  evidence: readonly EvidenceRef[];
}>;

export type CodeReference = Readonly<{
  path: string;
  repository: RepositoryId;
  reviewedRevision: string;
  reviewedUrl: string;
  publicUrl: string;
  status: "exists-at-reviewed-revision";
}>;

export type DiagramNode = Readonly<{
  id: string;
  label: string;
  shape: NodeShape;
  tone: DiagramTone;
  evidence: readonly EvidenceRef[];
}>;

export type DiagramEndpoint = Readonly<{ kind: "node" | "group"; id: string }>;

export type DiagramEdge = Readonly<{
  id: string;
  from: DiagramEndpoint;
  to: DiagramEndpoint;
  label: string;
  direction: EdgeDirection;
  tone: DiagramTone;
  evidence: readonly EvidenceRef[];
}>;

export type DiagramGroup = Readonly<{
  id: string;
  label: string;
  kind: "container" | "region";
  nodeIds: readonly string[];
  parentGroupId?: string;
  tone: "neutral" | "focus";
  evidence: readonly EvidenceRef[];
}>;

export type DiagramIntent =
  | Readonly<{ pattern: "linear"; order: readonly string[] }>
  | Readonly<{ pattern: "branch"; rootId: string }>
  | Readonly<{ pattern: "fan-in"; sinkId: string }>
  | Readonly<{ pattern: "fan-out"; sourceId: string }>
  | Readonly<{ pattern: "containment"; groupOrder: readonly string[]; sharedNodeIds?: readonly string[] }>
  | Readonly<{ pattern: "boundary"; regionOrder: readonly string[] }>
  | Readonly<{ pattern: "cycle"; startId: string; order: readonly string[] }>
  | Readonly<{ pattern: "state"; stateIds: readonly string[]; decisionNodeIds: readonly string[] }>;

export type ConceptDiagram = Readonly<{
  id: string;
  title: string;
  summary: string;
  caption: SupportedClaim;
  intent: DiagramIntent;
  nodes: readonly DiagramNode[];
  edges: readonly DiagramEdge[];
  groups: readonly DiagramGroup[];
}>;

export type GlossaryEntry = Readonly<{
  order: number;
  slug: string;
  term: string;
  aliases: readonly string[];
  lede: SupportedClaim;
  explanation: readonly SupportedClaim[];
  diagram: ConceptDiagram;
  codePaths: readonly CodeReference[];
  relatedSlugs: readonly string[];
  sources: readonly EvidenceSource[];
}>;

export type GlossaryStage = Readonly<{
  id: string;
  title: string;
  description: string;
  entries: readonly GlossaryEntry[];
}>;

export type GlossaryDocument = Readonly<{
  schemaVersion: 2;
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

const APPROVED_STAGE_ORDER = [
  "meet-the-browser",
  "process-boundaries",
  "url-to-document",
  "rendering-pixels",
  "javascript-scheduling",
  "security-boundaries",
  "observe-verify",
] as const;

const FORBIDDEN_PUNCTUATION = /[\u2013\u2014\u2018\u2019\u201c\u201d]/;
const FORBIDDEN_FILLER = /conceptual, not exhaustive|other web-facing machinery|appropriate sandbox|evolving visual output/i;
const NEGATIVE_LABEL = /unsafe|untrust|blocked|failed|failure|cancelled|error|legacy|high privilege/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function normalizeCopy(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function repositoryRelativePath(repository: RepositoryId, sourcePath: string): string {
  const path = sourcePath.replace(/^\/\//, "");
  if (repository === "v8" && (path === "v8" || path.startsWith("v8/"))) return path === "v8" ? "" : path.slice(3);
  return path;
}

export function reviewedSourceUrl(repository: RepositoryId, revision: string, sourcePath: string, publicLink = false): string {
  const root = repository === "chromium" ? "https://chromium.googlesource.com/chromium/src" : "https://chromium.googlesource.com/v8/v8";
  return `${root}/+/${publicLink ? "HEAD" : revision}/${repositoryRelativePath(repository, sourcePath)}`;
}

function validSourceUrl(value: unknown, repository: string, sourcePath: string, revision: string, publicLink = false): boolean {
  if (!(["chromium", "v8"] as string[]).includes(repository)) return false;
  return asString(value) === reviewedSourceUrl(repository as RepositoryId, revision, sourcePath, publicLink);
}

function walkStrings(value: unknown, visit: (text: string, path: string) => void, path = "document"): void {
  if (typeof value === "string") {
    visit(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkStrings(item, visit, `${path}.${index}`));
    return;
  }
  if (isRecord(value)) Object.entries(value).forEach(([key, item]) => walkStrings(item, visit, `${path}.${key}`));
}

function endpointId(endpoint: unknown): string {
  return isRecord(endpoint) ? asString(endpoint.id) : "";
}

function validatePattern(diagram: Record<string, unknown>, path: string, issues: GlossaryIssue[]): void {
  const intent = isRecord(diagram.intent) ? diagram.intent : {};
  const pattern = asString(intent.pattern) as DiagramPattern;
  const nodes = asArray(diagram.nodes).filter(isRecord);
  const edges = asArray(diagram.edges).filter(isRecord);
  const groups = asArray(diagram.groups).filter(isRecord);
  const nodeIds = new Set(nodes.map((node) => asString(node.id)));
  const groupIds = new Set(groups.map((group) => asString(group.id)));
  const exists = (id: string) => nodeIds.has(id) || groupIds.has(id);
  const outgoing = (id: string) => edges.filter((edge) => endpointId(edge.from) === id);
  const incoming = (id: string) => edges.filter((edge) => endpointId(edge.to) === id);

  if (!DIAGRAM_PATTERNS.includes(pattern)) {
    issues.push({ code: "diagram.pattern", path: `${path}.intent.pattern`, message: "Diagram must declare one of the eight patterns." });
    return;
  }

  if (pattern === "linear") {
    const order = asArray(intent.order).map(asString);
    if (order.length < 2 || new Set(order).size !== order.length || order.some((id) => !nodeIds.has(id))) {
      issues.push({ code: "diagram.linear.order", path, message: "Linear order must name at least two unique nodes." });
    }
    for (let index = 0; index < order.length - 1; index += 1) {
      if (!edges.some((edge) => endpointId(edge.from) === order[index] && endpointId(edge.to) === order[index + 1])) {
        issues.push({ code: "diagram.linear.path", path, message: `Linear path is missing ${order[index]} to ${order[index + 1]}.` });
      }
    }
  }

  if (pattern === "branch") {
    const rootId = asString(intent.rootId);
    if (!nodeIds.has(rootId) || outgoing(rootId).length < 2) {
      issues.push({ code: "diagram.branch.root", path, message: "Branch root must exist and have at least two authored children." });
    }
  }

  if (pattern === "fan-in") {
    const sinkId = asString(intent.sinkId);
    if (!nodeIds.has(sinkId) || incoming(sinkId).length < 2) {
      issues.push({ code: "diagram.fan-in.sink", path, message: "Fan-in sink must have at least two incoming edges." });
    }
  }

  if (pattern === "fan-out") {
    const sourceId = asString(intent.sourceId);
    if (!nodeIds.has(sourceId) || outgoing(sourceId).length < 2) {
      issues.push({ code: "diagram.fan-out.source", path, message: "Fan-out source must have at least two outgoing edges." });
    }
  }

  if (pattern === "containment") {
    const order = asArray(intent.groupOrder).map(asString);
    if (order.length === 0 || order.some((id) => !groupIds.has(id))) {
      issues.push({ code: "diagram.containment.groups", path, message: "Containment must order existing groups." });
    }
    const parents = new Map(groups.map((group) => [asString(group.id), asString(group.parentGroupId)]));
    for (const id of groupIds) {
      const seen = new Set<string>();
      let current = id;
      while (parents.get(current)) {
        current = parents.get(current) ?? "";
        if (seen.has(current)) {
          issues.push({ code: "diagram.containment.cycle", path, message: "Containment group parents cannot cycle." });
          break;
        }
        seen.add(current);
      }
    }
  }

  if (pattern === "boundary") {
    const regions = asArray(intent.regionOrder).map(asString);
    if (regions.length < 2 || regions.some((id) => !groupIds.has(id))) {
      issues.push({ code: "diagram.boundary.regions", path, message: "Boundary diagrams require at least two named regions." });
    }
    for (const region of regions) {
      const group = groups.find((candidate) => asString(candidate.id) === region);
      if (!group || asString(group.kind) !== "region" || asArray(group.nodeIds).length === 0) {
        issues.push({ code: "diagram.boundary.membership", path, message: `Boundary region ${region} must name at least one member.` });
      }
    }
    const membership = new Map<string, number>();
    for (const region of regions) {
      const group = groups.find((candidate) => asString(candidate.id) === region);
      for (const nodeId of asArray(group?.nodeIds).map(asString)) membership.set(nodeId, (membership.get(nodeId) ?? 0) + 1);
    }
    for (const nodeId of nodeIds) {
      if (membership.get(nodeId) !== 1) {
        issues.push({ code: "diagram.boundary.membership", path, message: `Boundary node ${nodeId} must belong to exactly one ordered region.` });
      }
    }
  }

  if (pattern === "cycle") {
    const startId = asString(intent.startId);
    const order = asArray(intent.order).map(asString);
    if (!nodeIds.has(startId) || order[0] !== startId || new Set(order).size !== order.length) {
      issues.push({ code: "diagram.cycle.order", path, message: "Cycle order must start at startId and contain unique nodes." });
    } else if (!edges.some((edge) => endpointId(edge.from) === order.at(-1) && endpointId(edge.to) === startId)) {
      issues.push({ code: "diagram.cycle.closure", path, message: "Cycle must author the closing edge back to startId." });
    }
  }

  if (pattern === "state") {
    const stateIds = asArray(intent.stateIds).map(asString);
    const decisions = asArray(intent.decisionNodeIds).map(asString);
    if (stateIds.length < 2 || [...stateIds, ...decisions].some((id) => !nodeIds.has(id))) {
      issues.push({ code: "diagram.state.nodes", path, message: "State intent must name existing states and decisions." });
    }
    for (const decision of decisions) {
      if (outgoing(decision).length < 2) {
        issues.push({ code: "diagram.state.outcomes", path, message: `Decision ${decision} needs at least two labeled outcomes.` });
      }
    }
  }

  for (const edge of edges) {
    if (!exists(endpointId(edge.from)) || !exists(endpointId(edge.to))) {
      issues.push({ code: "diagram.endpoint", path: `${path}.edges`, message: "Every edge endpoint must resolve to an authored node or group." });
    }
  }
}

export function validateGlossary(input: unknown): GlossaryIssue[] {
  const issues: GlossaryIssue[] = [];
  if (!isRecord(input)) return [{ code: "document.type", path: "document", message: "Glossary must be an object." }];
  if (input.schemaVersion !== 2) issues.push({ code: "document.schema", path: "schemaVersion", message: "Expected direct schema version 2." });

  const stages = asArray(input.stages).filter(isRecord);
  const entries = stages.flatMap((stage) => asArray(stage.entries).filter(isRecord));
  const stageIds = stages.map((stage) => asString(stage.id));
  if (JSON.stringify(stageIds) !== JSON.stringify(APPROVED_STAGE_ORDER)) {
    issues.push({ code: "stage.order", path: "stages", message: "Stage order must match the approved learning journey." });
  }
  if (entries.length !== 50) issues.push({ code: "entry.count", path: "stages", message: "Expected exactly 50 entries." });

  const slugs = new Set<string>();
  for (const [stageIndex, stage] of stages.entries()) {
    if (!stage.id || !stage.title || !stage.description || asArray(stage.entries).length === 0) {
      issues.push({ code: "stage.required", path: `stages.${stageIndex}`, message: "Stage id, title, description, and entries are required." });
    }
    for (const [entryIndex, value] of asArray(stage.entries).entries()) {
      if (!isRecord(value)) continue;
      const entry = value;
      const path = `stages.${stageIndex}.entries.${entryIndex}`;
      const slug = asString(entry.slug);
      if (!slug || slugs.has(slug)) issues.push({ code: "slug.invalid", path: `${path}.slug`, message: `Missing or duplicate slug ${slug}.` });
      slugs.add(slug);
      if (!entry.term || !Array.isArray(entry.aliases) || asArray(entry.aliases).some((alias) => !asString(alias))) issues.push({ code: "entry.required", path, message: "Term and string aliases are required." });

      const lede = isRecord(entry.lede) ? entry.lede : {};
      const explanation = asArray(entry.explanation).filter(isRecord);
      if (!lede.text || asArray(lede.evidence).length === 0 || explanation.length < 2 || explanation.length > 4) {
        issues.push({ code: "entry.copy", path, message: "One evidenced lede and two to four evidenced mechanism sentences are required." });
      }
      for (const claim of explanation) {
        if (!claim.text || asArray(claim.evidence).length === 0) issues.push({ code: "claim.evidence", path, message: "Every mechanism sentence needs evidence." });
        if (normalizeCopy(asString(claim.text)) === normalizeCopy(asString(lede.text))) {
          issues.push({ code: "copy.repeated", path, message: "The lede cannot repeat in the explanation." });
        }
      }

      const sources = asArray(entry.sources).filter(isRecord);
      const sourceIds = new Set(sources.map((source) => asString(source.id)));
      if (sources.length === 0 || sourceIds.size !== sources.length) issues.push({ code: "source.required", path: `${path}.sources`, message: "Entry-local evidence sources need unique IDs." });
      for (const source of sources) {
        const revision = asString(source.reviewedRevision);
        const title = asString(source.title);
        const sourcePath = asString(source.path);
        const repository = asString(source.repository);
        const locator = isRecord(source.locator) ? source.locator : {};
        if (!/^[a-f0-9]{40}$/.test(revision) || !validSourceUrl(source.reviewedUrl, repository, sourcePath, revision) || !validSourceUrl(source.publicUrl, repository, sourcePath, revision, true)) {
          issues.push({ code: "source.revision", path: `${path}.sources.${asString(source.id)}`, message: "Sources need immutable reviewed URLs and separate public HEAD links." });
        }
        if (!title || /^(docs|content|third_party|components|net|base|services|gpu|ui)(?:\/|:)|^\/\//i.test(title) || /\.(md|h|cc)$/i.test(title)) {
          issues.push({ code: "source.title", path: `${path}.sources.${asString(source.id)}`, message: "Source titles must be authored for humans." });
        }
        if (!source.id || !["chromium", "v8"].includes(repository) || !/^\/\/[A-Za-z0-9_./-]+$/.test(sourcePath) || sourcePath.includes("..")) {
          issues.push({ code: "source.identity", path: `${path}.sources.${asString(source.id)}`, message: "Evidence sources need a repository, safe source path, and ID." });
        }
        const locatorKind = asString(locator.kind);
        if (locatorKind === "line-range") {
          if (!Number.isInteger(locator.start) || !Number.isInteger(locator.end) || Number(locator.start) < 1 || Number(locator.end) < Number(locator.start)) {
            issues.push({ code: "source.locator", path, message: "Line locators must be positive ordered ranges." });
          }
        } else if (!["heading", "symbol"].includes(locatorKind) || !asString(locator.value)) {
          issues.push({ code: "source.locator", path, message: "Every source needs a precise heading, symbol, or line range." });
        }
      }

      const evidenceLists: unknown[] = [lede.evidence];
      explanation.forEach((claim) => evidenceLists.push(claim.evidence));
      const diagram = isRecord(entry.diagram) ? entry.diagram : {};
      const caption = isRecord(diagram.caption) ? diagram.caption : {};
      evidenceLists.push(caption.evidence);
      asArray(diagram.nodes).filter(isRecord).forEach((node) => evidenceLists.push(node.evidence));
      asArray(diagram.edges).filter(isRecord).forEach((edge) => evidenceLists.push(edge.evidence));
      asArray(diagram.groups).filter(isRecord).forEach((group) => evidenceLists.push(group.evidence));
      for (const refs of evidenceLists) {
        if (asArray(refs).length === 0 || asArray(refs).some((ref) => !sourceIds.has(asString(ref)))) {
          issues.push({ code: "evidence.unresolved", path, message: "Every claim and diagram unit must resolve to entry-local evidence." });
        }
      }

      const nodes = asArray(diagram.nodes).filter(isRecord);
      const edges = asArray(diagram.edges).filter(isRecord);
      const groups = asArray(diagram.groups).filter(isRecord);
      const allDiagramIds = [...nodes, ...edges, ...groups].map((item) => asString(item.id));
      if (!diagram.id || !diagram.title || !diagram.summary || !caption.text || nodes.length < 2 || new Set(allDiagramIds).size !== allDiagramIds.length) {
        issues.push({ code: "diagram.required", path: `${path}.diagram`, message: "Diagram IDs, copy, nodes, and unique unit IDs are required." });
      }
      for (const unit of [...nodes, ...edges]) {
        const tone = asString(unit.tone);
        if (!["neutral", "focus", "negative"].includes(tone)) issues.push({ code: "diagram.tone", path, message: "Diagram tone must be explicit." });
        if (tone === "focus" && NEGATIVE_LABEL.test(`${asString(unit.label)} ${asString(unit.id)}`)) {
          issues.push({ code: "diagram.negative-focus", path, message: "Negative or unsafe concepts cannot receive the focus tone." });
        }
      }
      const nodeIds = new Set(nodes.map((node) => asString(node.id)));
      const groupIds = new Set(groups.map((group) => asString(group.id)));
      for (const node of nodes) {
        if (!node.id || !node.label || !["structure", "action"].includes(asString(node.shape))) {
          issues.push({ code: "diagram.node", path: `${path}.diagram.nodes`, message: "Every node needs an ID, label, and semantic shape." });
        }
      }
      for (const group of groups) {
        const parent = asString(group.parentGroupId);
        if (!group.id || !group.label || !["container", "region"].includes(asString(group.kind)) || !["neutral", "focus"].includes(asString(group.tone)) || asArray(group.nodeIds).some((id) => !nodeIds.has(asString(id))) || (parent && !groupIds.has(parent))) {
          issues.push({ code: "diagram.group", path: `${path}.diagram.groups`, message: "Every group needs valid metadata, members, and parent references." });
        }
        if (asString(group.tone) === "focus" && NEGATIVE_LABEL.test(`${asString(group.label)} ${asString(group.id)}`)) {
          issues.push({ code: "diagram.negative-focus", path: `${path}.diagram.groups`, message: "Negative or unsafe concepts cannot receive the focus tone." });
        }
      }
      for (const edge of edges) {
        const from = isRecord(edge.from) ? edge.from : {};
        const to = isRecord(edge.to) ? edge.to : {};
        const resolves = (endpoint: Record<string, unknown>) => asString(endpoint.kind) === "node" ? nodeIds.has(asString(endpoint.id)) : asString(endpoint.kind) === "group" ? groupIds.has(asString(endpoint.id)) : false;
        if (!edge.id || !edge.label || !["forward", "both", "none"].includes(asString(edge.direction)) || !resolves(from) || !resolves(to)) {
          issues.push({ code: "diagram.edge", path: `${path}.diagram.edges`, message: "Every edge needs an ID, label, direction, and typed authored endpoints." });
        }
      }
      validatePattern(diagram, `${path}.diagram`, issues);

      const codePaths = asArray(entry.codePaths).filter(isRecord);
      if (codePaths.length === 0) issues.push({ code: "path.required", path, message: "Every entry needs representative code paths." });
      for (const codePath of codePaths) {
        const sourcePath = asString(codePath.path);
        const revision = asString(codePath.reviewedRevision);
        const repository = asString(codePath.repository);
        if (!/^\/\/[A-Za-z0-9_./-]+$/.test(sourcePath) || sourcePath.includes("..") || !["chromium", "v8"].includes(repository) || asString(codePath.status) !== "exists-at-reviewed-revision" || !/^[a-f0-9]{40}$/.test(revision) || !validSourceUrl(codePath.reviewedUrl, repository, sourcePath, revision) || !validSourceUrl(codePath.publicUrl, repository, sourcePath, revision, true)) {
          issues.push({ code: "path.invalid", path: `${path}.codePaths`, message: `Invalid reviewed source path ${sourcePath}.` });
        }
      }
      if (asArray(entry.relatedSlugs).length === 0) issues.push({ code: "relationship.required", path, message: "Every entry needs related terms." });
    }
  }

  for (const [index, entry] of entries.entries()) {
    const slug = asString(entry.slug);
    if (entry.order !== index + 1) issues.push({ code: "order.invalid", path: `entry.${slug}.order`, message: "Entry order must be contiguous." });
    for (const related of asArray(entry.relatedSlugs).map(asString)) {
      if (!slugs.has(related) || related === slug) issues.push({ code: "relationship.invalid", path: `entry.${slug}.relatedSlugs`, message: `Invalid related slug ${related}.` });
    }
  }

  walkStrings(input, (text, path) => {
    if (FORBIDDEN_PUNCTUATION.test(text)) issues.push({ code: "copy.punctuation", path, message: "Public content must use straight ASCII punctuation." });
    if (FORBIDDEN_FILLER.test(text)) issues.push({ code: "copy.filler", path, message: "Public content contains prohibited generic filler." });
  });

  return issues;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

export function defineGlossary(input: unknown): GlossaryDocument {
  const issues = validateGlossary(input);
  if (issues.length > 0) throw new Error(`Invalid glossary:\n${issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n")}`);
  return deepFreeze(input as GlossaryDocument);
}

export type GlossaryCatalog = Readonly<{
  stages: readonly GlossaryStage[];
  entries: readonly GlossaryEntry[];
  stage: (id: string) => GlossaryStage | undefined;
  stageForEntry: (slug: string) => GlossaryStage | undefined;
  entry: (slug: string) => GlossaryEntry | undefined;
  search: (text: string) => readonly GlossaryEntry[];
  navigation: (slug: string) => Readonly<{ previous?: GlossaryEntry; next?: GlossaryEntry }>;
}>;

export function createCatalog(document: GlossaryDocument): GlossaryCatalog {
  const entries = document.stages.flatMap((stage) => stage.entries);
  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  const indexBySlug = new Map(entries.map((entry, index) => [entry.slug, index]));
  const byStage = new Map(document.stages.map((stage) => [stage.id, stage]));
  const stageBySlug = new Map(document.stages.flatMap((stage) => stage.entries.map((entry) => [entry.slug, stage] as const)));
  const searchText = new Map(entries.map((entry) => [entry.slug, [entry.term, ...entry.aliases, entry.lede.text, ...entry.explanation.map((claim) => claim.text), ...entry.codePaths.map((item) => item.path)].join(" ").toLowerCase()]));
  return {
    stages: document.stages,
    entries,
    stage: (id) => byStage.get(id),
    stageForEntry: (slug) => stageBySlug.get(slug),
    entry: (slug) => bySlug.get(slug),
    search: (text) => {
      const words = text.toLowerCase().trim().split(/\s+/).filter(Boolean);
      return entries
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
      const index = indexBySlug.get(slug);
      return index === undefined ? {} : { previous: entries[index - 1], next: entries[index + 1] };
    },
  };
}

type GlossaryRoute = Readonly<{ open: false }> | Readonly<{ open: true; slug?: string; stage?: string }>;

export function parseGlossaryPath(pathname: string, search = "", catalog?: GlossaryCatalog): GlossaryRoute {
  if (pathname === "/glossary" || pathname === "/glossary/") {
    const stage = new URLSearchParams(search).get("stage") ?? undefined;
    return { open: true, ...(stage && (!catalog || catalog.stage(stage)) ? { stage } : {}) };
  }
  const match = pathname.match(/^\/glossary\/([a-z0-9-]+)\/?$/);
  return match ? { open: true, slug: match[1] } : { open: false };
}
