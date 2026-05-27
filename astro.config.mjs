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

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    starlight({
      title: "Mongez",
      description:
        "Production TypeScript packages for state, routing, forms, networking, configuration, encryption, and more — 24 focused packages, designed to read equally well to humans and AI coding agents.",
      logo: { src: "./src/assets/logo.svg", replacesTitle: false },
      // Starlight 0.30 uses the object form `{ github: url }`.
      // The array form `[{ icon, label, href }]` only landed in 0.32+.
      social: {
        github: "https://github.com/hassanzohdy",
      },
      customCss: ["./src/styles/global.css"],
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
          autogenerate: { directory: "events" },
        },
        {
          label: "Reinforcements",
          collapsed: true,
          autogenerate: { directory: "reinforcements" },
        },
        {
          label: "Supportive Is",
          collapsed: true,
          autogenerate: { directory: "supportive-is" },
        },
        {
          label: "Collection",
          collapsed: true,
          autogenerate: { directory: "collection" },
        },
        // ── State ──
        {
          label: "Atom",
          collapsed: true,
          autogenerate: { directory: "atom" },
        },
        {
          label: "React Atom",
          collapsed: true,
          autogenerate: { directory: "react-atom" },
        },
        {
          label: "Atomic Query",
          collapsed: true,
          autogenerate: { directory: "atomic-query" },
        },
        // ── Data & Networking ──
        {
          label: "HTTP",
          collapsed: true,
          autogenerate: { directory: "http" },
        },
        {
          label: "Cache",
          collapsed: true,
          autogenerate: { directory: "cache" },
        },
        // ── Infrastructure ──
        {
          label: "Config",
          collapsed: true,
          autogenerate: { directory: "config" },
        },
        {
          label: "Dotenv",
          collapsed: true,
          autogenerate: { directory: "dotenv" },
        },
        {
          label: "Encryption",
          collapsed: true,
          autogenerate: { directory: "encryption" },
        },
        {
          label: "DOM",
          collapsed: true,
          autogenerate: { directory: "dom" },
        },
        {
          label: "Concat Route",
          collapsed: true,
          autogenerate: { directory: "concat-route" },
        },
        {
          label: "Query String",
          collapsed: true,
          autogenerate: { directory: "query-string" },
        },
        // ── Internationalisation ──
        {
          label: "Localization",
          collapsed: true,
          autogenerate: { directory: "localization" },
        },
        {
          label: "React Localization",
          collapsed: true,
          autogenerate: { directory: "react-localization" },
        },
        // ── React ──
        {
          label: "React Router",
          collapsed: true,
          autogenerate: { directory: "react-router" },
        },
        {
          label: "React Form",
          collapsed: true,
          autogenerate: { directory: "react-form" },
        },
        {
          label: "React Helmet",
          collapsed: true,
          autogenerate: { directory: "react-helmet" },
        },
        {
          label: "User",
          collapsed: true,
          autogenerate: { directory: "user" },
        },
        // ── Build & AI tooling ──
        // Standalone — installable in any TS project, not specific to @mongez/*.
        {
          label: "Vite",
          collapsed: true,
          autogenerate: { directory: "vite" },
        },
        {
          label: "Pkgist",
          collapsed: true,
          autogenerate: { directory: "pkgist" },
        },
        {
          label: "Agent Kit",
          collapsed: true,
          autogenerate: { directory: "agent-kit" },
        },
      ],
    }),
  ],
});
