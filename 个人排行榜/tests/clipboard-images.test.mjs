import assert from "node:assert/strict";
import test from "node:test";

import { getClipboardImageFiles } from "../lib/clipboard-images.mjs";

function clipboardItem(type, file) {
  return {
    kind: "file",
    type,
    getAsFile: () => file,
  };
}

test("clipboard image extraction keeps every valid image file", () => {
  const png = { name: "screenshot.png" };
  const jpeg = { name: "copied-photo.jpg" };

  assert.deepEqual(
    getClipboardImageFiles([
      clipboardItem("image/png", png),
      clipboardItem("image/jpeg", jpeg),
    ]),
    [png, jpeg],
  );
});

test("clipboard image extraction ignores text, non-images, and null files", () => {
  assert.deepEqual(
    getClipboardImageFiles([
      { kind: "string", type: "text/plain", getAsFile: () => null },
      clipboardItem("application/pdf", { name: "notes.pdf" }),
      clipboardItem("image/png", null),
    ]),
    [],
  );
  assert.deepEqual(getClipboardImageFiles(null), []);
});
