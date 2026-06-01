/**
 * Generate the ecosystem's llms.txt surfaces for https://mongez.js.org:
 *
 *  1. `public/<pkg>/llms.txt` + `public/<pkg>/llms-full.txt` — per-package
 *     files copied verbatim from each source package, served at
 *     `/<pkg>/llms.txt` and `/<pkg>/llms-full.txt`.
 *  2. `public/llms-full.txt` — every package's `llms-full.txt` concatenated.
 *     One fetch wins for AI agents that want the entire ecosystem.
 *  3. `public/llms.txt` — the ecosystem index, generated from the package
 *     list with each one-line blurb pulled from that package's own `llms.txt`.
 *     Generated (not hand-written) so it never drifts as packages are added.
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
const PUBLIC = resolve(DOCS_ROOT, "public");
const SITE = "https://mongez.js.org";

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
  // Networking
  { name: "@mongez/http",               pkg: "http" },
  // Developer tooling
  { name: "@mongez/vite",               pkg: "vite" },
  { name: "@mongez/pkgist",             pkg: "pkgist" },
  { name: "@mongez/copper",             pkg: "copper" },
  { name: "@mongez/agent-kit",          pkg: "agent-kit" },
];

/**
 * Pull a one-line blurb from a package's llms.txt. Prefers the first `>`
 * blockquote line (the convention); falls back to the first non-empty,
 * non-heading line for packages that use a plain paragraph (e.g. http).
 */
function extractBlurb(llmsTxt: string): string {
  const lines = llmsTxt.split(/\r?\n/);
  const quote = lines.find((l) => l.trimStart().startsWith(">"));
  if (quote) return quote.replace(/^\s*>\s?/, "").trim();
  const para = lines.find((l) => l.trim() && !l.trimStart().startsWith("#"));
  return para ? para.trim() : "";
}

async function main() {
  const blurbs = new Map<string, string>();
  const present: Array<{ name: string; pkg: string }> = [];
  const fullParts: string[] = [];

  // 1. Per-package files + collect blurbs + concat full reference.
  for (const entry of PACKAGES) {
    const { name, pkg } = entry;
    const srcTxt = resolve(WORKSPACE_ROOT, pkg, "llms.txt");
    const srcFull = resolve(WORKSPACE_ROOT, pkg, "llms-full.txt");
    const destDir = resolve(PUBLIC, pkg);
    await mkdir(destDir, { recursive: true });

    if (existsSync(srcTxt)) {
      const txt = await readFile(srcTxt, "utf8");
      await writeFile(resolve(destDir, "llms.txt"), txt, "utf8");
      blurbs.set(pkg, extractBlurb(txt));
      present.push(entry);
    } else {
      console.warn(`[llms] ${name} has no llms.txt — omitted from index.`);
    }

    if (existsSync(srcFull)) {
      const full = await readFile(srcFull, "utf8");
      await writeFile(resolve(destDir, "llms-full.txt"), full, "utf8");
      fullParts.push(`\n\n---\n\n# ${name}\n\n${full}`);
      console.log(`[llms-full] ${name}: ${full.length} chars`);
    } else {
      console.warn(`[llms-full] ${name} has no llms-full.txt — skipped.`);
    }
  }

  // 2. Concatenated ecosystem full reference.
  const fullBanner = `# Mongez ecosystem — full reference

> Combined \`llms-full.txt\` for every package in the @mongez/* family.
> Fetch this when you want the entire surface in one shot. For focused
> per-package content, see each package's \`/llms-full.txt\` at
> \`${SITE}/<package>/llms-full.txt\`.

Generated: ${new Date().toISOString()}

`;
  await writeFile(
    resolve(PUBLIC, "llms-full.txt"),
    fullBanner + fullParts.join(""),
    "utf8",
  );

  // 3. Ecosystem index, generated from the package list.
  const pkgLines = present
    .map(
      ({ name, pkg }) =>
        `- [${name}](${SITE}/${pkg}/llms.txt): ${blurbs.get(pkg) ?? ""}`,
    )
    .join("\n");
  const fullRefLinks = present
    .map(({ pkg }) => `[/${pkg}/llms-full.txt](${SITE}/${pkg}/llms-full.txt)`)
    .join(" · ");

  const index = `# Mongez

> A TypeScript ecosystem of ${present.length} framework-agnostic packages — state, data fetching/caching, an event bus, a utility belt, i18n, DOM/SEO helpers, and AI-agent tooling. React adapters where relevant. Built for AI-assisted development.

## Packages

${pkgLines}

## Full reference

- [llms-full.txt](${SITE}/llms-full.txt): every package's full reference concatenated into one file. One fetch wins when you want everything.
- Per-package full references: ${fullRefLinks}

## Docs

- [mongez.js.org](${SITE}): human-readable documentation site.
- [GitHub](https://github.com/hassanzohdy): source code per package.

## About the family

Every package ships zero-config TypeScript types, its own \`llms.txt\` / \`llms-full.txt\`, and a \`skills/\` folder of dense reference cards designed for LLM ingestion. The core packages are framework-agnostic; React adapters are provided where relevant. Install any package and point your coding agent at its \`llms.txt\`, or use [@mongez/agent-kit](${SITE}/agent-kit/overview/) to auto-discover and sync its skills into your agent.
`;
  await writeFile(resolve(PUBLIC, "llms.txt"), index, "utf8");

  console.log(
    `[llms] Wrote index (${present.length} packages) + per-package files + concatenated full reference.`,
  );
}

main().catch((err) => {
  console.error("[llms] failed:", err);
  process.exit(1);
});
