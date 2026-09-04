"use client";

import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import type { GlossaryEntry } from "@/domain/glossary";
import { ConceptDiagram } from "./ConceptDiagram";

function locatorLabel(locator: GlossaryEntry["sources"][number]["locator"]): string {
  if (locator.kind === "line-range") return `Lines ${locator.start}-${locator.end}`;
  return `${locator.kind === "heading" ? "Heading" : "Symbol"}: ${locator.value}`;
}

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
        <p>{entry.lede.text}</p>
      </header>
      <section className="definition-section">
        <div className="entry-prose-section">
          <h2>How it works</h2>
          <div>{entry.explanation.map((claim) => <p key={claim.id}>{claim.text}</p>)}</div>
        </div>
        {entry.details.map((section) => <section className="entry-prose-section" key={section.id}>
          <h2>{section.title}</h2>
          <div>{section.claims.map((claim) => <p key={claim.id}>{claim.text}</p>)}</div>
        </section>)}
      </section>
      <ConceptDiagram diagram={entry.diagram} />
      <div className="entry-references">
        <section className="reference-panel">
          <h2>Code paths</h2>
          <ul>{entry.codePaths.map((codePath) => (
            <li key={`${codePath.repository}:${codePath.path}`}>
              <a href={codePath.publicUrl} target="_blank" rel="noreferrer">
                <code>{codePath.path}</code><ExternalLink size={14} aria-hidden="true" />
              </a>
            </li>
          ))}</ul>
        </section>
        <section className="reference-panel">
          <h2>Reviewed evidence</h2>
          <ul>{entry.sources.map((source) => <li key={source.id}>
            <a href={source.reviewedUrl} target="_blank" rel="noreferrer">
              <span><strong>{source.title}</strong><small>{locatorLabel(source.locator)} at {source.reviewedRevision.slice(0, 12)}</small></span>
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          </li>)}</ul>
        </section>
      </div>
      <section className="related-section">
        <h2>Keep exploring</h2>
        <div>{entry.relatedSlugs.map((slug) => {
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
