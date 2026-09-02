import type { ReactNode } from "react";
import { GlossaryDesktopRoute } from "@/components/GlossaryDesktopRoute";
import { chromiumGlossary } from "@/data/chromium-glossary";

export default function GlossaryLayout({ children }: { children: ReactNode }) {
  return <><GlossaryDesktopRoute document={chromiumGlossary} />{children}</>;
}
