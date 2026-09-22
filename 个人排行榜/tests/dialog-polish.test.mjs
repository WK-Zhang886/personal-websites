import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../components/TierApp.jsx", import.meta.url),
  "utf8",
);
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("dialogs expose archive metadata and inline item deletion confirmation", () => {
  assert.match(source, /NEW COLLECTION/);
  assert.match(source, /EDIT COVER/);
  assert.match(source, /dialog__danger/);
  assert.match(source, /deleteArmed/);
  assert.match(source, /确认删除/);
  assert.match(source, /onKeyDown={[\s\S]*?event\.key === "Enter"/);

  const itemSaveHandler = source.match(
    /const saveEditedItem = \([\s\S]*?\n  const openItemEditor/,
  )?.[0];

  assert.ok(itemSaveHandler, "item save handler should be present");
  assert.doesNotMatch(itemSaveHandler, /window\.confirm/);
});

test("dialog CSS separates destructive actions and improves spacing", () => {
  assert.match(css, /\.dialog__eyebrow\s*{/);
  assert.match(css, /\.dialog__description\s*{/);
  assert.match(css, /\.dialog__danger\s*{/);
  assert.match(css, /\.dialog__danger-copy\s*{/);
  assert.match(css, /\.button--danger-confirm\s*{/);
  assert.match(css, /\.field input,[\s\S]*?height:\s*44px/);
  assert.match(css, /@media \(max-width: 520px\)[\s\S]*?\.dialog__danger\s*{[\s\S]*?flex-direction:\s*column/);
});
