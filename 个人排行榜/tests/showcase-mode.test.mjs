import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../components/TierApp.jsx", import.meta.url),
  "utf8",
);
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("tier app exposes a presentation showcase mode", () => {
  assert.match(source, /展示模式/);
  assert.match(source, /编辑模式/);
  assert.match(source, /is-showcase/);
  assert.match(source, /setShowcaseMode\(true\)/);
  assert.match(source, /setShowcaseMode\(previous => !previous\)/);
});

test("showcase export temporarily renders the board as a finished poster", () => {
  const exportFunction = source.match(
    /const exportBoardImage = async \(\) => \{[\s\S]*?\n  \};/,
  )?.[0] || "";

  assert.match(exportFunction, /const wasShowcaseMode = showcaseMode/);
  assert.match(exportFunction, /exportNodeAsTightPng\(boardExportRef\.current\)/);
  assert.doesNotMatch(exportFunction, /tierBoardExportRef\.current/);
  assert.match(exportFunction, /setShowcaseMode\(true\)/);
  assert.match(exportFunction, /await new Promise/);
  assert.match(exportFunction, /setShowcaseMode\(wasShowcaseMode\)/);
});

test("showcase CSS creates a polished archive poster layout", () => {
  assert.match(css, /\.showcase-switch\s*{/);
  assert.match(css, /\.showcase-badge\s*{/);
  assert.match(css, /\.showcase-stat\s*{/);
  assert.match(css, /\.app-shell\.is-showcase\s*{/);
  assert.match(css, /\.is-showcase \.board-frame\s*{/);
  assert.match(css, /\.is-showcase \.tier-row\s*{/);
  assert.match(css, /\.is-showcase \.rank-card\s*{/);
  assert.match(css, /\.is-showcase \.unranked--dock\s*{/);
});
