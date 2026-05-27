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
        "A family of focused TypeScript packages for production apps — state management, routing, forms, utilities, localization, caching, and build tooling.",
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
        // ── Core state family ──
        {
          label: "Atom",
          collapsed: false,
          autogenerate: { directory: "atom" },
        },
        {
          label: "React Atom",
          collapsed: false,
          autogenerate: { directory: "react-atom" },
        },
        {
          label: "Atomic Query",
          collapsed: false,
          autogenerate: { directory: "atomic-query" },
        },
        // ── Foundations ──
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
        // ── Utilities ──
        {
          label: "Collection",
          collapsed: true,
          autogenerate: { directory: "collection" },
        },
        {
          label: "Cache",
          collapsed: true,
          autogenerate: { directory: "cache" },
        },
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
          label: "Concat Route",
          collapsed: true,
          autogenerate: { directory: "concat-route" },
        },
        {
          label: "Query String",
          collapsed: true,
          autogenerate: { directory: "query-string" },
        },
        {
          label: "DOM",
          collapsed: true,
          autogenerate: { directory: "dom" },
        },
        {
          label: "Localization",
          collapsed: true,
          autogenerate: { directory: "localization" },
        },
        // ── React adapters ──
        {
          label: "React Localization",
          collapsed: true,
          autogenerate: { directory: "react-localization" },
        },
        {
          label: "React Router",
          collapsed: true,
          autogenerate: { directory: "react-router" },
        },
        {
          label: "React Helmet",
          collapsed: true,
          autogenerate: { directory: "react-helmet" },
        },
        {
          label: "React Form",
          collapsed: true,
          autogenerate: { directory: "react-form" },
        },
        {
          label: "User",
          collapsed: true,
          autogenerate: { directory: "user" },
        },
        // ── Networking ──
        {
          label: "HTTP",
          collapsed: true,
          autogenerate: { directory: "http" },
        },
        // ── Build & AI tooling ──
        {
          label: "Vite",
          collapsed: true,
          autogenerate: { directory: "vite" },
        },
        {
          label: "Agent Kit",
          collapsed: true,
          autogenerate: { directory: "agent-kit" },
        },
        {
          label: "Pkgist",
          collapsed: true,
          autogenerate: { directory: "pkgist" },
        },
      ],
    }),
  ],
});
