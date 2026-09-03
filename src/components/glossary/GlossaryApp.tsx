"use client";

import Image from "next/image";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GlossaryCatalog } from "@/domain/glossary";
import { EntryArticle } from "./EntryArticle";
import { JourneyIndex } from "./JourneyIndex";
import { JourneyRail } from "./JourneyRail";

export function GlossaryApp({ catalog, selectedSlug, selectedStage, onNavigate, onSelectStage, onTitleChange }: { catalog: GlossaryCatalog; selectedSlug?: string; selectedStage?: string; onNavigate: (slug: string) => void; onSelectStage: (stage?: string) => void; onTitleChange: (title: string) => void }) {
  const [query, setQuery] = useState("");
  const [navigationOpen, setNavigationOpen] = useState(false);
  const search = useRef<HTMLInputElement>(null);
  const selected = selectedSlug ? catalog.entry(selectedSlug) : undefined;
  const results = useMemo(() => query.trim() ? catalog.search(query) : [], [catalog, query]);
  const navigation = useMemo(() => selected ? catalog.navigation(selected.slug) : {}, [catalog, selected]);
  const activeStage = selected ? catalog.stageForEntry(selected.slug)?.id : selectedStage;
  const view = query.trim() ? "search" : selected ? "entry" : "index";
  const isMainIndex = view === "index" && !selectedStage;
  const selectedStageTitle = selectedStage ? catalog.stages.find((stage) => stage.id === selectedStage)?.title : undefined;
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);
  useEffect(() => onTitleChange(view === "search" ? "Search results" : selected?.term ?? selectedStageTitle ?? "Chromium glossary"), [onTitleChange, selected?.term, selectedStageTitle, view]);
  return <div className="glossary-app" data-view={view}>
    <header className="glossary-toolbar"><button type="button" className="glossary-navigation-toggle" aria-label="Open concept navigation" aria-expanded={navigationOpen} onClick={() => setNavigationOpen((open) => !open)}><Menu /></button><button type="button" className={`glossary-home ${isMainIndex ? "has-label" : "is-icon-only"}`} aria-label={isMainIndex ? "Chromium glossary" : "Chromium glossary home"} onClick={() => onNavigate("")}><Image src="/assets/icons/chromium.svg" alt="" width={22} height={22} />{isMainIndex ? <span className="glossary-home__label">Chromium glossary</span> : <span className="sr-only">Chromium glossary home</span>}</button><div className="glossary-search"><Search aria-hidden="true" /><label htmlFor="glossary-search" className="sr-only">Search all 50 concepts</label><input ref={search} id="glossary-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search all 50 concepts" />{query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X /></button> : <kbd>⌘ K</kbd>}</div><a href="https://chromium.googlesource.com/chromium/src/+/HEAD/docs/README.md" target="_blank" rel="noreferrer">Docs ↗</a></header>
    <div className="glossary-layout"><JourneyRail stages={catalog.stages} activeStage={activeStage} open={navigationOpen} onSelect={(value) => { onSelectStage(value); setNavigationOpen(false); }} /><div className="browser-content" data-testid="browser-content">{query.trim() ? <section className="search-results" aria-label="Search results"><header><h1>Search results</h1><p>{results.length} concepts match your search for {query.trim()}.</p></header>{results.length ? <ol>{results.map((entry) => <li key={entry.slug}><button type="button" onClick={() => { setQuery(""); onNavigate(entry.slug); }}><span>{String(entry.order).padStart(2, "0")}</span><div><strong>{entry.term}</strong><p>{entry.lede.text}</p></div></button></li>)}</ol> : <div className="empty-results"><h2>No concepts found</h2><p>Try renderer, network, Blink, V8, or sandbox.</p><button type="button" onClick={() => setQuery("")}>Clear search</button></div>}</section> : selected ? <EntryArticle entry={selected} previous={navigation.previous} next={navigation.next} resolveTerm={catalog.entry} onNavigate={onNavigate} /> : <JourneyIndex stages={catalog.stages} activeStage={selectedStage} onNavigate={onNavigate} />}</div></div>
  </div>;
}
