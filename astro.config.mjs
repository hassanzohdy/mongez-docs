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
      // Injected into every page's <head>. Google Search Console site
      // verification for mongez.js.org.
      head: [
        {
          tag: "meta",
          attrs: {
            name: "google-site-verification",
            content: "ARcACUyhaNj7uvsLp5qhjGhzWvOQMqX9ZGxS8wpHT0I",
          },
        },
        // Link-preview image (Open Graph + Twitter) so WhatsApp / X / Slack /
        // Discord render a banner. Absolute URL, 1200×630, ~51KB JPEG (well
        // under WhatsApp's preview size limit). Starlight already emits the
        // og:title/description/url + twitter:card tags; this adds the image.
        { tag: "meta", attrs: { property: "og:image", content: "https://mongez.js.org/og.jpg" } },
        { tag: "meta", attrs: { property: "og:image:secure_url", content: "https://mongez.js.org/og.jpg" } },
        { tag: "meta", attrs: { property: "og:image:type", content: "image/jpeg" } },
        { tag: "meta", attrs: { property: "og:image:width", content: "1200" } },
        { tag: "meta", attrs: { property: "og:image:height", content: "630" } },
        { tag: "meta", attrs: { property: "og:image:alt", content: "Mongez — production TypeScript packages" } },
        { tag: "meta", attrs: { name: "twitter:image", content: "https://mongez.js.org/og.jpg" } },
      ],
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
        {
          // AI Agent Kit leads the sidebar — it's the flagship, most-marketed
          // package. Splits into a developer-facing path (Overview → Agent
          // integrations → CLI → Recipes) and an author-facing path
          // (Authoring skills). Same package, two audiences.
          label: "AI Agent Kit",
          collapsed: true,
          items: [
            { slug: "agent-kit/overview" },
            { slug: "agent-kit/agent-integrations" },
            { slug: "agent-kit/cli-usage" },
            { slug: "agent-kit/configuration" },
            { slug: "agent-kit/monorepos" },
            { slug: "agent-kit/recipes" },
            { slug: "agent-kit/authoring-skills" },
            { slug: "agent-kit/troubleshooting" },
            { slug: "agent-kit/changelog" },
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
            { slug: "events/changelog" },
          ],
        },
        {
          label: "Reinforcements",
          collapsed: true,
          items: [
            { slug: "reinforcements/overview" },
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
            { slug: "reinforcements/recipes" },
            { slug: "reinforcements/changelog" },
          ],
        },
        {
          label: "Supportive Is",
          collapsed: true,
          items: [
            { slug: "supportive-is/overview" },
            { slug: "supportive-is/primitives" },
            { slug: "supportive-is/collections" },
            { slug: "supportive-is/formats" },
            { slug: "supportive-is/environment" },
            { slug: "supportive-is/misc" },
            { slug: "supportive-is/recipes" },
            { slug: "supportive-is/changelog" },
          ],
        },
        {
          label: "Collection",
          collapsed: true,
          items: [
            { slug: "collection/overview" },
            { slug: "collection/construction" },
            { slug: "collection/builtins" },
            { slug: "collection/querying" },
            { slug: "collection/where" },
            { slug: "collection/sort-group" },
            { slug: "collection/pagination" },
            { slug: "collection/math" },
            { slug: "collection/transforming" },
            { slug: "collection/mutation" },
            { slug: "collection/strings" },
            { slug: "collection/recipes" },
            { slug: "collection/changelog" },
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
            { slug: "atom/changelog" },
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
            { slug: "react-atom/changelog" },
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
            { slug: "atomic-query/changelog" },
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
            { slug: "http/changelog" },
          ],
        },
        {
          label: "Cache",
          collapsed: true,
          items: [
            { slug: "cache/overview" },
            { slug: "cache/basic-usage" },
            { slug: "cache/manager" },
            { slug: "cache/drivers" },
            { slug: "cache/local-storage" },
            { slug: "cache/session-storage" },
            { slug: "cache/runtime" },
            { slug: "cache/custom-drivers" },
            { slug: "cache/encrypted-cache" },
            { slug: "cache/recipes" },
            { slug: "cache/changelog" },
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
            { slug: "config/changelog" },
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
            { slug: "dotenv/changelog" },
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
            { slug: "encryption/changelog" },
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
            { slug: "dom/changelog" },
          ],
        },
        {
          label: "Concat Route",
          collapsed: true,
          items: [
            { slug: "concat-route/overview" },
            { slug: "concat-route/concat-route" },
            { slug: "concat-route/recipes" },
            { slug: "concat-route/changelog" },
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
            { slug: "query-string/changelog" },
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
            { slug: "localization/changelog" },
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
            { slug: "react-localization/changelog" },
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
            { slug: "react-router/changelog" },
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
            { slug: "react-form/changelog" },
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
            { slug: "react-helmet/changelog" },
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
            { slug: "user/changelog" },
          ],
        },
        // ── Developer tooling ──
        // Standalone — installable in any TS project, not specific to @mongez/*.
        {
          label: "Vite",
          collapsed: true,
          items: [
            { slug: "vite/overview" },
            { slug: "vite/env-loading" },
            { slug: "vite/env-in-html" },
            { slug: "vite/production-base-url" },
            { slug: "vite/build-zip" },
            { slug: "vite/htaccess" },
            { slug: "vite/prerender" },
            { slug: "vite/tsconfig-aliases" },
            { slug: "vite/auto-open-browser" },
            { slug: "vite/recipes" },
            { slug: "vite/changelog" },
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
            { slug: "pkgist/changelog" },
          ],
        },
        {
          label: "Copper",
          collapsed: true,
          items: [
            { slug: "copper/overview" },
            { slug: "copper/colors" },
            { slug: "copper/log" },
            { slug: "copper/box" },
            { slug: "copper/spinner" },
            { slug: "copper/progress" },
            { slug: "copper/utilities" },
            { slug: "copper/recipes" },
            { slug: "copper/changelog" },
          ],
        },
      ],
    }),
  ],
});
