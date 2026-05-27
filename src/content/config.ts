/**
 * Astro content collection config.
 *
 * Starlight provides its own collection schema. We extend it later when
 * we need per-package frontmatter fields (sidebar order, version pickers,
 * etc.) — for now the defaults are enough.
 */
import { defineCollection } from "astro:content";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";

export const collections = {
  docs: defineCollection({
    loader: docsLoader(),
    schema: docsSchema(),
  }),
};
