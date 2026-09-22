import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../components/TierApp.jsx", import.meta.url),
  "utf8",
);
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("tier app exposes the premium personal ranking visual language", () => {
  assert.match(source, /MY TASTE TIERS/);
  assert.match(source, /个人喜好排行/);
  assert.match(source, /COLLECTIONS/);
  assert.match(source, /PERSONAL RANKING/);
  assert.match(source, /LAST UPDATE/);
  assert.match(source, /tier-label__index/);
  assert.doesNotMatch(source, /tier-rank__sub/);
  assert.match(source, /CTRL \+ V 直接粘贴截图/);
});

test("premium game archive CSS uses the approved visual system", () => {
  assert.match(css, /--bg:\s*#090d12/i);
  assert.match(css, /--accent:\s*#7c5cff/i);
  assert.match(css, /--accent-2:\s*#38bdf8/i);
  assert.match(css, /\.board-tab__index\s*{/);
  assert.match(css, /\.board-frame__identity\s*{/);
  assert.match(css, /\.paste-hint\s*{/);
  assert.match(css, /::\-webkit-scrollbar/);
  assert.match(css, /\.tier-row\s*{[\s\S]*?border-radius:\s*14px/);
});
