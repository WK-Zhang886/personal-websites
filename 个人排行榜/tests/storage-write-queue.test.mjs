import assert from "node:assert/strict";
import test from "node:test";
import { createWriteQueue } from "../lib/storage-write-queue.mjs";

test("a replacement waits for in-flight saves and later writes wait for the replacement", async () => {
  const queue = createWriteQueue();
  const order = [];
  let finishSave;
  const pendingSave = new Promise((resolve) => { finishSave = resolve; });
  const saving = queue.enqueue(async () => { order.push("save-start"); await pendingSave; order.push("save-end"); });
  const restoring = queue.enqueue(async () => { order.push("restore"); });
  const afterRestore = queue.enqueue(async () => { order.push("new-save"); });
  await Promise.resolve();
  assert.deepEqual(order, ["save-start"]);
  finishSave();
  await Promise.all([saving, restoring, afterRestore, queue.flush()]);
  assert.deepEqual(order, ["save-start", "save-end", "restore", "new-save"]);
});

test("a failed save rejects its caller without blocking recovery or backup reads", async () => {
  const queue = createWriteQueue();
  await assert.rejects(queue.enqueue(async () => { throw new Error("quota"); }), /quota/);
  await queue.flush();
  assert.equal(await queue.enqueue(async () => "recovered"), "recovered");
});
