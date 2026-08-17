import { describe, expect, it } from "vitest";
import { accordionizeChangelog, escapeHtml } from "./sync-skills";

describe("escapeHtml", () => {
  it("escapes &, <, > characters", () => {
    expect(escapeHtml("<script>alert(1)</script> & co")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt; &amp; co",
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("v1.2.3")).toBe("v1.2.3");
  });
});

describe("accordionizeChangelog", () => {
  it("escapes a version/label containing <, >, & before embedding it in the <details> HTML", () => {
    const body = [
      "## [<script>alert(1)</script>] - 2026-01-01 - A & B <b>bold</b>",
      "",
      "### Fixed",
      "- something",
    ].join("\n");

    const output = accordionizeChangelog(body);

    expect(output).not.toContain("<script>alert(1)</script>");
    expect(output).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(output).toContain("A &amp; B &lt;b&gt;bold&lt;/b&gt;");
  });
});
