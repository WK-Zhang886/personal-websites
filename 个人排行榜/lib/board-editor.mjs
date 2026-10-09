export const HISTORY_LIMIT = 30;

export function createEditorState(boards) {
  return { boards, history: {} };
}

export function boardEditorReducer(state, action) {
  if (action.type === "set") {
    const boards = typeof action.value === "function" ? action.value(state.boards) : action.value;
    const history = action.resetHistory ? {} : Object.fromEntries(
      Object.entries(state.history).filter(([id]) => boards.some((board) => board.id === id)),
    );
    return { boards, history };
  }
  const board = state.boards.find((entry) => entry.id === action.boardId);
  if (!board) return state;
  const previous = state.history[board.id] || [];
  if (action.type === "edit") {
    const next = typeof action.updater === "function" ? action.updater(board) : action.updater;
    if (next === board) return state;
    return {
      boards: state.boards.map((entry) => entry.id === board.id ? { ...next, updatedAt: action.at } : entry),
      history: { ...state.history, [board.id]: [...previous, board].slice(-HISTORY_LIMIT) },
    };
  }
  if (action.type === "undo" && previous.length) {
    return {
      boards: state.boards.map((entry) => entry.id === board.id
        ? { ...previous.at(-1), updatedAt: action.at }
        : entry),
      history: { ...state.history, [board.id]: previous.slice(0, -1) },
    };
  }
  return state;
}

export function filterItems(items, query) {
  const text = query.trim().toLocaleLowerCase();
  return text ? items.filter((item) => item.name.toLocaleLowerCase().includes(text)) : items;
}
