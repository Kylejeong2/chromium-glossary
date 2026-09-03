"use client";

import { ArrowRight } from "lucide-react";
import type { GlossaryStage } from "@/domain/glossary";

export function JourneyIndex({ stages, activeStage, onNavigate }: { stages: readonly GlossaryStage[]; activeStage?: string; onNavigate: (slug: string) => void }) {
  const visibleStages = activeStage ? stages.filter((stage) => stage.id === activeStage) : stages;
  return (
    <div className="journey-index">
      {!activeStage && <header className="journey-hero">
        <div>
          <h1>Chromium glossary</h1>
          <p>50 concepts connect a URL to the processes, policies, and rendering work that produce a page. Follow the journey or open the subsystem you need.</p>
        </div>
      </header>}
      <div className="journey-stages">
        {visibleStages.map((stage) => (
          <section className="journey-stage" key={stage.id}>
            <header>
              <span>{String(stages.findIndex((item) => item.id === stage.id) + 1).padStart(2, "0")}</span>
              <div><h2>{stage.title}</h2><p>{stage.description}</p></div>
            </header>
            <ol start={stage.entries[0].order}>
              {stage.entries.map((entry) => (
                <li key={entry.slug}>
                  <button type="button" onClick={() => onNavigate(entry.slug)}>
                    <span>{String(entry.order).padStart(2, "0")}</span>
                    <strong>{entry.term}</strong>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <footer className="glossary-footer">
        <p>Created independently by Browserbase for developers learning browser internals. Not official Chromium documentation.</p>
        <p>Sources reviewed September 3, 2026.</p>
      </footer>
    </div>
  );
}
