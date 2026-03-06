import { search } from "@inquirer/prompts";
import * as simpleIcons from "simple-icons";
import { SplitPath } from "@/index";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const PALETTE = [
  "#e6194b",
  "#3cb44b",
  "#4363d8",
  "#f58231",
  "#911eb4",
  "#42d4f4",
  "#f032e6",
  "#bfef45",
  "#fabed4",
  "#469990",
  "#dcbeff",
  "#9a6324",
  "#800000",
  "#aaffc3",
  "#808000",
  "#000075",
];

interface SimpleIcon {
  title: string;
  slug: string;
  hex: string;
  path: string;
  source: string;
}

const allIcons: SimpleIcon[] = Object.values(simpleIcons).filter(
  (v): v is SimpleIcon => typeof v === "object" && v !== null && "path" in v,
);

function searchIcons(
  term: string | undefined,
): Array<{ name: string; value: SimpleIcon; description: string }> {
  const query = (term ?? "").toLowerCase().trim();
  const matched =
    query.length === 0
      ? allIcons.slice(0, 20)
      : allIcons.filter(
          (icon) =>
            icon.title.toLowerCase().includes(query) || icon.slug.toLowerCase().includes(query),
        );

  return matched.slice(0, 30).map((icon) => ({
    name: `${icon.title}  (#${icon.hex})`,
    value: icon,
    description: icon.source,
  }));
}

async function main() {
  console.log("\n🎨 SVG Path Areas Splitter — Icon Colorizer\n");

  const icon = await search<SimpleIcon>({
    message: "Search for a simple-icon:",
    source: async (term) => searchIcons(term),
    pageSize: 15,
  });

  console.log(`\n✓ Selected: ${icon.title} (#${icon.hex})`);

  const regions = SplitPath(icon.path);
  console.log(`✓ Split into ${regions.length} region(s)\n`);

  const paths = regions
    .map((d, i) => `  <path d="${d}" fill="${PALETTE[i % PALETTE.length]}"/>`)
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="256" height="256">\n${paths}\n</svg>\n`;

  const outDir = resolve(import.meta.dirname!, "..", "output");
  mkdirSync(outDir, { recursive: true });

  const outPath = resolve(outDir, `${icon.slug}-colorized.svg`);
  writeFileSync(outPath, svg, "utf-8");

  regions.forEach((region, i) => {
    const color = PALETTE[i % PALETTE.length];
    const moveCount = (region.match(/[Mm]/g) || []).length;
    console.log(`  Region ${i}: ${color}  (${moveCount} subpath${moveCount !== 1 ? "s" : ""})`);
  });

  console.log(`\n✓ Saved to ${outPath}\n`);
}

main().catch((err) => {
  if (err instanceof Error && err.name === "ExitPromptError") {
    console.log("\nBye!");
    process.exit(0);
  }
  console.error(err);
  process.exit(1);
});
