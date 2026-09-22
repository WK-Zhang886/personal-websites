import assert from "node:assert/strict";
import test from "node:test";

import {
  createBackupEnvelope,
  validateBackupEnvelope,
} from "../lib/backup-format.mjs";

test("backup envelopes preserve boards and images in a versioned format", () => {
  const payload = createBackupEnvelope(
    [{ id: "board-1", title: "动画榜", tiers: [], unranked: [] }],
    [{ id: "image-1", type: "image/webp", data: "YWJj" }],
    () => "2026-07-30T00:00:00.000Z",
  );

  assert.equal(payload.kind, "personal-tier-list-backup");
  assert.equal(payload.version, 1);
  assert.equal(payload.exportedAt, "2026-07-30T00:00:00.000Z");
  assert.equal(payload.boards[0].title, "动画榜");
  assert.equal(payload.images[0].data, "YWJj");
});

test("invalid backup files are rejected before they can replace existing data", () => {
  assert.throws(
    () => validateBackupEnvelope({ kind: "unknown", version: 1 }),
    /不是有效的个人评分备份/,
  );
  assert.throws(
    () =>
      validateBackupEnvelope({
        kind: "personal-tier-list-backup",
        version: 99,
        boards: [],
        images: [],
      }),
    /暂不支持这个备份版本/,
  );
});

