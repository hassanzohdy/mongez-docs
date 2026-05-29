/**
 * Sync each package's `skills/*.md` content into `src/content/docs/<package>/synced/`.
 *
 * Why a sync step instead of importing directly:
 *
 *   - Starlight needs markdown files inside `src/content/docs/`. We don't
 *     symlink — Astro's content loader walks the actual filesystem.
 *   - We may need to massage frontmatter, prepend headings, or strip
 *     content (raw `skills/*.md` files don't have Starlight frontmatter).
 *   - The synced output is gitignored; only the source-of-truth in each
 *     package's `skills/` is checked in.
 *
 * This script is idempotent — runs as a `prebuild` step or manually via
 * `yarn sync`.
 */
import { readFile, writeFile, readdir, mkdir, rm, unlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve relative to this script's location so `yarn sync` works from any
 * cwd. Use `fileURLToPath` rather than `new URL(...).pathname` — the
 * latter prepends a slash to Windows paths (e.g. `/D:/...`) which breaks
 * `path.resolve`.
 */
const HERE = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(HERE, "..");
const WORKSPACE_ROOT = resolve(DOCS_ROOT, "..");

/**
 * Each entry: the package's folder name (under @mongez/) and the
 * content-docs subdir to write into. Order here drives the order of
 * package sections on the docs landing page; the Starlight sidebar order
 * is controlled by `astro.config.mjs`.
 */
const PACKAGES: Array<{ pkg: string; dir: string }> = [
  // Core state-management family
  { pkg: "atom",               dir: "atom" },
  { pkg: "react-atom",         dir: "react-atom" },
  { pkg: "atomic-query",       dir: "atomic-query" },
  { pkg: "events",             dir: "events" },
  { pkg: "reinforcements",     dir: "reinforcements" },
  // Utility / infrastructure
  { pkg: "supportive-is",      dir: "supportive-is" },
  { pkg: "collection",         dir: "collection" },
  { pkg: "cache",              dir: "cache" },
  { pkg: "config",             dir: "config" },
  { pkg: "dotenv",             dir: "dotenv" },
  { pkg: "encryption",         dir: "encryption" },
  { pkg: "concat-route",       dir: "concat-route" },
  { pkg: "query-string",       dir: "query-string" },
  { pkg: "dom",                dir: "dom" },
  { pkg: "localization",       dir: "localization" },
  // React adapters
  { pkg: "react-localization", dir: "react-localization" },
  { pkg: "react-router",       dir: "react-router" },
  { pkg: "react-helmet",       dir: "react-helmet" },
  { pkg: "react-form",         dir: "react-form" },
  { pkg: "user",               dir: "user" },
  // Networking
  { pkg: "http",               dir: "http" },
  // Developer tooling
  { pkg: "vite",               dir: "vite" },
  { pkg: "agent-kit",          dir: "agent-kit" },
  { pkg: "pkgist",             dir: "pkgist" },
  { pkg: "copper",             dir: "copper" },
];

/**
 * Per-package title used when synthesising the page <h1> for each
 * package's `overview.md`. Without this, every package's Overview page
 * renders `Overview` as its H1 — producing a "Reinforcements > Overview"
 * sidebar followed by an "Overview" H1, which is redundant. By setting
 * the H1 to the package's display name and forcing the sidebar entry
 * label back to `Overview`, we get a clean hierarchy:
 *
 *   Sidebar:  Reinforcements > Overview
 *   Page H1:  Reinforcements
 */
/**
 * Skill files that exist in a package's `skills/` folder — and DO ship to
 * AI agents via agent-kit — but are intentionally NOT rendered as docs
 * pages, because a sibling page already covers the same topic for human
 * readers. Documentation is for developers; skills are for AI. We keep
 * every skill at the source, and only the docs site omits the duplicates
 * so the sidebar stays free of near-identical entries.
 *
 * Keyed by docs dir → set of skill slugs (directory name for the nested
 * `skills/<name>/SKILL.md` layout, or filename-without-`.md` for the flat
 * layout).
 */
const DOCS_EXCLUDE: Record<string, Set<string>> = {
  // Refactor leftovers — old flat names superseded by newer ones.
  atom: new Set(["defining-atoms", "derived", "persist", "stores"]),
  // basic-query ⊂ queries; list-queries bundles infinite + list-helpers
  // which have their own focused pages.
  "atomic-query": new Set(["basic-query", "list-queries"]),
  // math-aggregation is a tutorial subset of the math reference.
  collection: new Set(["math-aggregation"]),
  // encryption (driver reference) folded into encrypted-cache (setup guide).
  cache: new Set(["encryption"]),
};

const OVERVIEW_TITLES: Record<string, string> = {
  "atom":               "Atom",
  "react-atom":         "React Atom",
  "atomic-query":       "Atomic Query",
  "events":             "Events",
  "reinforcements":     "Reinforcements",
  "supportive-is":      "Supportive Is",
  "collection":         "Collection",
  "cache":              "Cache",
  "config":             "Config",
  "dotenv":             "Dotenv",
  "encryption":         "Encryption",
  "concat-route":       "Concat Route",
  "query-string":       "Query String",
  "dom":                "DOM",
  "localization":       "Localization",
  "react-localization": "React Localization",
  "react-router":       "React Router",
  "react-helmet":       "React Helmet",
  "react-form":         "React Form",
  "user":               "User",
  "vite":               "Vite",
  "http":               "HTTP",
  "agent-kit":          "Agent Kit",
  "pkgist":             "Pkgist",
  "copper":             "Copper",
};

/**
 * Slugified file titles for the Starlight sidebar. The skills files are
 * named for AI-agent convenience (`overview.md`, `bus.md`, `ssr.md`); a
 * docs reader wants something more human. Override per-file here.
 *
 * This map is GLOBAL — the override applies to every package that has a
 * file of that name. When a slug means different things in different
 * packages (e.g. `collections.md` in `atom` vs `supportive-is`), use
 * `PACKAGE_TITLE_OVERRIDES` below instead.
 */
const TITLE_OVERRIDES: Record<string, string> = {
  "overview.md":          "Overview",
  "atoms.md":             "Atoms",
  "collections.md":       "Atom Collections",
  "derived.md":           "Derived atoms",
  "persist.md":           "Persistence",
  "stores.md":            "Atom Stores (SSR)",
  "actions.md":           "Actions",
  "devtools.md":          "Devtools",
  "recipes.md":           "Recipes",
  "presets.md":           "Preset atoms",
  "ssr.md":               "SSR & stores",
  "queries.md":           "Queries (useQuery)",
  "mutations.md":         "Mutations (useMutation)",
  "infinite.md":          "Infinite / paginated queries",
  "suspense.md":          "Suspense mode",
  "cache.md":             "Cache management",
  "list-helpers.md":      "List helpers",
  "bus.md":               "Events bus",
  "namespaces.md":        "Namespaces",
  // Acronym & casing fixes — the auto-capitaliser produces "Cli", "Jsx",
  // "Http Client", etc., which read wrong. Override explicitly.
  "cli.md":                 "CLI",
  "cli-usage.md":           "CLI usage",
  "agent-integrations.md":  "Agent integrations",
  "authoring-skills.md":    "Authoring skills",
  "htaccess.md":            ".htaccess generation",
  "http-client.md":         "HTTP client",
  "jsx-converter.md":       "JSX converter",
  "env-in-html.md":         "Env in HTML",
  "production-base-url.md": "Production base URL",
  "tsconfig-aliases.md":    "tsconfig aliases",
  "trans-x.md":             "transX",
  "head-elements.md":       "Head elements",
  "build-zip.md":           "Build ZIP",
  // Hand-authored / synced getting-started pages — sentence case across
  // the family, no package-name suffix.
  "getting-started.md":     "Get started",
  // Reinforcements categories
  "arrays.md":            "Arrays",
  "objects.md":           "Objects",
  "strings.md":           "Strings",
  "numbers.md":           "Numbers",
  "mixed.md":             "Mixed utilities",
  "random.md":            "Random",
  "lazy.md":              "Lazy values",
  "functions.md":         "Function utilities",
  "async.md":             "Async helpers",
  "types.md":             "Type utilities",
  "README.md":            "Skill index",
};

/**
 * Per-package per-file title overrides — keyed by `<dir>/<file>`.
 *
 * Consulted BEFORE `TITLE_OVERRIDES`. Use this when the same skill slug
 * appears in multiple packages with genuinely different meanings, or
 * when a single package needs a label that would look wrong globally
 * (e.g. a file named after the package itself, like
 * `concat-route/concat-route.md` — the global default would auto-cap to
 * "Concat Route", but the sidebar already shows that as the section
 * label, so the page label should be something else).
 */
const PACKAGE_TITLE_OVERRIDES: Record<string, string> = {
  // `collections.md` in atom is about collections-of-atoms; in
  // supportive-is it's about type predicates for collection types.
  // The global override "Atom Collections" is correct for atom but
  // misleading for supportive-is.
  "atom/collections.md":             "Atom collections",
  "supportive-is/collections.md":    "Collection predicates",
  // Package-name-as-filename — the global auto-cap would just echo the
  // sidebar section label.
  "concat-route/concat-route.md":    "Usage",
  "react-helmet/helmet.md":          "The <Helmet> component",
};

/**
 * Sidebar order (lower = first). Files not listed sort alphabetically
 * after the ordered ones.
 */
const ORDER: Record<string, number> = {
  "overview.md":     10,
  // Agent Kit's developer-facing pages come right after Overview.
  "agent-integrations.md": 15,
  "cli-usage.md":          16,
  "authoring-skills.md":   18,
  "atoms.md":        20,
  "collections.md":  30,
  "derived.md":      40,
  "persist.md":      50,
  "actions.md":      60,
  "stores.md":       70,
  "devtools.md":     80,
  "presets.md":      30,
  "ssr.md":          40,
  "queries.md":      20,
  "mutations.md":    30,
  "infinite.md":     40,
  "suspense.md":     50,
  "cache.md":        60,
  "list-helpers.md": 70,
  "bus.md":          20,
  "namespaces.md":   30,
  "recipes.md":      99,
  "README.md":       100,
};

function titleFromFilename(file: string, dir?: string): string {
  // Per-package override wins first — used for slugs whose global title
  // would be wrong inside one specific package's context.
  if (dir) {
    const perPackage = PACKAGE_TITLE_OVERRIDES[`${dir}/${file}`];
    if (perPackage) return perPackage;
  }
  // Global override map for slugs that are the same idea everywhere.
  if (TITLE_OVERRIDES[file]) return TITLE_OVERRIDES[file];
  // Default: drop `.md`, replace dashes with spaces, capitalise word
  // starts. Good enough for slugs like `arrays`, `caching`, `streaming`.
  return file
    .replace(/\.md$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Remove a leading `# Heading` line (and any blank lines that follow) from
 * skills files. Starlight renders the frontmatter `title:` as the page <h1>,
 * so keeping the skills H1 in the body produces a duplicate heading.
 *
 * Two source shapes to handle:
 *   1. No frontmatter — the file begins directly with `# Heading`.
 *   2. With frontmatter — `---\n...\n---\n# Heading` (most SKILL.md files
 *      do this because they need `name`/`description`/`TRIGGER` for the AI
 *      skill index). The H1 lives AFTER the closing `---`, so the regex
 *      must skip past the frontmatter block before stripping.
 */
function stripLeadingH1(raw: string): string {
  if (!raw.startsWith("---")) {
    return raw.replace(/^#[^\n]*\n+/, "");
  }
  const fmEnd = raw.indexOf("\n---", 4);
  if (fmEnd === -1) return raw; // malformed; pass through
  const frontmatter = raw.slice(0, fmEnd + 4); // through closing `---`
  const body = raw.slice(fmEnd + 4);
  // Body starts with `\n` after the closing fence; strip optional blank
  // lines, then a single H1, then any blank lines that follow it.
  const stripped = body.replace(/^\n+#[^\n]*\n+/, "\n\n");
  return frontmatter + stripped;
}

/**
 * Rewrite sibling `./foo.md` links to `../foo/` so they resolve correctly
 * in Starlight.
 *
 * In the skills folder every file is a peer (same directory), so authors
 * write `./sibling.md` or `./sibling.md#anchor`. When synced into
 * `src/content/docs/<pkg>/foo.md`, the page is served at `/<pkg>/foo/`
 * (trailing slash). A browser resolves `./sibling.md` against the *URL*
 * rather than the file path, producing `/<pkg>/foo/sibling/` — a 404.
 * The correct link from `/<pkg>/foo/` to `/<pkg>/sibling/` is `../sibling/`.
 */
function rewriteSiblingLinks(content: string): string {
  // Matches markdown links: [text](./slug.md) or [text](./slug.md#anchor)
  // Also handles angle-bracket links: <./slug.md>
  return content.replace(
    /\(\.\/([^)#\s]+?)\.md(#[^)\s]*)?\)/g,
    (_, slug, anchor) => `(../${slug}/${anchor ?? ""})`,
  );
}

/**
 * Replace the install code block(s) under `## Install` / `## Installation`
 * with a Starlight `<Tabs>` block exposing npm / yarn / pnpm.
 *
 * Source SKILL.md files keep their plain markdown install commands —
 * AI agents reading them see one canonical install command. Only the
 * docs site rewrites them into tabs for human-friendly UX.
 *
 * Detection:
 *   - Finds the first `## Install` or `## Installation` H2.
 *   - Reads the first install command in the section to learn the
 *     `-D` flag (some dev-tools install with `-D`) and the package
 *     specifier(s).
 *   - Strips up to three leading fenced code blocks (covers the
 *     three-blocks-stacked layout most overview pages use today).
 *   - Emits a single `<Tabs>` block with three `<TabItem>`s.
 *
 * The output is MDX (Starlight components require it).
 */
function transformInstallToTabs(body: string): { transformed: string; changed: boolean } {
  const headingRe = /^##\s+Install(?:ation)?\s*$/im;
  const headingMatch = headingRe.exec(body);
  if (!headingMatch) return { transformed: body, changed: false };

  // Locate the section body — everything from the line after the heading
  // until the next H1/H2 heading (or EOF).
  const headingEnd = headingMatch.index + headingMatch[0].length;
  let i = headingEnd;
  while (i < body.length && (body[i] === "\n" || body[i] === "\r")) i++;

  // Only treat H2 as the next section boundary — `# npm` / `# yarn` /
  // `# pnpm` shell-style comments at the start of `sh` code blocks also
  // sit at column 0, which would otherwise be mistaken for H1 headers.
  const rest = body.slice(i);
  const nextHeadingIdx = rest.search(/^##\s/m);
  const sectionEnd = nextHeadingIdx === -1 ? body.length : i + nextHeadingIdx;

  const section = body.slice(i, sectionEnd);

  // Extract the first install command to learn the install flag and
  // the package specifier(s). Handles `npm install`, `npm i`, `yarn add`,
  // and `pnpm add` / `pnpm i`, with optional `-D` and one or more
  // `@scope/name` (or unscoped) specifiers.
  const cmdRe =
    /(?:npm\s+(?:install|i)|yarn\s+add|pnpm\s+(?:add|i))\s+(-D\s+)?((?:@[\w\-.]+\/[\w\-]+|[\w\-]+)(?:\s+(?:@[\w\-.]+\/[\w\-]+|[\w\-]+))*)/i;
  const cmdMatch = cmdRe.exec(section);
  if (!cmdMatch) return { transformed: body, changed: false };

  const devFlag = cmdMatch[1] ? "-D " : "";
  const pkgs = cmdMatch[2].trim();

  // Strip up to three leading fenced code blocks (and any blank lines
  // before them). Whatever trailing prose follows is preserved as-is.
  let remaining = section.replace(/^\n+/, "");
  for (let n = 0; n < 3; n++) {
    const blockMatch = /^```[\w]*\n[\s\S]*?\n```\n*/.exec(remaining);
    if (!blockMatch) break;
    remaining = remaining.slice(blockMatch[0].length);
  }

  // Build the tabs block. `syncKey="pkg-manager"` makes the user's
  // package-manager choice persist across every overview page in the
  // session — pick yarn once, every install snippet on every page
  // defaults to yarn from then on.
  const tabs = `<Tabs syncKey="pkg-manager">
<TabItem label="npm">

\`\`\`sh
npm install ${devFlag}${pkgs}
\`\`\`

</TabItem>
<TabItem label="yarn">

\`\`\`sh
yarn add ${devFlag}${pkgs}
\`\`\`

</TabItem>
<TabItem label="pnpm">

\`\`\`sh
pnpm add ${devFlag}${pkgs}
\`\`\`

</TabItem>
</Tabs>
`;

  const trailingProse = remaining.length > 0
    ? (remaining.startsWith("\n") ? remaining : "\n" + remaining)
    : "";

  return {
    transformed: body.slice(0, i) + tabs + trailingProse + body.slice(sectionEnd),
    changed: true,
  };
}

/**
 * MDX 3 parses literal `{...}` inside JSX context (anywhere inside a
 * raw HTML block) as a JavaScript expression. So `<p>{data}</p>` inside
 * a `<div>` would try to evaluate `data` as a variable and silently
 * fail the entire body render — TOC survives, paragraphs disappear.
 *
 * This transform escapes `{` → `&#123;` and `}` → `&#125;` ONLY when
 * inside an open `<div>...</div>` block, leaving prose markdown outside
 * such blocks untouched (so writers can still use `{...}` in normal
 * paragraphs) and leaving fenced code blocks untouched (so Quick peek
 * snippets with object literals render correctly).
 *
 * Authors writing highlight cards with literal `{...}` placeholders
 * (e.g. `<code>setFoo({...})</code>`, `<code>${VAR}</code>`,
 * `<code>{ key: value }</code>`) get the right rendering without
 * remembering to manually HTML-entity-escape every brace.
 */
function escapeBracesInHtmlBlocks(content: string): string {
  const lines = content.split("\n");
  const out: string[] = [];
  let divDepth = 0;
  let inCodeFence = false;

  for (const line of lines) {
    // Toggle fenced-code state on ``` or ~~~. Don't escape inside fences.
    if (/^\s*(```|~~~)/.test(line)) {
      inCodeFence = !inCodeFence;
      out.push(line);
      continue;
    }

    if (inCodeFence) {
      out.push(line);
      continue;
    }

    const openDivs = (line.match(/<div\b/g) || []).length;
    const closeDivs = (line.match(/<\/div>/g) || []).length;
    const willBeInsideDiv = divDepth > 0 || openDivs > 0;

    if (willBeInsideDiv) {
      out.push(
        line.replace(/\{/g, "&#123;").replace(/\}/g, "&#125;"),
      );
    } else {
      out.push(line);
    }

    divDepth += openDivs - closeDivs;
    if (divDepth < 0) divDepth = 0;
  }

  return out.join("\n");
}

/**
 * Inject an MDX import block immediately after the frontmatter (or at
 * the top of the file when there's no frontmatter). The import is the
 * minimum needed for Starlight's `<Tabs>` / `<TabItem>` components.
 */
function injectTabsImport(content: string): string {
  const importLine = `import { Tabs, TabItem } from "@astrojs/starlight/components";`;
  if (!content.startsWith("---")) {
    return `${importLine}\n\n${content}`;
  }
  const endIdx = content.indexOf("\n---", 4);
  if (endIdx === -1) return content; // malformed; pass through
  const head = content.slice(0, endIdx + 4); // through closing `---`
  const tail = content.slice(endIdx + 4);     // begins with `\n`
  return `${head}\n\n${importLine}${tail}`;
}

function ensureFrontmatter(
  raw: string,
  title: string,
  order: number,
  sidebarLabel?: string,
): string {
  // If the file already has frontmatter, leave its other fields intact
  // but make sure `title` (Starlight-required) and `sidebar.order` are
  // present. If they're missing we inject minimal entries; we don't
  // touch existing values.
  //
  // `sidebarLabel`, when provided, decouples the page H1 (`title:`) from
  // the sidebar entry text — used for overview pages where the H1 is the
  // package name but the sidebar entry should read "Overview". We only
  // inject it as part of a fresh `sidebar:` block we're writing — we
  // don't touch a `sidebar:` block the author already wrote.
  if (raw.startsWith("---")) {
    const end = raw.indexOf("\n---", 4);
    if (end === -1) return raw; // malformed; pass through
    const block = raw.slice(4, end);
    const rest = raw.slice(end + 4); // includes the closing newline
    let next = block;
    if (!/\btitle\s*:/.test(next)) {
      next = `title: ${JSON.stringify(title)}\n${next}`;
    }
    if (!/\bsidebar\s*:/.test(next)) {
      const labelLine = sidebarLabel
        ? `\n  label: ${JSON.stringify(sidebarLabel)}`
        : "";
      next = `${next}\nsidebar:\n  order: ${order}${labelLine}`;
    }
    return `---\n${next.trim()}\n---${rest}`;
  }
  const labelBlock = sidebarLabel
    ? `\n  label: ${JSON.stringify(sidebarLabel)}`
    : "";
  return `---
title: ${JSON.stringify(title)}
sidebar:
  order: ${order}${labelBlock}
---

${raw.trimStart()}`;
}

async function syncPackage(pkg: string, dir: string): Promise<number> {
  const skillsDir = resolve(WORKSPACE_ROOT, pkg, "skills");
  const destDir = resolve(DOCS_ROOT, "src/content/docs", dir);

  if (!existsSync(skillsDir)) {
    console.warn(
      `[sync] @mongez/${pkg} has no skills/ folder — skipped.`,
    );
    return 0;
  }

  // Ensure the destination exists. We DON'T wipe it because some files
  // (like `getting-started.md`) may be hand-authored and live alongside
  // the synced ones. The per-file sync below overwrites only files that
  // were synced previously, by tracking the source filenames.
  await mkdir(destDir, { recursive: true });

  // Collect skill sources. Two layouts are supported:
  //   (a) `skills/<name>.md`               (flat — atom, react-atom, …)
  //   (b) `skills/<name>/SKILL.md`         (Claude-plugin layout — react-form)
  // For (b), we use the directory name as the doc slug.
  const excluded = DOCS_EXCLUDE[dir] ?? new Set<string>();
  const entries = await readdir(skillsDir, { withFileTypes: true });
  const sources: Array<{ slug: string; sourcePath: string }> = [];
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".md")) {
      // Skip the per-package README inside skills/ — it's an LLM index,
      // not a doc page.
      if (entry.name === "README.md") continue;
      // Skip AI-only duplicates — kept in source skills, omitted from docs.
      if (excluded.has(entry.name.replace(/\.md$/, ""))) continue;
      sources.push({ slug: entry.name, sourcePath: join(skillsDir, entry.name) });
    } else if (entry.isDirectory()) {
      if (excluded.has(entry.name)) continue;
      const skillFile = join(skillsDir, entry.name, "SKILL.md");
      if (existsSync(skillFile)) {
        sources.push({ slug: `${entry.name}.md`, sourcePath: skillFile });
      }
    }
  }

  for (const { slug: file, sourcePath } of sources) {
    const raw = await readFile(sourcePath, "utf8");
    // For `overview.md`, the page H1 should be the package name (e.g.
    // "Reinforcements") while the sidebar entry stays as "Overview" — so
    // the sidebar reads `Reinforcements > Overview` and the page shows
    // `Reinforcements` as its heading. Both come from the same file.
    const isOverview = file === "overview.md";
    const packageTitle = isOverview ? OVERVIEW_TITLES[dir] : undefined;
    const title = packageTitle ?? titleFromFilename(file, dir);
    const sidebarLabel = packageTitle ? "Overview" : undefined;
    const order = ORDER[file] ?? 50;

    // Overview pages get the install code block rewritten into a
    // Starlight `<Tabs>` block (npm / yarn / pnpm). Because Starlight
    // components only render in MDX, the file extension flips to `.mdx`
    // and an MDX import line gets injected immediately after frontmatter.
    let body = rewriteSiblingLinks(stripLeadingH1(raw));
    let outFile = file;
    if (isOverview) {
      const { transformed, changed } = transformInstallToTabs(body);
      if (changed) {
        body = transformed;
        outFile = file.replace(/\.md$/, ".mdx");
      }
    }

    let output = ensureFrontmatter(body, title, order, sidebarLabel);
    if (outFile.endsWith(".mdx")) {
      output = injectTabsImport(output);
      // Defensive: any literal `{` / `}` inside the HTML highlight
      // cards (or any other raw `<div>` block) gets escaped so MDX
      // doesn't try to evaluate it as a JSX expression.
      output = escapeBracesInHtmlBlocks(output);
    }

    // If we're writing `overview.mdx`, remove any stale `overview.md`
    // left over from a previous sync (and vice versa) so Astro's
    // content collection sees exactly one source for the URL.
    const stalePath = outFile.endsWith(".mdx")
      ? join(destDir, outFile.replace(/\.mdx$/, ".md"))
      : join(destDir, outFile.replace(/\.md$/, ".mdx"));
    if (existsSync(stalePath)) await unlink(stalePath);

    await writeFile(join(destDir, outFile), output, "utf8");
  }

  // Copy the package's root CHANGELOG.md (if present) into the docs as a
  // `changelog.md` page — same source-of-truth model as skills: the
  // package owns the file, the docs site mirrors it. Ordered last in the
  // sidebar (order 900) so it always sits below Recipes.
  let changelogSynced = 0;
  const changelogSrc = resolve(WORKSPACE_ROOT, pkg, "CHANGELOG.md");
  if (existsSync(changelogSrc)) {
    const raw = await readFile(changelogSrc, "utf8");
    const output = ensureFrontmatter(
      rewriteSiblingLinks(stripLeadingH1(raw)),
      "Changelog",
      900,
      "Changelog",
    );
    await writeFile(join(destDir, "changelog.md"), output, "utf8");
    changelogSynced = 1;
  }

  console.log(
    `[sync] @mongez/${pkg}: ${sources.length + changelogSynced} files → ${dir}/`,
  );
  return sources.length;
}

async function main() {
  let total = 0;
  for (const { pkg, dir } of PACKAGES) {
    total += await syncPackage(pkg, dir);
  }
  console.log(`[sync] Done. ${total} files total.`);
}

main().catch(err => {
  console.error("[sync] failed:", err);
  process.exit(1);
});
