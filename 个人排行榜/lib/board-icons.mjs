export const DEFAULT_BOARD_ICON = "layers";

export const BOARD_ICONS = [
  { id: "game", label: "游戏" },
  { id: "anime", label: "动漫" },
  { id: "movie", label: "电影" },
  { id: "trophy", label: "奖杯" },
  { id: "basketball", label: "篮球" },
  { id: "football", label: "足球" },
  { id: "cycling", label: "骑行" },
  { id: "running", label: "跑步" },
  { id: "outdoors", label: "户外" },
  { id: "music", label: "音乐" },
  { id: "book", label: "阅读" },
  { id: "layers", label: "通用" },
];

export function resolveBoardIcon(value) {
  return BOARD_ICONS.some((icon) => icon.id === value) ? value : DEFAULT_BOARD_ICON;
}

// These two existing boards were explicitly assigned icons by the user.
// Boards that already have an icon keep their choice; new titles are not guessed.
export function applyRequestedLegacyIcon(board) {
  if (board.icon != null) return board;
  const requestedIcons = new Map([
    ["游戏个人喜好", "game"],
    ["动漫（全）", "anime"],
    ["动漫(全)", "anime"],
  ]);
  const icon = requestedIcons.get(board.title);
  return icon ? { ...board, icon } : board;
}
