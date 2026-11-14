import assert from "node:assert/strict";
import test from "node:test";
import { boardEditorReducer, createEditorState, filterItems, HISTORY_LIMIT } from "../lib/board-editor.mjs";
import { createBoard, createItem, moveItem } from "../lib/tier-data.mjs";

test("undo restores a moved or removed cover without touching another board", () => {
  const first = createBoard("游戏", "", () => "first");
  const second = createBoard("动漫", "", () => "second");
  first.unranked = [createItem("作品", "original-cover", () => "item")];
  let state = createEditorState([first, second]);
  state = boardEditorReducer(state, { type: "edit", boardId: first.id, at: "moved", updater: (board) => moveItem(board, "item", "unranked", board.tiers[0].id, 0) });
  state = boardEditorReducer(state, { type: "edit", boardId: first.id, at: "removed", updater: (board) => ({ ...board, tiers: board.tiers.map((tier) => ({ ...tier, items: [] })) }) });
  state = boardEditorReducer(state, { type: "undo", boardId: first.id, at: "restored" });
  assert.equal(state.boards[0].tiers[0].items[0].imageId, "original-cover");
  state = boardEditorReducer(state, { type: "undo", boardId: first.id, at: "original" });
  assert.equal(state.boards[0].unranked[0].id, "item");
  assert.equal(state.boards[1], second);
});

test("undo preserves the original image after replacement; imports clear old history", () => {
  const board = createBoard("榜单", "", () => "board");
  board.unranked = [createItem("作品", "old-cover", () => "item")];
  const changed = boardEditorReducer(createEditorState([board]), { type: "edit", boardId: board.id, at: "changed", updater: (current) => ({ ...current, unranked: [{ ...current.unranked[0], imageId: "new-cover" }] }) });
  const undone = boardEditorReducer(changed, { type: "undo", boardId: board.id, at: "undone" });
  assert.equal(undone.boards[0].unranked[0].imageId, "old-cover");
  const imported = boardEditorReducer(changed, { type: "set", value: [board], resetHistory: true });
  assert.deepEqual(imported.history, {});
  assert.equal(boardEditorReducer(imported, { type: "undo", boardId: board.id }), imported);
});

test("history is bounded and search keeps original ordering and item identities", () => {
  const board = createBoard("游戏", "", () => "board");
  let state = createEditorState([board]);
  for (let index = 0; index < 40; index++) state = boardEditorReducer(state, { type: "edit", boardId: board.id, at: "now", updater: (current) => ({ ...current, title: String(index) }) });
  assert.equal(state.history[board.id].length, HISTORY_LIMIT);
  const items = [{ id: "1", name: "Elden Ring" }, { id: "2", name: "荒野大镖客" }, { id: "3", name: "ELDEN RING DLC" }];
  assert.deepEqual(filterItems(items, "  Elden  ").map((item) => item.id), ["1", "3"]);
  assert.equal(filterItems(items, "")[0], items[0]);
  assert.equal(filterItems(items, "荒野")[0], items[1]);
});
