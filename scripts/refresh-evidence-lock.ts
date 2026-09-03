import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import rawDocument from "../src/data/chromium-glossary.json";
import { codePathLockKey, type EvidenceLock, type LockedCodePath, type LockedSource } from "../src/domain/evidence-lock";
import { defineGlossary, repositoryRelativePath, reviewedSourceUrl, type EvidenceLocator, type RepositoryId } from "../src/domain/glossary";

const document = defineGlossary(rawDocument);
const entries = document.stages.flatMap((stage) => stage.entries);
const outputPath = resolve("evidence/chromium-evidence-lock.json");
const verifiedAt = process.env.EVIDENCE_VERIFIED_AT ?? new Date().toISOString();
const repositoryNames: Record<RepositoryId, string> = { chromium: "chromium/chromium", v8: "v8/v8" };

function compareAscii(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function checkedFetch(url: string): Promise<Response> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(url, { headers: { "User-Agent": "chromium-glossary-evidence-review/1.0" } });
    if (response.ok) return response;
    if (response.status !== 429 && response.status < 500) throw new Error(`Evidence refresh failed with HTTP ${response.status} for ${url}`);
    const retryAfter = Number(response.headers.get("retry-after"));
    await new Promise((resolveDelay) => setTimeout(resolveDelay, Number.isFinite(retryAfter) ? retryAfter * 1000 : 500 * 2 ** attempt));
  }
  throw new Error(`Evidence refresh remained rate-limited for ${url}`);
}

function renderHeading(value: string): string {
  return value
    .replace(/<a\b[^>]*><\/a>/gi, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[`*_~]/g, "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

function markdownHeadings(content: string): readonly string[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const headings: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].replace(/^\s*<a\b[^>]*><\/a>\s*/i, "");
    const atx = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/);
    if (atx) headings.push(renderHeading(atx[1]));
    if (index > 0 && /^\s*(?:=+|-+)\s*$/.test(line) && lines[index - 1].trim()) headings.push(renderHeading(lines[index - 1]));
  }
  return headings;
}

function stripCppTrivia(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/"(?:\\.|[^"\\])*"/g, " ")
    .replace(/'(?:\\.|[^'\\])*'/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function locatorExists(content: string, locator: EvidenceLocator): boolean {
  if (locator.kind === "heading") return markdownHeadings(content).filter((heading) => heading === renderHeading(locator.value)).length === 1;
  if (locator.kind === "line-range") {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    return locator.start >= 1 && locator.end >= locator.start && locator.end <= lines.length && lines.slice(locator.start - 1, locator.end).some((line) => line.trim());
  }
  const code = stripCppTrivia(content);
  const parts = locator.value.split("::");
  const leaf = parts.at(-1) ?? "";
  const declaresLeaf = new RegExp(`\\b(?:class|struct|enum(?:\\s+class)?|union)\\b[^;{]*\\b${escapeRegExp(leaf)}\\b|\\b${escapeRegExp(leaf)}::`).test(code);
  const namespacesExist = parts.slice(0, -1).every((namespace) => new RegExp(`\\bnamespace\\s+(?:[A-Za-z_][A-Za-z0-9_]*::)*${escapeRegExp(namespace)}\\b`).test(code));
  return declaresLeaf && namespacesExist;
}

async function mapWithConcurrency<T>(values: readonly T[], concurrency: number, visit: (value: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (next < values.length) {
      const index = next;
      next += 1;
      await visit(values[index]);
    }
  }));
}

async function verifyCodePath(repository: RepositoryId, revision: string, sourcePath: string): Promise<void> {
  const relativePath = repositoryRelativePath(repository, sourcePath);
  const kind = relativePath && relativePath.split("/").at(-1)?.includes(".") ? "blob" : "tree";
  const suffix = relativePath ? `/${relativePath}` : "";
  try {
    await checkedFetch(`https://github.com/${repositoryNames[repository]}/${kind}/${revision}${suffix}`);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("HTTP 404")) throw error;
    await checkedFetch(reviewedSourceUrl(repository, revision, sourcePath));
  }
}

async function main(): Promise<void> {
  if (Number.isNaN(Date.parse(verifiedAt)) || !verifiedAt.endsWith("Z")) throw new Error("EVIDENCE_VERIFIED_AT must be an ISO UTC instant.");
  const revisions = new Map<RepositoryId, string>();
  for (const entry of entries) {
    for (const item of [...entry.sources, ...entry.codePaths]) {
      const existing = revisions.get(item.repository);
      if (existing && existing !== item.reviewedRevision) throw new Error(`Repository ${item.repository} uses multiple reviewed revisions.`);
      revisions.set(item.repository, item.reviewedRevision);
    }
  }

  const sources: LockedSource[] = [];
  const contentCache = new Map<string, string>();
  for (const entry of entries) {
    for (const source of entry.sources) {
      const relativePath = repositoryRelativePath(source.repository, source.path);
      if (!relativePath) throw new Error(`Evidence sources must resolve to files: ${source.path}`);
      const rawUrl = `https://raw.githubusercontent.com/${repositoryNames[source.repository]}/${source.reviewedRevision}/${relativePath}`;
      const cachedContent = contentCache.get(rawUrl);
      const content: string = cachedContent === undefined ? await checkedFetch(rawUrl).then((response) => response.text()) : cachedContent;
      contentCache.set(rawUrl, content);
      if (!locatorExists(content, source.locator)) throw new Error(`Locator does not resolve exactly once in ${source.path}: ${JSON.stringify(source.locator)}`);
      sources.push({
        sourceId: source.id,
        entrySlug: entry.slug,
        repository: source.repository,
        path: source.path,
        reviewedRevision: source.reviewedRevision,
        reviewedUrl: source.reviewedUrl,
        locator: source.locator,
        verifiedAt,
        status: "verified",
        httpStatus: 200,
        contentSha256: sha256(content),
      });
    }
  }

  const uniqueCodePaths = new Map<string, { repository: RepositoryId; revision: string; path: string }>();
  for (const entry of entries) {
    for (const codePath of entry.codePaths) {
      const key = `${codePath.repository}|${codePath.reviewedRevision}|${codePath.path}`;
      uniqueCodePaths.set(key, { repository: codePath.repository, revision: codePath.reviewedRevision, path: codePath.path });
    }
  }
  await mapWithConcurrency([...uniqueCodePaths.values()], 6, ({ repository, revision, path }) => verifyCodePath(repository, revision, path));

  const codePaths: LockedCodePath[] = entries.flatMap((entry) => entry.codePaths.map((codePath) => {
    return {
      key: codePathLockKey(entry.slug, codePath),
      entrySlug: entry.slug,
      repository: codePath.repository,
      path: codePath.path,
      reviewedRevision: codePath.reviewedRevision,
      reviewedUrl: codePath.reviewedUrl,
      verifiedAt,
      status: "exists-at-reviewed-revision" as const,
      httpStatus: 200 as const,
    };
  }));

  const lock: EvidenceLock = {
    schemaVersion: 1,
    generatedAt: verifiedAt,
    sources: sources.sort((left, right) => compareAscii(left.sourceId, right.sourceId)),
    codePaths: codePaths.sort((left, right) => compareAscii(left.key, right.key)),
  };
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(lock, null, 2)}\n`, "utf8");
  process.stdout.write(`${outputPath}\n${sources.length} sources verified\n${codePaths.length} code paths verified\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
