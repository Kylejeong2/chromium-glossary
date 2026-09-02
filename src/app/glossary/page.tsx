import { ChromiumGlossary } from "@/components/ChromiumGlossary";
import { chromiumGlossary } from "@/data/chromium-glossary";

export default function GlossaryPage() {
  return <ChromiumGlossary document={chromiumGlossary} initialEntry={null} />;
}
