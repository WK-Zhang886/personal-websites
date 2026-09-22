import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("rank cards use a premium game-cover layout in editing mode", () => {
  assert.match(
    css,
    /\.item-lane\s*{[^}]*gap:\s*16px;[^}]*padding:\s*16px;/s,
  );
  assert.match(
    css,
    /\.rank-card\s*{[^}]*width:\s*132px;[^}]*height:\s*190px;[^}]*flex:\s*0\s+0\s+132px;[^}]*border-radius:\s*14px;/s,
  );
  assert.match(
    css,
    /@media \(max-width: 1280px\)[\s\S]*?\.rank-card\s*{[^}]*width:\s*118px;[^}]*height:\s*172px;[^}]*flex-basis:\s*118px;/,
  );
  assert.match(
    css,
    /@media \(max-height: 950px\)[\s\S]*?\.rank-card\s*{[^}]*width:\s*118px;[^}]*height:\s*172px;[^}]*flex-basis:\s*118px;/,
  );
});

test("showcase mode keeps a tight export poster layout", () => {
  assert.match(
    css,
    /\.is-showcase \.item-lane\s*{[^}]*gap:\s*0;[^}]*padding:\s*0;/s,
  );
  assert.match(
    css,
    /\.is-showcase \.rank-card\s*{[^}]*width:\s*68px;[^}]*height:\s*102px;[^}]*flex-basis:\s*68px;[^}]*border-radius:\s*0;/s,
  );
});
