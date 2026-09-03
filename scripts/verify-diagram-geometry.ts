import { chromiumGlossary } from "../src/data/chromium-glossary";
import { auditDiagramGeometry, diagramDensity, layoutDiagram } from "../src/domain/diagram";

const widths = [328, 360, 520, 680, 840] as const;
const entries = chromiumGlossary.stages.flatMap((stage) => stage.entries);
const failures: string[] = [];

for (const entry of entries) {
  for (const width of widths) {
    try {
      const geometry = layoutDiagram(entry.diagram, { width, density: diagramDensity(width) });
      const issues = auditDiagramGeometry(entry.diagram, geometry);
      failures.push(...issues.map((issue) => `${entry.slug}\t${width}\t${issue.code}\t${issue.detail}`));
    } catch (error) {
      failures.push(`${entry.slug}\t${width}\tlayout.failure\t${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

if (failures.length > 0) {
  console.error(["slug\twidth\tissue\tdetail", ...failures].join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Verified ${entries.length * widths.length} diagram layouts across ${entries.length} glossary entries.`);
}
