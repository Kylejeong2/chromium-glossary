"use client";

import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import type { GlossaryEntry } from "@/domain/glossary";
import { ConceptDiagram } from "./ConceptDiagram";

export function EntryArticle({ entry, previous, next, resolveTerm, onNavigate }: {
  entry: GlossaryEntry;
  previous?: GlossaryEntry;
  next?: GlossaryEntry;
  resolveTerm: (slug: string) => GlossaryEntry | undefined;
  onNavigate: (slug: string) => void;
}) {
  return (
    <article className="entry-article">
      <button type="button" className="back-to-index" onClick={() => onNavigate("")}><ArrowLeft size={16} />All concepts</button>
      <header className="entry-header">
        <span>{String(entry.order).padStart(2, "0")} of 50</span>
        <h1>{entry.term}</h1>
        <p>{entry.summary}</p>
      </header>
      <ConceptDiagram diagram={entry.diagram} />
      <div className="entry-grid">
        <section className="definition-section">
          <h2>How it works</h2>
          {entry.definition.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </section>
        <aside>
          <section className="reference-panel">
            <h2>Code paths</h2>
            <ul>{entry.codePaths.map((path) => (
              <li key={path}>
                <a href={`https://chromium.googlesource.com/chromium/src/+/HEAD/${path.slice(2)}`} target="_blank" rel="noreferrer">
                  <code>{path}</code><ExternalLink size={14} aria-hidden="true" />
                </a>
              </li>
            ))}</ul>
          </section>
          <section className="reference-panel">
            <h2>Primary docs</h2>
            <ul>{entry.primaryDocs.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noreferrer">{source.label}<ExternalLink size={14} /></a></li>)}</ul>
          </section>
        </aside>
      </div>
      <section className="related-section">
        <h2>Keep exploring</h2>
        <div>{entry.relatedTerms.map((slug) => {
          const related = resolveTerm(slug);
          return related ? <button type="button" key={slug} onClick={() => onNavigate(slug)}>{related.term}<ArrowRight size={14} /></button> : null;
        })}</div>
      </section>
      <nav className="entry-pagination" aria-label="Entry navigation">
        {previous ? <button type="button" onClick={() => onNavigate(previous.slug)}><ArrowLeft size={16} /><span>Previous<strong>{previous.term}</strong></span></button> : <span />}
        {next ? <button type="button" onClick={() => onNavigate(next.slug)}><span>Next<strong>{next.term}</strong></span><ArrowRight size={16} /></button> : <span />}
      </nav>
    </article>
  );
}
