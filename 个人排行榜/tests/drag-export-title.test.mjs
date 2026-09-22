import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../components/TierApp.jsx", import.meta.url),
  "utf8",
);
const sortableSource = await readFile(
  new URL("../components/SortableLane.jsx", import.meta.url),
  "utf8",
);
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("export captures the archive header together with the tier table", () => {
  assert.match(source, /const boardExportRef = useRef\(null\)/);
  assert.match(source, /exportNodeAsTightPng\(boardExportRef\.current\)/);
  assert.match(source, /function exportNodeAsTightPng/);
  assert.match(source, /node\.cloneNode\(true\)/);
  assert.match(source, /wrapper\.style\.inset = "0 auto auto 0"/);
  assert.match(source, /<div className="board-frame" ref=\{boardExportRef\}>/);
  assert.match(source, /MY TASTE RANKING/);
  assert.match(source, /showcase-stats/);
  assert.doesNotMatch(source, /ref=\{tierBoardExportRef\}/);
});

test("new boards are appended to the end of the list", () => {
  assert.match(source, /setBoards\(\(current\) => \[\.\.\.current, board\]\)/);
  assert.doesNotMatch(source, /setBoards\(\(current\) => \[board, \.\.\.current\]\)/);
});

test("rank cards remain easy to drag from their cover or title area", () => {
  assert.match(sortableSource, /onPointerDown=\{handlePointerDown\}/);
  assert.match(sortableSource, /window\.addEventListener\("pointermove"/);
  assert.match(sortableSource, /window\.addEventListener\("pointerup"/);
  assert.match(sortableSource, /document\.elementFromPoint/);
  assert.match(sortableSource, /getDropIndex\(targetLane/);
  assert.match(sortableSource, /rank-card-drag-preview/);
  assert.match(sortableSource, /transform = `translate3d\(\$\{.*?\}px, \$\{.*?\}px, 0\)`/s);
  assert.match(css, /\.rank-card img,\s*\n\.rank-card__placeholder\s*{[\s\S]*?pointer-events:\s*none/);
  assert.match(css, /\.rank-card__name\s*{[\s\S]*?pointer-events:\s*none/);
  assert.match(css, /\.rank-card__menu\s*{[\s\S]*?pointer-events:\s*auto/);
});

test("rank card names stay hidden until hover or keyboard focus", () => {
  assert.match(css, /\.rank-card__name\s*{[\s\S]*?opacity:\s*0/);
  assert.match(css, /\.rank-card:hover \.rank-card__name,\s*\n\.rank-card:focus-within \.rank-card__name\s*{[\s\S]*?opacity:\s*1/);
  assert.match(css, /@media \(max-width:\s*820px\)[\s\S]*?\.rank-card__menu\s*{\s*opacity:\s*1/);
  assert.doesNotMatch(css, /@media \(max-width:\s*820px\)[\s\S]*?\.rank-card__menu,\s*\n\s*\.rank-card__name\s*{[\s\S]*?opacity:\s*1/);
});

test("board titles can be edited directly without looking like admin form fields", () => {
  assert.match(source, /className="board-title"/);
  assert.match(source, /title="点击或双击修改标题"/);
  assert.match(source, /aria-label="榜单名称"/);
  assert.match(source, /className="board-tab__rename"/);
});
