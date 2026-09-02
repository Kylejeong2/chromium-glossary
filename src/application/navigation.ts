export type HistoryJournal = Readonly<{ entries: readonly string[]; index: number }>;
export const createHistoryJournal = (pathname: string): HistoryJournal => ({ entries: [pathname], index: 0 });
export function observePath(journal: HistoryJournal, pathname: string): HistoryJournal { return journal.entries[journal.index] === pathname ? journal : { entries: [...journal.entries.slice(0, journal.index + 1), pathname], index: journal.index + 1 }; }
export function reconcileObservedPath(journal: HistoryJournal, pathname: string): HistoryJournal {
  if (journal.entries[journal.index] === pathname) return journal;
  if (journal.entries[journal.index - 1] === pathname) return { ...journal, index: journal.index - 1 };
  if (journal.entries[journal.index + 1] === pathname) return { ...journal, index: journal.index + 1 };
  return observePath(journal, pathname);
}
export function historyBack(journal: HistoryJournal) { return journal.index <= 0 ? { journal } : { journal: { ...journal, index: journal.index - 1 }, pathname: journal.entries[journal.index - 1] }; }
export function historyForward(journal: HistoryJournal) { return journal.index >= journal.entries.length - 1 ? { journal } : { journal: { ...journal, index: journal.index + 1 }, pathname: journal.entries[journal.index + 1] }; }
export function parseLocalAddress(value: string, origin: string, validSlugs: ReadonlySet<string>): string | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  if (raw === "chromium://glossary" || raw === "/glossary") return "/glossary";
  const shorthand = raw.replace(/^chromium:\/\/glossary\/?/, "");
  if (shorthand && validSlugs.has(shorthand)) return `/glossary/${shorthand}`;
  try { const url = new URL(raw, origin); if (url.origin !== origin) return undefined; if (url.pathname === "/glossary") return url.pathname; const match = url.pathname.match(/^\/glossary\/([^/]+)$/); return match && validSlugs.has(match[1]) ? url.pathname : undefined; } catch { return undefined; }
}
