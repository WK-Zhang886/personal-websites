import assert from "node:assert/strict";
import test from "node:test";

import { nameFromFilename } from "../lib/image-utils.mjs";

test("uploaded filenames become readable card names", () => {
  assert.equal(nameFromFilename("elden-ring_cover-final.webp"), "elden ring");
  assert.equal(nameFromFilename("  千与千寻.PNG"), "千与千寻");
});

test("blank filenames still produce a usable name", () => {
  assert.equal(nameFromFilename(".jpg"), "未命名");
});

