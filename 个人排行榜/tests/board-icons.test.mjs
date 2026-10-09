import assert from "node:assert/strict";
import test from "node:test";
import { BOARD_ICONS, applyRequestedLegacyIcon, resolveBoardIcon } from "../lib/board-icons.mjs";
import { createBoard, createItem, moveItem, normalizeBoard } from "../lib/tier-data.mjs";
import { createBackupEnvelope, validateBackupEnvelope } from "../lib/backup-format.mjs";

test("older boards and unknown icon values use the generic icon without guessing from titles", () => {
  const oldBoard = createBoard("体育游戏动漫电影");
  delete oldBoard.icon;
  const restored = normalizeBoard(oldBoard);
  assert.equal(restored.icon, "layers");
  assert.equal(restored.title, oldBoard.title);
  assert.deepEqual(restored.tiers, oldBoard.tiers);
  for (const value of [undefined, null, "__proto__", "not-an-icon", {}]) {
    assert.equal(resolveBoardIcon(value), "layers");
  }
  for (const { id } of BOARD_ICONS) assert.equal(resolveBoardIcon(id), id);
});

test("chosen icons survive ranking changes, copying, and a JSON backup round trip", () => {
  const board = { ...createBoard("篮球榜"), icon: "basketball" };
  board.unranked.push(createItem("示例", "image-1", () => "item-1"));
  const ranked = moveItem(board, "item-1", "unranked", board.tiers[0].id, 0);
  const copy = structuredClone(ranked);
  copy.id = "copy";
  const backup = validateBackupEnvelope(JSON.parse(JSON.stringify(createBackupEnvelope([ranked, copy], []))));
  assert.equal(backup.boards[0].icon, "basketball");
  assert.equal(backup.boards[1].icon, "basketball");
  assert.equal(normalizeBoard(backup.boards[0]).icon, "basketball");
  assert.equal(backup.boards[0].tiers[0].items[0].id, "item-1");
});

test("the two requested legacy boards receive icons without changing ranking data or later choices", () => {
  for (const [title, icon] of [["游戏个人喜好", "game"], ["动漫（全）", "anime"], ["动漫(全)", "anime"]]) {
    const board = createBoard(title);
    delete board.icon;
    board.unranked.push(createItem("保留作品", "existing-image", () => "existing-item"));
    const migrated = applyRequestedLegacyIcon(board);
    assert.deepEqual(migrated, { ...board, icon });
    assert.equal(applyRequestedLegacyIcon(migrated), migrated);
    const selected = { ...migrated, icon: "layers" };
    assert.equal(applyRequestedLegacyIcon(selected), selected);
  }
  const other = createBoard("新的游戏榜单");
  delete other.icon;
  assert.equal(applyRequestedLegacyIcon(other), other);
});
