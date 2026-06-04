---
title: "Changelog"
sidebar:
  order: 900
  label: "Changelog"
---

All notable changes to `@mongez/http` are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



<details class="changelog-version" open>
<summary><span class="cl-version">[3.3.8]</span> <span class="cl-date">2026-06-04</span> <span class="cl-counts">Changed 2</span></summary>

### Changed

- **Skills now state the response-typing rule explicitly.** The `http-client` skill gained a *"Type the response — always pass a generic"* section: every verb is `get<T = unknown>(…)`, so omitting the type leaves `data` as `unknown` and `data.first_name` won't compile — always call `http.get<User>(…)` and narrow on `error` first. Mirrored into `llms-full.txt`.
- **Sharper skill triggers.** The `overview` and `http-client` skill descriptions now fire on *making HTTP/API requests*, *replacing axios/fetch*, and *typing a response*, so an agent loads them instead of reverse-engineering usage from source. No code/API changes.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[3.3.7]</span> <span class="cl-counts">Changed 1</span></summary>

### Changed

- **`llms.txt` blurb now uses the `>` blockquote convention** to match every other `@mongez/*` package, so the ecosystem index extracts it consistently. No code/API changes.

</details>


<details class="changelog-version">
<summary><span class="cl-version">[3.3.6]</span> <span class="cl-counts">Added 1</span></summary>

### Added

- This changelog. No code changes — the package remains the fetch-based HTTP client with the `{ data, error }` result type, per-request cancellation, GET deduplication + retry, response caching, before/after interceptors, lifecycle events, and the `Resource` CRUD helper.

> Version history prior to 3.3.6 is available via the git tags and GitHub releases on [hassanzohdy/mongez-http](https://github.com/hassanzohdy/mongez-http). Future releases will be documented here.

</details>
