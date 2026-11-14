import assert from "node:assert/strict";
import test from "node:test";

import {
  createBoard,
  createItem,
  moveItem,
  normalizeBoard,
  renameTier,
} from "../lib/tier-data.mjs";

test("new boards include five ordered default tiers and an unranked pool", () => {
  const board = createBoard("我的游戏榜", "游戏", () => "fixed-id");

  assert.equal(board.title, "我的游戏榜");
  assert.equal(board.category, "游戏");
  assert.deepEqual(
    board.tiers.map((tier) => tier.label),
    ["S", "A", "B", "C", "D"],
  );
  assert.deepEqual(board.unranked, []);
});

test("tier labels accept Chinese ranking language", () => {
  const board = createBoard("动画总榜", "动漫");
  const tierId = board.tiers[0].id;

  const renamed = renameTier(board, tierId, "夯");

  assert.equal(renamed.tiers[0].label, "夯");
  assert.equal(board.tiers[0].label, "S");
});

test("moving an item removes it from the source and inserts it at the target index", () => {
  const board = createBoard("电影榜", "电影");
  const first = createItem("沙丘", "image-1", () => "item-1");
  const second = createItem("银翼杀手", "image-2", () => "item-2");
  board.unranked = [first, second];

  const moved = moveItem(board, "item-2", "unranked", board.tiers[0].id, 0);

  assert.deepEqual(moved.unranked.map((item) => item.id), ["item-1"]);
  assert.deepEqual(moved.tiers[0].items.map((item) => item.id), ["item-2"]);
});

test("reordering inside one lane preserves every item exactly once", () => {
  const board = createBoard("重排测试", "");
  board.unranked = [
    createItem("一", "image-1", () => "item-1"),
    createItem("二", "image-2", () => "item-2"),
    createItem("三", "image-3", () => "item-3"),
  ];

  const moved = moveItem(board, "item-1", "unranked", "unranked", 2);

  assert.deepEqual(
    moved.unranked.map((item) => item.id),
    ["item-2", "item-3", "item-1"],
  );
  assert.equal(new Set(moved.unranked.map((item) => item.id)).size, 3);
});

test("normalization repairs missing tier arrays without discarding user labels", () => {
  const normalized = normalizeBoard({
    id: "board-1",
    title: "自定义榜",
    category: "其他",
    tiers: [{ id: "tier-1", label: "拉", color: "#7b8594" }],
  });

  assert.deepEqual(normalized.unranked, []);
  assert.deepEqual(normalized.tiers[0].items, []);
  assert.equal(normalized.tiers[0].label, "拉");
});
