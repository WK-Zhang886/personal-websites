import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const tierAppSource = await readFile(
  new URL("../components/TierApp.jsx", import.meta.url),
  "utf8",
);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the personal taste ranking workspace", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>我的评分宇宙<\/title>/i);
  assert.match(html, /个人喜好排行/);
  assert.match(html, /MY TASTE TIERS/);
  assert.match(html, /上传封面/);
  assert.match(html, /新建榜单/);
  assert.doesNotMatch(html, /动漫 · 0 项/);
  assert.doesNotMatch(html, />动漫</);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/);
  assert.doesNotMatch(html, /react-loading-skeleton/);
});

test("tier app accepts pasted clipboard images", () => {
  assert.match(tierAppSource, /getClipboardImageFiles/);
  assert.match(tierAppSource, /addEventListener\("paste"/);
  assert.match(tierAppSource, /event\.preventDefault\(\)/);
  assert.match(tierAppSource, /已添加.*张截图/);
});
