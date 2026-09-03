"use client";

import { Activity, BookOpen, Braces, Boxes, Compass, Route, ScanLine, ShieldCheck, type LucideIcon } from "lucide-react";
import type { GlossaryStage } from "@/domain/glossary";

const stageIcons: readonly LucideIcon[] = [Compass, Boxes, Route, ScanLine, Braces, ShieldCheck, Activity];

export function JourneyRail({ stages, activeStage, open, onSelect }: { stages: readonly GlossaryStage[]; activeStage?: string; open: boolean; onSelect: (stage?: string) => void }) {
  return (
    <nav className={`journey-rail ${open ? "is-open" : ""}`} aria-label="Chromium concepts">
      <button type="button" className={!activeStage ? "is-active" : ""} aria-current={!activeStage ? "page" : undefined} onClick={() => onSelect(undefined)}><BookOpen aria-hidden="true" /><span>All concepts</span></button>
      {stages.map((stage, index) => {
        const Icon = stageIcons[index];
        return <section key={stage.id}>
          <button type="button" className={`journey-rail__stage ${activeStage === stage.id ? "is-active" : ""}`} aria-label={`${stage.title}, ${stage.entries.length} concepts`} aria-current={activeStage === stage.id ? "step" : undefined} onClick={() => onSelect(stage.id)}>
            <Icon aria-hidden="true" /><span>{stage.title}</span><small>{stage.entries.length}</small>
          </button>
        </section>;
      })}
    </nav>
  );
}
