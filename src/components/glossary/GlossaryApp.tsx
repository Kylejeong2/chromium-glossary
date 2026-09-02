"use client";

import { BookOpen, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createCatalog, type GlossaryDocument } from "@/domain/glossary";
import { EntryArticle } from "./EntryArticle";
import { JourneyIndex } from "./JourneyIndex";
import { JourneyRail } from "./JourneyRail";

export function GlossaryApp({ document, selectedSlug, onNavigate }: { document: GlossaryDocument; selectedSlug?: string; onNavigate: (slug: string) => void }) {
  const catalog = useMemo(() => createCatalog(document), [document]);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<string>();
  const selected = selectedSlug ? catalog.entry(selectedSlug) : undefined;
  const results = query.trim() ? catalog.query({ text: query, stage }) : [];
  const navigation = selected ? catalog.navigation(selected.slug) : {};
  return <div className="glossary-app">
    <header className="glossary-toolbar"><button type="button" className="glossary-home" onClick={() => onNavigate("")}><BookOpen />Chromium Glossary</button><div className="glossary-search"><Search aria-hidden="true" /><label htmlFor="glossary-search" className="sr-only">Search all 50 concepts</label><input id="glossary-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search concepts or code paths" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X /></button>}</div><a href="https://chromium.googlesource.com/chromium/src/+/HEAD/docs/README.md" target="_blank" rel="noreferrer">Docs ↗</a></header>
    <div className="glossary-layout"><JourneyRail stages={catalog.stages} activeStage={stage} onSelect={(value) => { setStage(value); onNavigate(""); }} /><div className="browser-content" data-testid="browser-content">{query.trim() ? <section className="search-results" aria-label="Search results"><header><h1>Search results</h1><p>{results.length} concepts match “{query.trim()}”.</p></header>{results.length ? <ol>{results.map((entry) => <li key={entry.slug}><button type="button" onClick={() => { setQuery(""); onNavigate(entry.slug); }}><span>{String(entry.order).padStart(2, "0")}</span><div><strong>{entry.term}</strong><p>{entry.summary}</p></div></button></li>)}</ol> : <div className="empty-results"><h2>No concepts found</h2><p>Try renderer, network, Blink, V8, or sandbox.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></div>}</section> : selected ? <EntryArticle entry={selected} previous={navigation.previous} next={navigation.next} resolveTerm={catalog.entry} onNavigate={onNavigate} /> : <JourneyIndex stages={catalog.stages} activeStage={stage} onNavigate={onNavigate} />}</div></div>
  </div>;
}
