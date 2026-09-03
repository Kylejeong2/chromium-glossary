"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { parseGlossaryPath, type GlossaryDocument } from "@/domain/glossary";
import { ChromiumGlossary } from "./ChromiumGlossary";

export function GlossaryDesktopRoute({ document }: { document: GlossaryDocument }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const route = parseGlossaryPath(pathname, searchParams.toString());
  const requestedStage = route.open ? route.stage : undefined;
  const initialStage = document.stages.some((stage) => stage.id === requestedStage) ? requestedStage : undefined;
  return <ChromiumGlossary document={document} initialEntry={route.open ? route.slug ?? null : undefined} initialStage={initialStage} />;
}
