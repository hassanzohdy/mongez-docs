/**
 * Generate `public/llms-full.txt` by concatenating every package's
 * `llms-full.txt`. The output is served at https://mongez.js.org/llms-full.txt
 * — one fetch wins for AI agents that want the entire ecosystem.
 *
 * Per-package `llms-full.txt` URLs (e.g. `/atom/llms-full.txt`) are also
 * served alongside, but they're not auto-discovered by AI crawlers; they
 * exist only because the ecosystem-level `llms.txt` references them.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Use fileURLToPath rather than new URL(...).pathname — on Windows the
// latter prepends a slash (`/D:/...`) which breaks path.resolve.
const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(HERE, "..");
const WORKSPACE_ROOT = resolve(DOCS_ROOT, "..");

const PACKAGES: Array<{ name: string; pkg: string }> = [
  // Foundations
  { name: "@mongez/events",             pkg: "events" },
  { name: "@mongez/reinforcements",     pkg: "reinforcements" },
  { name: "@mongez/supportive-is",      pkg: "supportive-is" },
  // State family
  { name: "@mongez/atom",               pkg: "atom" },
  { name: "@mongez/react-atom",         pkg: "react-atom" },
  { name: "@mongez/atomic-query",       pkg: "atomic-query" },
  // Utility / infrastructure
  { name: "@mongez/collection",         pkg: "collection" },
  { name: "@mongez/cache",              pkg: "cache" },
  { name: "@mongez/config",             pkg: "config" },
  { name: "@mongez/dotenv",             pkg: "dotenv" },
  { name: "@mongez/encryption",         pkg: "encryption" },
  { name: "@mongez/concat-route",       pkg: "concat-route" },
  { name: "@mongez/query-string",       pkg: "query-string" },
  { name: "@mongez/dom",                pkg: "dom" },
  { name: "@mongez/localization",       pkg: "localization" },
  // React adapters
  { name: "@mongez/react-localization", pkg: "react-localization" },
  { name: "@mongez/react-router",       pkg: "react-router" },
  { name: "@mongez/react-helmet",       pkg: "react-helmet" },
  { name: "@mongez/react-form",         pkg: "react-form" },
  { name: "@mongez/user",               pkg: "user" },
  // Build tooling
  { name: "@mongez/vite",               pkg: "vite" },
];

async function main() {
  const banner = `# Mongez ecosystem — full reference

> Combined \`llms-full.txt\` for every package in the @mongez/* family.
> Fetch this when you want the entire surface in one shot. For focused
> per-package content, see each package's \`/llms-full.txt\` at
> \`https://mongez.js.org/<package>/llms-full.txt\`.

Generated: ${new Date().toISOString()}

`;

  const parts: string[] = [];
  for (const { name, pkg } of PACKAGES) {
    const path = resolve(WORKSPACE_ROOT, pkg, "llms-full.txt");
    if (!existsSync(path)) {
      console.warn(`[llms-full] ${name} has no llms-full.txt — skipped.`);
      continue;
    }
    const content = await readFile(path, "utf8");
    parts.push(`\n\n---\n\n# ${name}\n\n${content}`);
    console.log(`[llms-full] ${name}: ${content.length} chars`);
  }

  const out = resolve(DOCS_ROOT, "public", "llms-full.txt");
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, banner + parts.join(""), "utf8");
  console.log(`[llms-full] Wrote ${out}`);
}

main().catch(err => {
  console.error("[llms-full] failed:", err);
  process.exit(1);
});
