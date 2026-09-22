const DEFAULT_TIERS = [
  ["S", "#ff6b6b"],
  ["A", "#ff9f43"],
  ["B", "#feca57"],
  ["C", "#48dbb4"],
  ["D", "#54a0ff"],
];

function defaultId() {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function now() {
  return new Date().toISOString();
}

export function createTier(label, color, idFactory = defaultId) {
  return {
    id: idFactory(),
    label: label.trim() || "未命名",
    color,
    items: [],
  };
}

export function createItem(name, imageId, idFactory = defaultId) {
  return {
    id: idFactory(),
    name: name.trim() || "未命名",
    imageId,
  };
}

export function createBoard(
  title,
  category = "其他",
  idFactory = defaultId,
) {
  const createdAt = now();
  return {
    id: idFactory(),
    title: title.trim() || "未命名榜单",
    category: category.trim() || "其他",
    createdAt,
    updatedAt: createdAt,
    tiers: DEFAULT_TIERS.map(([label, color]) =>
      createTier(label, color, defaultId)
    ),
    unranked: [],
  };
}

export function normalizeBoard(input) {
  const board = input && typeof input === "object" ? input : {};
  return {
    id: String(board.id || defaultId()),
    title: String(board.title || "未命名榜单"),
    category: String(board.category || "其他"),
    createdAt: String(board.createdAt || now()),
    updatedAt: String(board.updatedAt || now()),
    tiers: Array.isArray(board.tiers)
      ? board.tiers.map((tier) => ({
        id: String(tier?.id || defaultId()),
        label: String(tier?.label || "未命名"),
        color: String(tier?.color || "#7b8594"),
        items: Array.isArray(tier?.items) ? tier.items : [],
      }))
      : [],
    unranked: Array.isArray(board.unranked) ? board.unranked : [],
  };
}

export function renameTier(board, tierId, label) {
  return {
    ...board,
    updatedAt: now(),
    tiers: board.tiers.map((tier) =>
      tier.id === tierId
        ? { ...tier, label: label.trim() || "未命名" }
        : tier
    ),
  };
}

function takeFromContainer(board, containerId, itemId) {
  if (containerId === "unranked") {
    const index = board.unranked.findIndex((item) => item.id === itemId);
    if (index < 0) return null;
    const items = [...board.unranked];
    const [item] = items.splice(index, 1);
    return { item, board: { ...board, unranked: items } };
  }

  const tierIndex = board.tiers.findIndex((tier) => tier.id === containerId);
  if (tierIndex < 0) return null;
  const itemIndex = board.tiers[tierIndex].items.findIndex(
    (item) => item.id === itemId,
  );
  if (itemIndex < 0) return null;
  const tiers = board.tiers.map((tier) => ({ ...tier, items: [...tier.items] }));
  const [item] = tiers[tierIndex].items.splice(itemIndex, 1);
  return { item, board: { ...board, tiers } };
}

export function moveItem(board, itemId, fromId, toId, targetIndex) {
  const taken = takeFromContainer(board, fromId, itemId);
  if (!taken) return board;

  const moved = {
    ...taken.board,
    tiers: taken.board.tiers.map((tier) => ({
      ...tier,
      items: [...tier.items],
    })),
    unranked: [...taken.board.unranked],
    updatedAt: now(),
  };

  const target = toId === "unranked"
    ? moved.unranked
    : moved.tiers.find((tier) => tier.id === toId)?.items;
  if (!target) return board;

  const safeIndex = Math.max(0, Math.min(Number(targetIndex), target.length));
  target.splice(safeIndex, 0, taken.item);
  return moved;
}

