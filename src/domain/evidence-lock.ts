import type { CodeReference, EvidenceLocator, EvidenceSource, GlossaryDocument, GlossaryIssue, RepositoryId } from "./glossary";

export type LockedSource = Readonly<{
  sourceId: string;
  entrySlug: string;
  repository: RepositoryId;
  path: string;
  reviewedRevision: string;
  reviewedUrl: string;
  locator: EvidenceLocator;
  verifiedAt: string;
  status: "verified";
  httpStatus: 200;
  contentSha256: string;
}>;

export type LockedCodePath = Readonly<{
  key: string;
  entrySlug: string;
  repository: RepositoryId;
  path: string;
  reviewedRevision: string;
  reviewedUrl: string;
  verifiedAt: string;
  status: "exists-at-reviewed-revision";
  httpStatus: 200;
}>;

export type EvidenceLock = Readonly<{
  schemaVersion: 1;
  generatedAt: string;
  sources: readonly LockedSource[];
  codePaths: readonly LockedCodePath[];
}>;

const SHA256 = /^[a-f0-9]{64}$/;
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sameLocator(actual: unknown, expected: EvidenceLocator): boolean {
  if (!isRecord(actual) || actual.kind !== expected.kind) return false;
  if (expected.kind === "line-range") return actual.start === expected.start && actual.end === expected.end;
  return actual.value === expected.value;
}

export function codePathLockKey(entrySlug: string, codePath: Pick<CodeReference, "repository" | "path">): string {
  return `${entrySlug}|${codePath.repository}|${codePath.path}`;
}

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sourceBinding(source: EvidenceSource, entrySlug: string) {
  return {
    sourceId: source.id,
    entrySlug,
    repository: source.repository,
    path: source.path,
    reviewedRevision: source.reviewedRevision,
    reviewedUrl: source.reviewedUrl,
    locator: source.locator,
  };
}

function codePathBinding(codePath: CodeReference, entrySlug: string) {
  return {
    key: codePathLockKey(entrySlug, codePath),
    entrySlug,
    repository: codePath.repository,
    path: codePath.path,
    reviewedRevision: codePath.reviewedRevision,
    reviewedUrl: codePath.reviewedUrl,
  };
}

export function validateEvidenceLock(document: GlossaryDocument, input: unknown): GlossaryIssue[] {
  const issues: GlossaryIssue[] = [];
  const issue = (code: string, path: string, message: string) => issues.push({ code, path, message });
  if (!isRecord(input)) return [{ code: "evidence-lock.type", path: "evidence-lock", message: "Evidence lock must be an object." }];
  if (input.schemaVersion !== 1) issue("evidence-lock.schema", "evidence-lock.schemaVersion", "Evidence lock schema version must be 1.");
  const generatedAt = asString(input.generatedAt);
  if (!ISO_INSTANT.test(generatedAt) || Number.isNaN(Date.parse(generatedAt))) issue("evidence-lock.timestamp", "evidence-lock.generatedAt", "Evidence lock needs an ISO verification timestamp.");

  const entries = document.stages.flatMap((stage) => stage.entries);
  const expectedSources = entries.flatMap((entry) => entry.sources.map((source) => sourceBinding(source, entry.slug))).sort((left, right) => compareAscii(left.sourceId, right.sourceId));
  const expectedCodePaths = entries.flatMap((entry) => entry.codePaths.map((codePath) => codePathBinding(codePath, entry.slug))).sort((left, right) => compareAscii(left.key, right.key));
  const sourceRecords = Array.isArray(input.sources) ? input.sources.filter(isRecord) : [];
  const codePathRecords = Array.isArray(input.codePaths) ? input.codePaths.filter(isRecord) : [];

  if (sourceRecords.length !== expectedSources.length) issue("evidence-lock.source-count", "evidence-lock.sources", `Expected ${expectedSources.length} locked sources.`);
  if (codePathRecords.length !== expectedCodePaths.length) issue("evidence-lock.path-count", "evidence-lock.codePaths", `Expected ${expectedCodePaths.length} locked code paths.`);
  const sourceIds = sourceRecords.map((record) => asString(record.sourceId));
  const codeKeys = codePathRecords.map((record) => asString(record.key));
  if (new Set(sourceIds).size !== sourceIds.length) issue("evidence-lock.source-duplicate", "evidence-lock.sources", "Locked source IDs must be unique.");
  if (new Set(codeKeys).size !== codeKeys.length) issue("evidence-lock.path-duplicate", "evidence-lock.codePaths", "Locked code-path keys must be unique.");
  if (JSON.stringify(sourceIds) !== JSON.stringify([...sourceIds].sort(compareAscii))) issue("evidence-lock.order", "evidence-lock.sources", "Locked sources must use stable source-ID order.");
  if (JSON.stringify(codeKeys) !== JSON.stringify([...codeKeys].sort(compareAscii))) issue("evidence-lock.order", "evidence-lock.codePaths", "Locked code paths must use stable key order.");

  const lockedSources = new Map(sourceRecords.map((record) => [asString(record.sourceId), record]));
  for (const expected of expectedSources) {
    const locked = lockedSources.get(expected.sourceId);
    const path = `evidence-lock.sources.${expected.sourceId}`;
    if (!locked) {
      issue("evidence-lock.source-missing", path, "Every evidence source needs a recorded immutable review.");
      continue;
    }
    if (locked.entrySlug !== expected.entrySlug || locked.repository !== expected.repository || locked.path !== expected.path || locked.reviewedRevision !== expected.reviewedRevision || locked.reviewedUrl !== expected.reviewedUrl || !sameLocator(locked.locator, expected.locator)) {
      issue("evidence-lock.source-mismatch", path, "Locked source identity or locator does not match the glossary authority.");
    }
    if (locked.status !== "verified" || locked.httpStatus !== 200 || locked.verifiedAt !== generatedAt || !SHA256.test(asString(locked.contentSha256))) {
      issue("evidence-lock.source-unverified", path, "Locked sources must record a successful immutable fetch and content hash.");
    }
  }
  for (const sourceId of sourceIds) {
    if (!expectedSources.some((source) => source.sourceId === sourceId)) issue("evidence-lock.source-extra", `evidence-lock.sources.${sourceId}`, "Evidence lock contains an unknown source ID.");
  }

  const lockedCodePaths = new Map(codePathRecords.map((record) => [asString(record.key), record]));
  for (const expected of expectedCodePaths) {
    const locked = lockedCodePaths.get(expected.key);
    const path = `evidence-lock.codePaths.${expected.key}`;
    if (!locked) {
      issue("evidence-lock.path-missing", path, "Every code path needs a recorded immutable-tree check.");
      continue;
    }
    if (locked.entrySlug !== expected.entrySlug || locked.repository !== expected.repository || locked.path !== expected.path || locked.reviewedRevision !== expected.reviewedRevision || locked.reviewedUrl !== expected.reviewedUrl) {
      issue("evidence-lock.path-mismatch", path, "Locked code-path identity does not match the glossary authority.");
    }
    if (locked.status !== "exists-at-reviewed-revision" || locked.httpStatus !== 200 || locked.verifiedAt !== generatedAt) {
      issue("evidence-lock.path-unverified", path, "Locked code paths cannot use missing, inconclusive, or rate-limited placeholders.");
    }
  }
  for (const key of codeKeys) {
    if (!expectedCodePaths.some((codePath) => codePath.key === key)) issue("evidence-lock.path-extra", `evidence-lock.codePaths.${key}`, "Evidence lock contains an unknown code path.");
  }

  return issues;
}
