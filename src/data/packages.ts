/**
 * Single source of truth for the @mongez/* package catalogue.
 *
 * Consumed by:
 *   - src/pages/packages.astro     (full-width /packages/ page)
 *   - src/content/docs/index.mdx   (Featured section on homepage)
 *
 * If you add a new package, update this file. Sidebar entries still
 * live in astro.config.mjs (per-package autogenerate).
 */

export type PackageGroup =
  | "Foundations"
  | "State"
  | "Data & Networking"
  | "Infrastructure"
  | "Internationalisation"
  | "React"
  | "Build & AI tooling";

export type Package = {
  /** Display name (eg. "React Form"). */
  name: string;
  /** npm package name without scope (eg. "react-form"). */
  slug: string;
  /** One-line description — keep under ~110 chars for grid scanability. */
  description: string;
  /** Architectural group (sets which section it renders under). */
  group: PackageGroup;
  /**
   * Featured packages get distinguished card styling on /packages/
   * and a dedicated section on the homepage. Curate carefully —
   * featured is signal, not noise.
   */
  featured?: boolean;
};

export const PACKAGES: Package[] = [
  // ── Foundations ──
  {
    name: "Events",
    slug: "events",
    description: "Namespace-aware event bus. Used internally by atom; usable standalone.",
    group: "Foundations",
  },
  {
    name: "Reinforcements",
    slug: "reinforcements",
    description: "~130 typed utility functions — arrays, objects, strings, numbers, async, lazy values.",
    group: "Foundations",
    featured: true,
  },
  {
    name: "Supportive Is",
    slug: "supportive-is",
    description: "Focused type-guard library: isString, isArray, isEmail, isBrowser, and 60+ more.",
    group: "Foundations",
  },
  {
    name: "Collection",
    slug: "collection",
    description: "Fluent array wrapper — filter, sort, group, paginate, pluck, math, 100+ helpers.",
    group: "Foundations",
  },

  // ── State ──
  {
    name: "Atom",
    slug: "atom",
    description: "Framework-agnostic state primitive. Typed value, actions, derived state, persistence, SSR, DevTools.",
    group: "State",
  },
  {
    name: "React Atom",
    slug: "react-atom",
    description: "React adapter for @mongez/atom — per-atom hooks, store provider, preset atoms.",
    group: "State",
  },
  {
    name: "Atomic Query",
    slug: "atomic-query",
    description: "Client-side query cache built on react-atom — useQuery, useMutation, infinite, suspense, list helpers.",
    group: "State",
  },

  // ── Data & Networking ──
  {
    name: "HTTP",
    slug: "http",
    description: "Fetch-based HTTP client with {data, error} results, abort, caching, interceptors, and a Resource CRUD helper.",
    group: "Data & Networking",
    featured: true,
  },
  {
    name: "Cache",
    slug: "cache",
    description: "Pluggable cache facade with drivers for localStorage, sessionStorage, runtime memory, and custom stores.",
    group: "Data & Networking",
  },

  // ── Infrastructure ──
  {
    name: "Config",
    slug: "config",
    description: "Typed app config tree. Dot-notation get/set, deep-merge writes, TypeScript generics.",
    group: "Infrastructure",
  },
  {
    name: "Dotenv",
    slug: "dotenv",
    description: ".env parser/loader for Node — type coercion, ${VAR} interpolation, NODE_ENV resolution.",
    group: "Infrastructure",
  },
  {
    name: "Encryption",
    slug: "encryption",
    description: "Symmetric encrypt/decrypt for JSON values + md5/sha1/sha256/sha512 — browser and Node.",
    group: "Infrastructure",
  },
  {
    name: "DOM",
    slug: "dom",
    description: "Browser DOM helpers — metadata, fonts, stylesheets, CSS vars, keyboard shortcuts, viewport.",
    group: "Infrastructure",
  },
  {
    name: "Concat Route",
    slug: "concat-route",
    description: "Dependency-free path joiner — normalises segments, handles stray slashes, preserves protocols.",
    group: "Infrastructure",
  },
  {
    name: "Query String",
    slug: "query-string",
    description: "Query-string parse/serialize with nested objects and arrays, plus a browser URL helper.",
    group: "Infrastructure",
  },

  // ── i18n ──
  {
    name: "Localization",
    slug: "localization",
    description: "Framework-agnostic i18n — dictionaries, placeholder interpolation, plurals, locale events.",
    group: "Internationalisation",
  },
  {
    name: "React Localization",
    slug: "react-localization",
    description: "React bindings for @mongez/localization. <Trans>, useTranslate, JSX-aware interpolation.",
    group: "Internationalisation",
  },

  // ── React ──
  {
    name: "React Router",
    slug: "react-router",
    description: "Configuration-based React router — lazy apps, typed nav, locale-aware routes, middleware, prefetch.",
    group: "React",
    featured: true,
  },
  {
    name: "React Form",
    slug: "react-form",
    description: "React form primitives — useFormControl, validation rules, form events. React Native compatible.",
    group: "React",
    featured: true,
  },
  {
    name: "React Helmet",
    slug: "react-helmet",
    description: "Declarative <head> manager — titles, descriptions, OG/Twitter meta, canonical URL.",
    group: "React",
  },
  {
    name: "User",
    slug: "user",
    description: "Framework-agnostic user/auth state — current user, permissions, tokens, pluggable storage.",
    group: "React",
  },

  // ── Build & AI tooling ──
  {
    name: "Vite",
    slug: "vite",
    description: "Vite plugin suite for SPAs — typed env, in-HTML interpolation, path aliasing, auto-open, post-build zip.",
    group: "Build & AI tooling",
  },
  {
    name: "Pkgist",
    slug: "pkgist",
    description: "Build, version, and publish tool for TypeScript npm packages. tsdown-powered, dual ESM+CJS, git+npm automation.",
    group: "Build & AI tooling",
  },
  {
    name: "Agent Kit",
    slug: "agent-kit",
    description: "Authoring toolkit for AI coding agents — one AGENTS.md drives every tool's config file. Skill sync from npm.",
    group: "Build & AI tooling",
    featured: true,
  },
];

/** Group order on the /packages/ page. */
export const GROUP_ORDER: PackageGroup[] = [
  "Foundations",
  "State",
  "Data & Networking",
  "Infrastructure",
  "Internationalisation",
  "React",
  "Build & AI tooling",
];

export const FEATURED_PACKAGES = PACKAGES.filter(p => p.featured);

export function packagesByGroup(): Record<PackageGroup, Package[]> {
  const out = {} as Record<PackageGroup, Package[]>;
  for (const group of GROUP_ORDER) out[group] = [];
  for (const pkg of PACKAGES) out[pkg.group].push(pkg);
  return out;
}
