import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../components/TierApp.jsx", import.meta.url),
  "utf8",
);
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("tier app copy presents the product as a personal taste ranking archive", () => {
  assert.match(source, /个人喜好排行/);
  assert.match(source, /MY TASTE TIERS/);
  assert.match(source, /PERSONAL RANKING/);
  assert.match(source, /MY TASTE RANKING/);
  assert.match(source, /PERSONAL PICKS/);
  assert.doesNotMatch(source, /个人游戏档案/);
  assert.doesNotMatch(source, /MY GAME ARCHIVE/);
  assert.doesNotMatch(source, /TIER ·/);
  assert.doesNotMatch(source, /tier-rank__sub/);
});

test("premium game archive CSS uses the approved dark palette and type stack", () => {
  assert.match(css, /--bg:\s*#090d12/i);
  assert.match(css, /--panel:\s*#151a21/i);
  assert.match(css, /--panel-2:\s*#1c232d/i);
  assert.match(css, /--accent:\s*#7c5cff/i);
  assert.match(css, /--accent-2:\s*#38bdf8/i);
  assert.match(css, /Space Grotesk/);
  assert.match(css, /HarmonyOS Sans/);
});

test("tier rows avoid spreadsheet framing and use premium game-card styling", () => {
  assert.doesNotMatch(css, /\.tier-rank__sub\s*{/);
  assert.match(css, /\.tier-row\s*{[\s\S]*?border-radius:\s*14px/);
  assert.match(css, /\.item-lane\s*{[\s\S]*?flex-wrap:\s*wrap/);
  assert.match(css, /\.rank-card\s*{[\s\S]*?width:\s*132px/);
  assert.match(css, /\.rank-card\s*{[\s\S]*?height:\s*190px/);
  assert.match(css, /\.rank-card\s*{[\s\S]*?border-radius:\s*14px/);
  assert.match(css, /\.rank-card\s*{[\s\S]*?box-shadow:/);
  assert.match(css, /\.rank-card:hover\s*{[\s\S]*?transform:\s*translateY\(-6px\) scale\(1\.025\)/);
});

test("laptop layout keeps the tier board adaptive without horizontal page overflow", () => {
  assert.match(css, /\.board-scroll\s*{[\s\S]*?overflow-x:\s*hidden/);
  assert.match(css, /\.tier-board\s*{[\s\S]*?gap:\s*14px/);
  assert.match(css, /@media \(max-width:\s*1280px\)[\s\S]*?\.rank-card\s*{[\s\S]*?width:\s*118px/);
  assert.match(css, /@media \(max-width:\s*1280px\)[\s\S]*?\.rank-card\s*{[\s\S]*?height:\s*172px/);
});
