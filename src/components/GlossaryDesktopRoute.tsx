"use client";

import { usePathname } from "next/navigation";
import type { GlossaryDocument } from "@/domain/glossary";
import { ChromiumGlossary } from "./ChromiumGlossary";

export function GlossaryDesktopRoute({ document }: { document: GlossaryDocument }) {
  const pathname = usePathname();
  const match = pathname.match(/^\/glossary\/([^/]+)$/);
  return <ChromiumGlossary document={document} initialEntry={match?.[1] ?? null} />;
}
