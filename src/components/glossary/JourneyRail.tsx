"use client";

import type { GlossaryStage } from "@/domain/glossary";

export function JourneyRail({ stages, activeStage, onSelect }: { stages: readonly GlossaryStage[]; activeStage?: string; onSelect: (stage?: string) => void }) {
  return (
    <nav className="journey-rail" aria-label="Learning stages">
      <button type="button" className={!activeStage ? "is-active" : ""} onClick={() => onSelect(undefined)}>All concepts</button>
      {stages.map((stage, index) => (
        <button type="button" className={activeStage === stage.id ? "is-active" : ""} onClick={() => onSelect(stage.id)} key={stage.id}>
          <span>{String(index + 1).padStart(2, "0")}</span>{stage.title}
        </button>
      ))}
    </nav>
  );
}
