// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";

/**
 * mongez.js.org Starlight site.
 *
 * Content for each package lives in `src/content/docs/<package>/` and is
 * synced from each package's `skills/*.md` by `scripts/sync-skills.ts`.
 *
 * The ecosystem-level `llms-full.txt` is generated at build time by
 * `scripts/build-llms-full.ts` (concatenates each package's
 * `llms-full.txt`). Both scripts are wired into the `prebuild` npm
 * script so they run before `astro build`.
 */
export default defineConfig({
  site: "https://mongez.js.org",

  // Default Astro port (4321) is already used locally by the warlock.js
  // docs dev server. Bind one above to keep both running side-by-side.
  server: { port: 4322 },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    starlight({
      title: "Mongez",
      description:
        "Production TypeScript packages for state, routing, forms, networking, configuration, encryption, and more — 25 focused packages, designed to read equally well to humans and AI coding agents.",
      logo: {
        src: "./src/assets/mongez.png",
        alt: "Mongez — production TypeScript packages",
        replacesTitle: false,
      },
      // Browser tab icon — reuse the fire-and-ice bolt logo. Lives in
      // public/, referenced by absolute path.
      favicon: "/mongez.png",
      // Starlight 0.30 uses the object form `{ github: url }`.
      // The array form `[{ icon, label, href }]` only landed in 0.32+.
      social: {
        github: "https://github.com/hassanzohdy",
      },
      customCss: ["./src/styles/global.css"],
      // Replace Starlight's default <SocialIcons> slot with our own
      // <HeaderNav> that renders top-nav text links (Docs, Packages,
      // Ecosystem) followed by the GitHub icon. Keeps Starlight's
      // Header layout intact (SiteTitle on the left, Search in the
      // middle, our nav on the right).
      components: {
        SocialIcons: "./src/components/HeaderNav.astro",
      },
      lastUpdated: true,
      editLink: {
        baseUrl:
          "https://github.com/hassanzohdy/mongez-docs/edit/main/",
      },
      sidebar: [
        {
          label: "Start",
          items: [
            { label: "Overview", link: "/" },
            { label: "Ecosystem map", link: "/ecosystem/" },
            { label: "Which package?", link: "/which/" },
          ],
        },
        // ── Foundations ──
        // The non-React utility belt every other @mongez/* package builds on.
        {
          label: "Events",
          collapsed: true,
          items: [
            { slug: "events/overview" },
            { slug: "events/bus" },
            { slug: "events/namespaces" },
            { slug: "events/recipes" },
          ],
        },
        {
          // Reinforcements ships ~130 helpers grouped by primitive type.
          // The "By type" subgroup mirrors how authors organize their imports.
          label: "Reinforcements",
          collapsed: true,
          items: [
            { slug: "reinforcements/overview" },
            {
              label: "By type",
              items: [
                { slug: "reinforcements/arrays" },
                { slug: "reinforcements/objects" },
                { slug: "reinforcements/strings" },
                { slug: "reinforcements/numbers" },
                { slug: "reinforcements/async" },
                { slug: "reinforcements/functions" },
                { slug: "reinforcements/lazy" },
                { slug: "reinforcements/mixed" },
                { slug: "reinforcements/random" },
                { slug: "reinforcements/types" },
              ],
            },
            { slug: "reinforcements/recipes" },
          ],
        },
        {
          label: "Supportive Is",
          collapsed: true,
          items: [
            { slug: "supportive-is/overview" },
            {
              label: "Predicates",
              items: [
                { slug: "supportive-is/primitives" },
                { slug: "supportive-is/collections" },
                { slug: "supportive-is/formats" },
                { slug: "supportive-is/environment" },
                { slug: "supportive-is/misc" },
              ],
            },
            { slug: "supportive-is/recipes" },
          ],
        },
        {
          label: "Collection",
          collapsed: true,
          items: [
            { slug: "collection/overview" },
            {
              label: "Construction",
              items: [
                { slug: "collection/construction" },
                { slug: "collection/builtins" },
              ],
            },
            {
              label: "Querying",
              items: [
                { slug: "collection/querying" },
                { slug: "collection/where" },
                { slug: "collection/sort-group" },
                { slug: "collection/pagination" },
              ],
            },
            { slug: "collection/math" },
            {
              label: "Transforming",
              items: [
                { slug: "collection/transforming" },
                { slug: "collection/mutation" },
                { slug: "collection/strings" },
              ],
            },
            { slug: "collection/recipes" },
          ],
        },
        // ── State ──
        {
          // Flat easy→advanced flow. Duplicate skill pages (defining-atoms,
          // derived, persist, stores) stay in the package for AI agents but
          // are excluded from docs via DOCS_EXCLUDE in sync-skills.ts.
          label: "Atom",
          collapsed: true,
          items: [
            { slug: "atom/overview" },
            { slug: "atom/atoms" },
            { slug: "atom/actions" },
            { slug: "atom/derived-atoms" },
            { slug: "atom/collections" },
            { slug: "atom/persistence" },
            { slug: "atom/atom-store" },
            { slug: "atom/devtools" },
            { slug: "atom/recipes" },
          ],
        },
        {
          label: "React Atom",
          collapsed: true,
          items: [
            { slug: "react-atom/overview" },
            { slug: "react-atom/atoms" },
            { slug: "react-atom/presets" },
            { slug: "react-atom/ssr" },
            { slug: "react-atom/recipes" },
          ],
        },
        {
          // Flat easy→advanced flow. basic-query (⊂ queries) and
          // list-queries (bundles infinite + list-helpers) stay in the
          // package for AI but are excluded from docs.
          label: "Atomic Query",
          collapsed: true,
          items: [
            { slug: "atomic-query/overview" },
            { slug: "atomic-query/queries" },
            { slug: "atomic-query/mutations" },
            { slug: "atomic-query/infinite" },
            { slug: "atomic-query/list-helpers" },
            { slug: "atomic-query/suspense" },
            { slug: "atomic-query/invalidation" },
            { slug: "atomic-query/cache" },
            { slug: "atomic-query/ssr" },
            { slug: "atomic-query/recipes" },
          ],
        },
        // ── Data & Networking ──
        {
          // HTTP splits its sidebar into a flat list of narrative guides
          // + a nested "API Reference" subgroup for signature lookup.
          // First package to grow API reference pages; the pattern is
          // available to any other package that needs it.
          label: "HTTP",
          collapsed: true,
          items: [
            { slug: "http/overview" },
            { slug: "http/http-client" },
            { slug: "http/resource" },
            { slug: "http/error-handling" },
            { slug: "http/caching" },
            { slug: "http/interceptors" },
            { slug: "http/streaming" },
            { slug: "http/recipes" },
            {
              label: "API Reference",
              items: [
                { slug: "http/api/http" },
                { slug: "http/api/http-error" },
                { slug: "http/api/resource" },
              ],
            },
          ],
        },
        {
          label: "Cache",
          collapsed: true,
          items: [
            { slug: "cache/overview" },
            {
              label: "Basics",
              items: [
                { slug: "cache/basic-usage" },
                { slug: "cache/manager" },
              ],
            },
            {
              label: "Drivers",
              items: [
                { slug: "cache/drivers" },
                { slug: "cache/local-storage" },
                { slug: "cache/session-storage" },
                { slug: "cache/runtime" },
                { slug: "cache/custom-drivers" },
              ],
            },
            { slug: "cache/encrypted-cache" },
            { slug: "cache/recipes" },
          ],
        },
        // ── Infrastructure ──
        {
          label: "Config",
          collapsed: true,
          items: [
            { slug: "config/overview" },
            { slug: "config/reading" },
            { slug: "config/writing" },
            { slug: "config/listing" },
            { slug: "config/typing" },
            { slug: "config/recipes" },
          ],
        },
        {
          label: "Dotenv",
          collapsed: true,
          items: [
            { slug: "dotenv/overview" },
            { slug: "dotenv/loader" },
            { slug: "dotenv/parser" },
            { slug: "dotenv/recipes" },
          ],
        },
        {
          label: "Encryption",
          collapsed: true,
          items: [
            { slug: "encryption/overview" },
            { slug: "encryption/encrypt-decrypt" },
            { slug: "encryption/hashes" },
            { slug: "encryption/configuration" },
            { slug: "encryption/recipes" },
          ],
        },
        {
          label: "DOM",
          collapsed: true,
          items: [
            { slug: "dom/overview" },
            { slug: "dom/metadata" },
            { slug: "dom/head-elements" },
            { slug: "dom/assets" },
            { slug: "dom/interactions" },
            { slug: "dom/recipes" },
          ],
        },
        {
          label: "Concat Route",
          collapsed: true,
          items: [
            { slug: "concat-route/overview" },
            { slug: "concat-route/concat-route" },
            { slug: "concat-route/recipes" },
          ],
        },
        {
          label: "Query String",
          collapsed: true,
          items: [
            { slug: "query-string/overview" },
            { slug: "query-string/parse" },
            { slug: "query-string/serialize" },
            { slug: "query-string/recipes" },
          ],
        },
        // ── Internationalisation ──
        {
          label: "Localization",
          collapsed: true,
          items: [
            { slug: "localization/overview" },
            { slug: "localization/translations" },
            { slug: "localization/translating" },
            { slug: "localization/interpolation" },
            { slug: "localization/count-translations" },
            { slug: "localization/events" },
            { slug: "localization/recipes" },
          ],
        },
        {
          label: "React Localization",
          collapsed: true,
          items: [
            { slug: "react-localization/overview" },
            { slug: "react-localization/trans-x" },
            { slug: "react-localization/jsx-converter" },
            { slug: "react-localization/recipes" },
          ],
        },
        // ── React ──
        {
          label: "React Router",
          collapsed: true,
          items: [
            { slug: "react-router/overview" },
            { slug: "react-router/routes" },
            { slug: "react-router/navigation" },
            { slug: "react-router/params" },
            { slug: "react-router/lazy-loading" },
            { slug: "react-router/localization" },
            { slug: "react-router/recipes" },
          ],
        },
        {
          label: "React Form",
          collapsed: true,
          items: [
            { slug: "react-form/getting-started" },
            {
              label: "Form & controls",
              items: [
                { slug: "react-form/create-form-control" },
                { slug: "react-form/form-events" },
                { slug: "react-form/submit-button" },
              ],
            },
            { slug: "react-form/validation-rules" },
            { slug: "react-form/react-native-usage" },
            { slug: "react-form/recipes" },
          ],
        },
        {
          label: "React Helmet",
          collapsed: true,
          items: [
            { slug: "react-helmet/overview" },
            { slug: "react-helmet/helmet" },
            { slug: "react-helmet/metadata" },
            { slug: "react-helmet/configuration" },
            { slug: "react-helmet/recipes" },
          ],
        },
        {
          label: "User",
          collapsed: true,
          items: [
            { slug: "user/overview" },
            { slug: "user/current-user" },
            { slug: "user/user-manager" },
            { slug: "user/permissions" },
            { slug: "user/cache-drivers" },
            { slug: "user/events" },
            { slug: "user/recipes" },
          ],
        },
        // ── Developer tooling ──
        // Standalone — installable in any TS project, not specific to @mongez/*.
        {
          label: "Vite",
          collapsed: true,
          items: [
            { slug: "vite/overview" },
            {
              label: "Env",
              items: [
                { slug: "vite/env-loading" },
                { slug: "vite/env-in-html" },
              ],
            },
            {
              label: "Build",
              items: [
                { slug: "vite/build-zip" },
                { slug: "vite/htaccess" },
                { slug: "vite/production-base-url" },
                { slug: "vite/prerender" },
              ],
            },
            {
              label: "DX",
              items: [
                { slug: "vite/auto-open-browser" },
                { slug: "vite/tsconfig-aliases" },
              ],
            },
            { slug: "vite/recipes" },
          ],
        },
        {
          label: "Pkgist",
          collapsed: true,
          items: [
            { slug: "pkgist/overview" },
            { slug: "pkgist/cli" },
            { slug: "pkgist/configuration" },
            { slug: "pkgist/package-options" },
            { slug: "pkgist/pipeline" },
            { slug: "pkgist/versioning" },
            { slug: "pkgist/git-workflow" },
            { slug: "pkgist/recipes" },
          ],
        },
        {
          label: "Copper",
          collapsed: true,
          items: [
            { slug: "copper/overview" },
            {
              label: "Core",
              items: [
                { slug: "copper/colors" },
                { slug: "copper/log" },
                { slug: "copper/box" },
              ],
            },
            {
              label: "Animation",
              items: [
                { slug: "copper/spinner" },
                { slug: "copper/progress" },
              ],
            },
            { slug: "copper/utilities" },
            { slug: "copper/recipes" },
          ],
        },
        {
          // Agent Kit splits into a developer-facing path (Overview →
          // Agent integrations → CLI → Recipes) and an author-facing
          // path (Authoring skills). Same package, two audiences.
          label: "Agent Kit",
          collapsed: true,
          items: [
            { slug: "agent-kit/overview" },
            { slug: "agent-kit/agent-integrations" },
            { slug: "agent-kit/cli-usage" },
            { slug: "agent-kit/recipes" },
            { slug: "agent-kit/authoring-skills" },
          ],
        },
      ],
    }),
  ],
});
