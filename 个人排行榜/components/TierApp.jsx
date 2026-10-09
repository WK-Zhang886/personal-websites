"use client";

import {
  ArrowDown,
  ArrowUp,
  Bike,
  BookOpen,
  Check,
  ChevronDown,
  Clapperboard,
  Copy,
  FileDown,
  FileUp,
  Footprints,
  Gamepad2,
  ImageDown,
  ImagePlus,
  Layers3,
  MoreHorizontal,
  Mountain,
  Music2,
  Palette,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Tv,
  Upload,
  Undo2,
  X,
} from "lucide-react";
import { toPng } from "html-to-image";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { boardEditorReducer, createEditorState, filterItems } from "../lib/board-editor.mjs";

import {
  createBoard,
  createItem,
  createTier,
  moveItem,
} from "../lib/tier-data.mjs";
import {
  createBackupEnvelope,
  validateBackupEnvelope,
} from "../lib/backup-format.mjs";
import { getClipboardImageFiles } from "../lib/clipboard-images.mjs";
import { createThumbnail } from "../lib/image-utils.mjs";
import {
  getImage,
  flushWrites,
  listBoards,
  listImages,
  putImage,
  removeBoard,
  replaceEverything,
  saveBoard,
  saveBoards,
} from "../lib/storage";
import { SortableLane } from "./SortableLane";
import { BOARD_ICONS, DEFAULT_BOARD_ICON, resolveBoardIcon } from "../lib/board-icons.mjs";

function BasketballIcon({ size = 22, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3v18M5.6 5.6a9 9 0 0 1 0 12.8M18.4 5.6a9 9 0 0 0 0 12.8" />
    </svg>
  );
}

function FootballIcon({ size = 22, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 8 4 3-1.5 4.5h-5L8 11Z M12 8V3m4 8 4.5-1.5m-6 6 3 3m-8-3-3 3M8 11 3.5 9.5" />
    </svg>
  );
}

const BOARD_ICON_COMPONENTS = {
  game: Gamepad2,
  anime: Tv,
  movie: Clapperboard,
  trophy: Trophy,
  basketball: BasketballIcon,
  football: FootballIcon,
  cycling: Bike,
  running: Footprints,
  outdoors: Mountain,
  music: Music2,
  book: BookOpen,
  layers: Layers3,
};

function BoardIcon({ icon, size = 22 }) {
  const Icon = BOARD_ICON_COMPONENTS[resolveBoardIcon(icon)];
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}

const TIER_COLORS = [
  "#ff6b6b",
  "#ff9f43",
  "#feca57",
  "#48dbb4",
  "#54a0ff",
  "#a87ff3",
  "#7b8594",
];

const PREVIEW_BOARD = {
  id: "preview-board",
  title: "我的第一张榜单",
  category: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  tiers: [
    { id: "preview-s", label: "S", color: "#ff6b6b", items: [] },
    { id: "preview-a", label: "A", color: "#ff9f43", items: [] },
    { id: "preview-b", label: "B", color: "#feca57", items: [] },
    { id: "preview-c", label: "C", color: "#48dbb4", items: [] },
    { id: "preview-d", label: "D", color: "#54a0ff", items: [] },
  ],
  unranked: [],
};

function uid() {
  return crypto.randomUUID();
}

function collectItems(board) {
  return [
    ...board.unranked,
    ...board.tiers.flatMap((tier) => tier.items),
  ];
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportNodeAsTightPng(node, imageOverrides) {
  const rect = node.getBoundingClientRect();
  const wrapper = document.createElement("div");
  const clone = node.cloneNode(true);

  for (const card of clone.querySelectorAll(".rank-card")) {
    const url = imageOverrides[card.dataset.itemId];
    if (!url) continue;
    let img = card.querySelector("img");
    if (!img) {
      img = document.createElement("img");
      img.alt = "";
      card.querySelector(".rank-card__placeholder")?.remove();
      card.prepend(img);
    }
    img.src = url;
  }

  wrapper.className = node.closest(".app-shell").className;

  wrapper.style.position = "fixed";
  wrapper.style.display = "block";
  wrapper.style.height = "auto";
  wrapper.style.inset = "0 auto auto 0";
  wrapper.style.width = `${Math.ceil(rect.width)}px`;
  wrapper.style.minHeight = `${Math.ceil(rect.height)}px`;
  wrapper.style.overflow = "hidden";
  wrapper.style.background = "#151a21";
  wrapper.style.pointerEvents = "none";
  wrapper.style.zIndex = "-1";

  clone.style.width = `${Math.ceil(rect.width)}px`;
  clone.style.margin = "0";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    await Promise.all(Array.from(clone.querySelectorAll("img")).map((img) => img.decode().catch(() => {})));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return await toPng(wrapper, {
      width: Math.ceil(rect.width),
      height: Math.ceil(wrapper.getBoundingClientRect().height),
      backgroundColor: "#151a21",
      pixelRatio: 2,
      filter: (nodeToFilter) => !nodeToFilter?.dataset?.exportIgnore,
    });
  } finally {
    wrapper.remove();
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(data, type) {
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type });
}

function countItems(board) {
  return collectItems(board).length;
}

function formatArchiveDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--.--.--";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date).replaceAll("/", ".");
}

function IconButton({ label, children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}

function Dialog({ title, eyebrow, description, children, onClose, footer, danger, className = "" }) {
  const dialogRef = useRef(null);
  const previousFocus = useRef(typeof document === "undefined" ? null : document.activeElement);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.contains(document.activeElement)) {
      const firstInput = dialog.querySelector('input:not([type="radio"]):not([type="hidden"]), select');
      (firstInput || dialog.querySelector("button"))?.focus();
    }
    return () => {
      const previous = previousFocus.current;
      const hiddenSidebar = previous?.closest(".sidebar:not(.is-open)")
        && window.matchMedia("(max-width: 820px)").matches;
      const target = previous?.isConnected && !hiddenSidebar
        ? previous
        : document.querySelector(".board-title");
      target?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className={`dialog ${className}`}
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            onClose();
          }
          if (event.key !== "Tab") return;
          const controls = [...dialogRef.current.querySelectorAll(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]',
          )].filter((control) => control.getClientRects().length > 0);
          const first = controls[0];
          const last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
      >
        <header className="dialog__header">
          <div className="dialog__heading">
            {eyebrow ? <span className="dialog__eyebrow">{eyebrow}</span> : null}
            <h2>{title}</h2>
            {description ? (
              <p className="dialog__description">{description}</p>
            ) : null}
          </div>
          <IconButton label="关闭" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="dialog__body">{children}</div>
        {footer ? <footer className="dialog__footer">{footer}</footer> : null}
        {danger ? <div className="dialog__danger">{danger}</div> : null}
      </section>
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, cancelLabel, danger, onConfirm, onClose }) {
  return (
    <Dialog
      title={title}
      description={message}
      onClose={onClose}
      footer={
        <>
          <button className="button button--ghost" type="button" onClick={onClose}>
            {cancelLabel || "取消"}
          </button>
          <button
            className={`button ${danger !== false ? "button--danger" : "button--primary"}`}
            type="button"
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel || "确认"}
          </button>
        </>
      }
    />
  );
}

function RankCard({ item, imageUrl, onEdit, readOnly = false }) {
  return (
    <article
      className="rank-card"
      data-item-id={item.id}
      tabIndex={0}
      title={item.name}
      aria-label={item.name}
      onDoubleClick={readOnly ? undefined : onEdit}
      onKeyDown={(event) => {
        if (!readOnly && event.target === event.currentTarget && event.key === "Enter") onEdit();
      }}
    >
      {imageUrl ? (
        // Blob URLs are local user uploads and cannot use a remote image loader.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" draggable="false" />
      ) : (
        <div className="rank-card__placeholder">
          <ImagePlus size={22} />
        </div>
      )}
      <span className="rank-card__name">{item.name}</span>
      {!readOnly ? <IconButton
        label={`编辑 ${item.name}`}
        className="rank-card__menu card-action"
        onClick={() => onEdit(item)}
      >
        <MoreHorizontal size={17} />
      </IconButton> : null}
    </article>
  );
}

function CreateBoardDialog({ onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState(DEFAULT_BOARD_ICON);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onCreate(title.trim() || "我的评分榜", icon);
    } catch {
      setError("创建失败，名称和图标已保留，请重试。");
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      title="新建榜单"
      eyebrow="NEW COLLECTION"
      description="为榜单起个名字，选择一个喜欢的图标。"
      className="dialog--create"
      onClose={onClose}
      footer={
        <>
          <button className="button button--ghost" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className="button button--primary"
            type="submit"
            form="create-board-form"
            disabled={submitting}
          >
            <Plus size={17} />
            {submitting ? "创建中…" : "创建榜单"}
          </button>
        </>
      }
    >
      <form
        id="create-board-form"
        className="dialog__form"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="field">
          <span>榜单名称</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：我的游戏榜单"
            autoFocus
          />
        </label>
        <fieldset className="board-icon-picker">
          <legend>榜单图标</legend>
          <div className="board-icon-grid">
            {BOARD_ICONS.map((option) => (
              <label
                key={option.id}
                className={`board-icon-option${icon === option.id ? " is-selected" : ""}`}
              >
                <input
                  type="radio"
                  name="board-icon"
                  value={option.id}
                  checked={icon === option.id}
                  onChange={() => setIcon(option.id)}
                />
                <BoardIcon icon={option.id} size={25} />
                <span>{option.label}</span>
                {icon === option.id ? <Check className="board-icon-check" size={12} aria-hidden="true" /> : null}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="board-preview">
          <span className="board-preview__label">侧栏预览</span>
          <div className="board-tab board-tab--preview is-active">
            <span className="board-tab__icon" data-board-icon={icon}>
              <BoardIcon icon={icon} />
            </span>
            <span className="board-tab__copy">
              <strong>{title.trim() || "我的评分榜"}</strong>
              <small>0 项作品</small>
            </span>
          </div>
        </div>
        {error ? <p className="create-board-error" role="alert">{error}</p> : null}
      </form>
    </Dialog>
  );
}

export default function TierApp() {
  const [editor, dispatchEditor] = useReducer(boardEditorReducer, [PREVIEW_BOARD], createEditorState);
  const boards = editor.boards;
  const setBoards = useCallback((value, resetHistory = false) => {
    dispatchEditor({ type: "set", value, resetHistory });
  }, []);
  const [activeId, setActiveId] = useState(PREVIEW_BOARD.id);
  const [imageUrls, setImageUrls] = useState({});
  const [ready, setReady] = useState(false);
  const [creatingBoard, setCreatingBoard] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [toast, setToast] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showcaseMode, setShowcaseMode] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [search, setSearch] = useState("");
  const [coverSize, setCoverSize] = useState("medium");
  const [collapsedTiers, setCollapsedTiers] = useState({});
  const [poolCollapsed, setPoolCollapsed] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [busyMessage, setBusyMessage] = useState("");
  const busyRef = useRef(false);
  const uploadRef = useRef(null);
  const importRef = useRef(null);
  const boardExportRef = useRef(null);
  const saveTimer = useRef(null);
  const toastTimer = useRef(null);

  const activeBoard = boards.find((board) => board.id === activeId) ?? null;
  const searchQuery = exporting ? "" : search;
  const canUndo = Boolean(editor.history[activeId]?.length);
  const searchCount = activeBoard ? filterItems(collectItems(activeBoard), searchQuery).length : 0;
  const activeImageKey = useMemo(
    () => activeBoard
      ? collectItems(activeBoard).map((item) => item.imageId).sort().join("|")
      : "",
    [activeBoard],
  );

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 2600);
  }, []);

  const runExclusive = useCallback(async (message, task) => {
    if (busyRef.current) throw new Error("请等待当前操作完成");
    busyRef.current = true;
    window.clearTimeout(saveTimer.current);
    setBusyMessage(message);
    try {
      await flushWrites();
      return await task();
    } finally {
      busyRef.current = false;
      setBusyMessage("");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let saved = await listBoards();
      if (!saved.length) {
        const starter = createBoard("我的第一张榜单", "");
        await saveBoard(starter);
        saved = [starter];
      }
      if (!cancelled) {
        setBoards(saved);
        setActiveId(saved[0].id);
        setReady(true);
      }
    })().catch(() => notify("读取本地数据失败"));
    return () => {
      cancelled = true;
    };
  }, [notify, setBoards]);

  useEffect(() => {
    if (!ready || busyRef.current) return undefined;
    let cancelled = false;
    setSaveStatus("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        await saveBoards(boards);
        if (!cancelled) setSaveStatus("saved");
      } catch {
        if (!cancelled) {
          setSaveStatus("failed");
          notify("保存失败，请导出备份保留当前更改");
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(saveTimer.current);
    };
  }, [boards, ready, notify, busyMessage]);

  useEffect(() => {
    setSearch("");
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return undefined;
    let cancelled = false;
    const urls = [];
    (async () => {
      const entries = await Promise.all(
        (activeImageKey ? activeImageKey.split("|") : []).map(async (imageId) => {
          const record = await getImage(imageId);
          if (!record?.blob) return [imageId, ""];
          const url = URL.createObjectURL(record.blob);
          urls.push(url);
          return [imageId, url];
        }),
      );
      if (!cancelled) setImageUrls(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [activeId, activeImageKey]);

  const updateActive = useCallback((updater) => {
    dispatchEditor({ type: "edit", boardId: activeId, updater, at: new Date().toISOString() });
  }, [activeId]);

  const updateBoardTitle = useCallback((boardId, title) => {
    const nextTitle = title.trim() || "未命名榜单";
    dispatchEditor({ type: "edit", boardId, updater: (board) => ({ ...board, title: nextTitle }), at: new Date().toISOString() });
  }, []);

  const beginTitleEdit = useCallback((board) => {
    setEditingTitleId(board.id);
    setTitleDraft(board.title);
  }, []);

  const commitTitleEdit = useCallback(() => {
    if (!editingTitleId) return;
    updateBoardTitle(editingTitleId, titleDraft);
    setEditingTitleId(null);
  }, [editingTitleId, titleDraft, updateBoardTitle]);

  const cancelTitleEdit = useCallback(() => {
    setEditingTitleId(null);
    setTitleDraft("");
  }, []);

  const handleMove = useCallback((itemId, fromId, toId, index) => {
    updateActive((board) => moveItem(board, itemId, fromId, toId, index));
  }, [updateActive]);

  const undoEdit = useCallback(() => {
    dispatchEditor({ type: "undo", boardId: activeId, at: new Date().toISOString() });
  }, [activeId]);

  useEffect(() => {
    const handleUndo = (event) => {
      if (!canUndo || busyRef.current || showcaseMode || creatingBoard || editingItem || confirmDialog) return;
      if (event.target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if ((event.ctrlKey || event.metaKey) && !event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoEdit();
      }
    };
    window.addEventListener("keydown", handleUndo);
    return () => window.removeEventListener("keydown", handleUndo);
  }, [canUndo, showcaseMode, creatingBoard, editingItem, confirmDialog, undoEdit]);

  const handleUpload = useCallback(async (fileList, source = "upload") => {
    const files = Array.from(fileList || []);
    if (!files.length) return 0;
    if (busyRef.current) return 0;
    return runExclusive("正在处理封面图片…", async () => {
    const created = [];
    let skipped = 0;
    for (const file of files) {
      try {
        const thumbnail = await createThumbnail(file);
        const imageId = uid();
        await putImage(imageId, thumbnail.blob);
        created.push(createItem(thumbnail.name, imageId));
      } catch {
        skipped += 1;
      }
    }
    if (created.length) {
      updateActive((board) => ({
        ...board,
        unranked: [...board.unranked, ...created],
      }));
      notify(source === "paste"
        ? `已添加 ${created.length} 张截图`
        : `已加入 ${created.length} 张封面`);
    }
    if (skipped) notify(`${skipped} 张图片无法读取，已跳过`);
    return created.length;
    }).catch(() => { notify("图片处理失败，请重试"); return 0; });
  }, [notify, updateActive, runExclusive]);

  useEffect(() => {
    if (!ready) return undefined;

    const handlePaste = async (event) => {
      if (busyRef.current || creatingBoard || editingItem || confirmDialog || showcaseMode) return;
      const files = getClipboardImageFiles(event.clipboardData?.items);
      if (!files.length) return;

      event.preventDefault();
      await handleUpload(files, "paste");
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleUpload, ready, creatingBoard, editingItem, confirmDialog, showcaseMode]);

  const createNewBoard = async (title, icon) => {
    return runExclusive("正在创建榜单…", async () => {
    const board = { ...createBoard(title, ""), icon: resolveBoardIcon(icon) };
    await saveBoard(board);
    setBoards((current) => [...current, board]);
    setActiveId(board.id);
    setCreatingBoard(false);
    setSidebarOpen(false);
    notify("榜单已创建");
    });
  };

  const duplicateActiveBoard = () => {
    if (!activeBoard) return;
    const copy = {
      ...structuredClone(activeBoard),
      id: uid(),
      title: `${activeBoard.title} 副本`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tiers: activeBoard.tiers.map((tier) => ({
        ...structuredClone(tier),
        id: uid(),
        items: tier.items.map((item) => ({ ...item, id: uid() })),
      })),
      unranked: activeBoard.unranked.map((item) => ({ ...item, id: uid() })),
    };
    setBoards((current) => [copy, ...current]);
    setActiveId(copy.id);
    notify("已创建榜单副本");
  };

  const deleteActiveBoard = () => {
    if (!activeBoard) return;
    setConfirmDialog({
      title: "删除榜单",
      message: `确定删除"${activeBoard.title}"吗？此操作不可撤销。`,
      confirmLabel: "确认删除",
      onConfirm: async () => {
        try {
        await runExclusive("正在删除榜单…", async () => {
        await removeBoard(activeBoard.id);
        const remaining = boards.filter((board) => board.id !== activeBoard.id);
        if (remaining.length) {
          setBoards(remaining);
          setActiveId(remaining[0].id);
        } else {
          const starter = createBoard("我的第一张榜单", "");
          await saveBoard(starter);
          setBoards([starter]);
          setActiveId(starter.id);
        }
        notify("榜单已删除");
        });
        } catch { notify("删除失败，请重试"); }
      },
    });
  };

  const updateTier = (tierId, changes) => {
    updateActive((board) => ({
      ...board,
      tiers: board.tiers.map((tier) =>
        tier.id === tierId ? { ...tier, ...changes } : tier
      ),
    }));
  };

  const moveTier = (tierId, direction) => {
    updateActive((board) => {
      const tiers = [...board.tiers];
      const index = tiers.findIndex((tier) => tier.id === tierId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= tiers.length) return board;
      [tiers[index], tiers[target]] = [tiers[target], tiers[index]];
      return { ...board, tiers };
    });
  };

  const addTier = () => {
    const nextColor = TIER_COLORS[activeBoard?.tiers.length % TIER_COLORS.length];
    updateActive((board) => ({
      ...board,
      tiers: [...board.tiers, createTier("新等级", nextColor)],
    }));
  };

  const deleteTier = (tierId) => {
    const tier = activeBoard?.tiers.find((entry) => entry.id === tierId);
    if (!tier) return;
    setConfirmDialog({
      title: "删除等级",
      message: `删除"${tier.label}"等级？其中图片将回到待评分区。`,
      confirmLabel: "确认删除",
      onConfirm: () => {
        updateActive((board) => ({
          ...board,
          unranked: [...board.unranked, ...tier.items],
          tiers: board.tiers.filter((entry) => entry.id !== tierId),
        }));
      },
    });
  };

  const saveEditedItem = async ({ name, targetId, deleteItem, replacement }) => {
    if (!editingItem || !activeBoard) return;
    return runExclusive("正在保存封面…", async () => {
    const sourceId = editingItem.containerId;
    if (deleteItem) {
      updateActive((board) => {
        const remove = (items) =>
          items.filter((item) => item.id !== editingItem.item.id);
        return {
          ...board,
          unranked: remove(board.unranked),
          tiers: board.tiers.map((tier) => ({
            ...tier,
            items: remove(tier.items),
          })),
        };
      });
      setEditingItem(null);
      notify("封面已删除，可点击撤销恢复");
      return;
    }

    let imageId = editingItem.item.imageId;
    if (replacement) {
      const thumbnail = await createThumbnail(replacement);
      imageId = uid();
      await putImage(imageId, thumbnail.blob);
    }

    updateActive((board) => {
      const rename = (items) =>
        items.map((item) =>
          item.id === editingItem.item.id
            ? { ...item, name: name.trim() || "未命名", imageId }
            : item
        );
      let next = {
        ...board,
        unranked: rename(board.unranked),
        tiers: board.tiers.map((tier) => ({
          ...tier,
          items: rename(tier.items),
        })),
      };
      if (targetId !== sourceId) {
        next = moveItem(
          next,
          editingItem.item.id,
          sourceId,
          targetId,
          targetId === "unranked"
            ? next.unranked.length
            : next.tiers.find((tier) => tier.id === targetId)?.items.length ?? 0,
        );
      }
      return next;
    });
    setEditingItem(null);
    notify("封面信息已更新");
    });
  };

  const openItemEditor = (item, containerId) => {
    setEditingItem({ item, containerId });
  };

  const exportBackup = async () => {
    try {
    await runExclusive("正在导出完整备份…", async () => {
    const images = await listImages();
    const encoded = await Promise.all(
      images.map(async (record) => ({
        id: record.id,
        type: record.type,
        data: await blobToBase64(record.blob),
      })),
    );
    const backup = createBackupEnvelope(boards, encoded);
    downloadBlob(
      new Blob([JSON.stringify(backup)], { type: "application/json" }),
      `个人评分备份-${new Date().toISOString().slice(0, 10)}.json`,
    );
    notify("完整备份已导出");
    });
    } catch { notify("备份导出失败，请重试"); }
  };

  const importBackup = (file) => {
    if (!file) return;
    setConfirmDialog({
      title: "导入备份",
      message: "导入会替换当前浏览器中的所有榜单，确定继续吗？",
      confirmLabel: "确认导入",
      onConfirm: async () => {
        try {
          await runExclusive("正在恢复备份，请稍候…", async () => {
          const text = await file.text();
          const parsed = validateBackupEnvelope(JSON.parse(text));
          const images = parsed.images.map((image) => ({
            id: image.id,
            type: image.type,
            blob: base64ToBlob(image.data, image.type),
          }));
          window.clearTimeout(saveTimer.current);
          await replaceEverything(parsed.boards, images);
          let restored = await listBoards();
          if (!restored.length) {
            const starter = createBoard("我的第一张榜单", "");
            await saveBoard(starter);
            restored = [starter];
          }
          setBoards(restored, true);
          setActiveId(restored[0]?.id || "");
          notify("备份已恢复");
          });
        } catch (error) {
          notify(error instanceof Error ? error.message : "备份导入失败");
        }
      },
    });
  };

  const exportBoardImage = async () => {
    if (!activeBoard || !boardExportRef.current) return;
    const wasShowcaseMode = showcaseMode;
    const temporaryUrls = [];
    try {
      await runExclusive("正在生成评分图…", async () => {
      setExporting(true);
      setShowcaseMode(true);
      const imageOverrides = Object.fromEntries(await Promise.all(collectItems(activeBoard).map(async (item) => {
        const record = await getImage(item.imageId);
        if (!record?.blob) return [item.id, ""];
        const url = URL.createObjectURL(record.blob);
        temporaryUrls.push(url);
        return [item.id, url];
      })));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const dataUrl = await exportNodeAsTightPng(boardExportRef.current, imageOverrides);
      const response = await fetch(dataUrl);
      downloadBlob(await response.blob(), `${activeBoard.title}.png`);
      notify("评分图已导出");
      });
    } catch {
      notify("导出图片失败，请稍后重试");
    } finally {
      temporaryUrls.forEach((url) => URL.revokeObjectURL(url));
      setExporting(false);
      setShowcaseMode(wasShowcaseMode);
    }
  };

  if (!activeBoard) {
    return (
      <main className="loading-screen">
        <Sparkles size={25} />
        <span>正在打开你的评分宇宙</span>
      </main>
    );
  }

  return (
    <>
    <div
      className={`app-shell is-compact cover-size--${coverSize} ${showcaseMode ? "is-showcase" : ""}`}
      inert={Boolean(busyMessage)}
      aria-busy={Boolean(busyMessage)}
      onDragOver={(event) => {
        if (event.dataTransfer?.types?.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        if (event.dataTransfer?.files?.length) {
          event.preventDefault();
          if (event.target.closest(".dialog")) return;
          handleUpload(event.dataTransfer.files);
        }
      }}
    >
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand__mark" aria-hidden="true"><Layers3 size={35} strokeWidth={2.2} /></div>
          <div>
            <strong>我的评分宇宙</strong>
            <span>MY RANKING ARCHIVE</span>
          </div>
          <IconButton
            label="关闭榜单栏"
            className="sidebar__close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </IconButton>
        </div>

        <button
          type="button"
          className="button button--primary sidebar__create"
          onClick={() => setCreatingBoard(true)}
        >
          <Plus size={17} />
          新建榜单
        </button>

        <nav className="board-list" aria-label="我的榜单">
          <p className="section-label">我的榜单 <span>{boards.length}</span></p>
          {boards.map((board) => {
            const isActive = board.id === activeId;
            return (
              <div
                role="button"
                tabIndex={0}
                key={board.id}
                className={`board-tab ${isActive ? "is-active" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  setActiveId(board.id);
                  setSidebarOpen(false);
                }}
                onDoubleClick={() => beginTitleEdit(board)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveId(board.id);
                    setSidebarOpen(false);
                  }
                }}
              >
                <span className="board-tab__icon" data-board-icon={resolveBoardIcon(board.icon)}>
                  <BoardIcon icon={board.icon} />
                </span>
                <span className="board-tab__copy">
                  {editingTitleId === board.id ? (
                    <input
                      className="board-tab__rename"
                      value={titleDraft}
                      aria-label="编辑榜单标题"
                      autoFocus
                      onClick={(event) => event.stopPropagation()}
                      onDoubleClick={(event) => event.stopPropagation()}
                      onFocus={(event) => event.target.select()}
                      onChange={(event) => setTitleDraft(event.target.value)}
                      onBlur={commitTitleEdit}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        if (event.key === "Enter") {
                          event.preventDefault();
                          event.currentTarget.blur();
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelTitleEdit();
                        }
                      }}
                    />
                  ) : (
                    <strong title="双击修改标题">{board.title}</strong>
                  )}
                  <small>
                    {countItems(board)} 项作品
                  </small>
                </span>
              </div>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <button type="button" onClick={() => importRef.current?.click()}>
            <FileUp size={18} />
            导入备份
          </button>
          <button type="button" onClick={exportBackup}>
            <FileDown size={18} />
            导出备份
          </button>
          <input
            ref={importRef}
            hidden
            type="file"
            accept="application/json"
            onChange={(event) => importBackup(event.target.files?.[0])}
          />
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div className="topbar__title">
            <IconButton
              label="打开榜单栏"
              className="mobile-menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Layers3 size={18} />
            </IconButton>
            <div>
              <div className="board-meta-line">
                <span className="archive-status-dot" aria-hidden="true" />
                <span>{countItems(activeBoard)} 项作品</span>
                <span className={`save-state save-state--${saveStatus}`}>
                  <Check size={13} /> {saveStatus === "saving" ? "正在保存" : saveStatus === "failed" ? "保存失败" : "自动保存"}
                </span>
              </div>
              <input
                className="board-title"
                value={activeBoard.title}
                aria-label="榜单名称"
                title="点击或双击修改标题"
                onChange={(event) =>
                  updateActive((board) => ({ ...board, title: event.target.value }))}
              />
            </div>
          </div>

          <div className="toolbar">
            <button
              type="button"
              className={`button showcase-switch ${showcaseMode ? "is-active" : ""}`}
              aria-pressed={showcaseMode}
              onClick={() => setShowcaseMode(previous => !previous)}
            >
              <Sparkles size={16} />
              {showcaseMode ? "编辑模式" : "展示模式"}
            </button>
            <button
              type="button"
              className="button button--primary"
              onClick={() => uploadRef.current?.click()}
            >
              <Upload size={17} />
              上传封面
            </button>
            <input
              ref={uploadRef}
              hidden
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                handleUpload(event.target.files);
                event.target.value = "";
              }}
            />
            <IconButton label="导出评分图" onClick={exportBoardImage}>
              <ImageDown size={18} />
            </IconButton>
            <IconButton label="复制榜单" onClick={duplicateActiveBoard}>
              <Copy size={18} />
            </IconButton>
            <details className="board-options" onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
            }} onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}>
              <summary aria-label="榜单更多操作" title="更多操作：添加等级、删除榜单"><MoreHorizontal size={18} /></summary>
              <div className="board-options__menu">
                <button type="button" onClick={(event) => { event.currentTarget.closest("details").open = false; addTier(); }}><Plus size={16} />添加等级</button>
                <button type="button" onClick={(event) => { event.currentTarget.closest("details").open = false; deleteActiveBoard(); }} className="board-options__delete"><Trash2 size={16} />删除榜单</button>
              </div>
            </details>
          </div>
        </header>

        <section className="board-scroll">
          <div className="workspace-tools" data-export-ignore="true">
            <label className="work-search">
              <Search size={18} aria-hidden="true" />
              <input type="search" placeholder="搜索作品名称" aria-label="搜索作品名称" value={search} onChange={(event) => setSearch(event.target.value)} />
            </label>
            {search.trim() ? <span className="search-result" role="status">找到 {searchCount} 项</span> : null}
            <div className="cover-size-control" role="group" aria-label="封面大小">
              <span>封面大小</span>
              <div>
                {[["small", "小"], ["medium", "中"], ["large", "大"]].map(([value, label]) => (
                  <button key={value} type="button" aria-pressed={coverSize === value} onClick={() => setCoverSize(value)}>{label}</button>
                ))}
              </div>
            </div>
            {!showcaseMode ? <button className="button undo-button" type="button" disabled={!canUndo} onClick={undoEdit} title="撤销上一步（Ctrl+Z）"><Undo2 size={17} />撤销</button> : null}
          </div>
          <div className="board-frame" ref={boardExportRef}>
            <div className="board-frame__heading">
              <div className="board-frame__identity">
                <span>MY RANKING ARCHIVE</span>
                <h1>{activeBoard.title || "未命名榜单"}</h1>
                <div className="showcase-badges" aria-hidden="true">
                  <span className="showcase-badge">TIER LIST</span>
                  <span className="showcase-badge">PERSONAL PICKS</span>
                </div>
              </div>
              <div className="board-frame__actions">
                <div className="showcase-stats" aria-label="榜单统计">
                  <span className="showcase-stat">
                    <strong>{countItems(activeBoard)}</strong>
                    <small>ITEMS</small>
                  </span>
                  <span className="showcase-stat">
                    <strong>{activeBoard.tiers.length}</strong>
                    <small>TIERS</small>
                  </span>
                </div>
                <span className="board-updated">
                  LAST UPDATE {formatArchiveDate(activeBoard.updatedAt)}
                </span>
                <button
                  type="button"
                  className="button button--soft"
                  data-export-ignore="true"
                  onClick={addTier}
                >
                  <Plus size={16} />
                  添加等级
                </button>
              </div>
            </div>

            <div className="tier-board">
              {activeBoard.tiers.map((tier, tierIndex) => {
                const collapseKey = `${activeBoard.id}:${tier.id}`;
                const collapsed = Boolean(collapsedTiers[collapseKey]) && !searchQuery.trim() && !exporting && !showcaseMode;
                const visibleItems = filterItems(tier.items, searchQuery);
                return (
                <section className={`tier-row${collapsed ? " tier-row--collapsed" : ""}${!visibleItems.length ? " tier-row--empty" : ""}`} key={tier.id}>
                  <div className="tier-label" style={{ backgroundColor: tier.color }}>
                    <input
                      value={tier.label}
                      aria-label={`等级 ${tier.label} 名称`}
                      maxLength={12}
                      readOnly={showcaseMode}
                      onChange={(event) =>
                        updateTier(tier.id, { label: event.target.value })}
                    />
                    <button className="tier-collapse" type="button" aria-label={`${collapsed ? "展开" : "折叠"} ${tier.label} 等级`} aria-expanded={!collapsed} aria-controls={`lane-${tier.id}`} data-export-ignore="true" onClick={() => setCollapsedTiers((current) => ({ ...current, [collapseKey]: !current[collapseKey] }))}>
                      <ChevronDown size={16} aria-hidden="true" />
                    </button>
                    <div className="tier-label__controls" data-export-ignore="true">
                      <label title="修改颜色">
                        <Palette size={14} />
                        <input
                          type="color"
                          value={tier.color}
                          aria-label={`修改 ${tier.label} 的颜色`}
                          onChange={(event) =>
                            updateTier(tier.id, { color: event.target.value })}
                        />
                      </label>
                      <IconButton
                        label="等级上移"
                        disabled={tierIndex === 0}
                        onClick={() => moveTier(tier.id, -1)}
                      >
                        <ArrowUp size={14} />
                      </IconButton>
                      <IconButton
                        label="等级下移"
                        disabled={tierIndex === activeBoard.tiers.length - 1}
                        onClick={() => moveTier(tier.id, 1)}
                      >
                        <ArrowDown size={14} />
                      </IconButton>
                      <IconButton label="删除等级" onClick={() => deleteTier(tier.id)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </div>
                  {collapsed ? <div className="tier-collapsed-content">已折叠</div> : null}
                  <SortableLane containerId={tier.id} id={`lane-${tier.id}`} hidden={collapsed} onMove={handleMove} disabled={showcaseMode || Boolean(searchQuery.trim())}>
                    {visibleItems.map((item) => (
                      <RankCard
                        key={item.id}
                        item={item}
                        imageUrl={imageUrls[item.imageId]}
                        onEdit={() => openItemEditor(item, tier.id)}
                        readOnly={showcaseMode}
                      />
                    ))}
                    {!visibleItems.length ? (
                      <span className="lane-hint">{searchQuery.trim() ? "没有匹配作品" : "拖动作品到这里"}</span>
                    ) : null}
                  </SortableLane>
                </section>
              );})}
            </div>
          </div>
        </section>

        <section className={`unranked unranked--dock${poolCollapsed ? " unranked--collapsed" : ""}`}>
              <div className="unranked__heading">
                <div className="unranked__copy">
                  <h2><button className="pool-toggle" type="button" aria-expanded={!poolCollapsed} aria-controls="unranked-lane" onClick={() => setPoolCollapsed(previous => !previous)}><ChevronDown size={16} aria-hidden="true" /><span>待评分</span><span className="unranked__count">{activeBoard.unranked.length}</span></button></h2>
                </div>
                <div className="unranked__status">
                  <span className="paste-hint">Ctrl + V 粘贴图片</span>
                  <button className="button button--ghost" type="button" onClick={() => uploadRef.current?.click()}><Plus size={15} />上传</button>
                </div>
              </div>
              <SortableLane
                containerId="unranked"
                id="unranked-lane"
                hidden={poolCollapsed}
                onMove={handleMove}
                className="item-lane--pool"
                disabled={Boolean(searchQuery.trim())}
              >
                {filterItems(activeBoard.unranked, searchQuery).map((item) => (
                  <RankCard
                    key={item.id}
                    item={item}
                    imageUrl={imageUrls[item.imageId]}
                    onEdit={() => openItemEditor(item, "unranked")}
                  />
                ))}
                {activeBoard.unranked.length && !filterItems(activeBoard.unranked, searchQuery).length ? <span className="lane-hint">没有匹配作品</span> : null}
                {!activeBoard.unranked.length ? (
                  <button
                    type="button"
                    className="upload-empty"
                    data-export-ignore="true"
                    onClick={() => uploadRef.current?.click()}
                  >
                    <ImagePlus size={25} />
                    <strong>拖入图片或点击上传</strong>
                    <span>批量上传 · Ctrl + V 粘贴</span>
                  </button>
                ) : null}
              </SortableLane>
        </section>
      </main>

      {creatingBoard ? (
        <CreateBoardDialog
          onClose={() => setCreatingBoard(false)}
          onCreate={createNewBoard}
        />
      ) : null}

      {editingItem ? (
        <ItemDialog
          board={activeBoard}
          editing={editingItem}
          imageUrl={imageUrls[editingItem.item.imageId]}
          onClose={() => setEditingItem(null)}
          onSave={saveEditedItem}
        />
      ) : null}

      {confirmDialog ? (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          cancelLabel={confirmDialog.cancelLabel}
          danger={confirmDialog.danger}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
        />
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      ) : null}
    </div>
    {busyMessage ? <div className="workspace-busy" role="status"><Sparkles size={23} /><span>{busyMessage}</span></div> : null}
    </>
  );
}

function ItemDialog({ board, editing, imageUrl, onClose, onSave }) {
  const [name, setName] = useState(editing.item.name);
  const [targetId, setTargetId] = useState(editing.containerId);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [replacement, setReplacement] = useState(null);
  const [replacementUrl, setReplacementUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const replacementRef = useRef(null);

  useEffect(() => {
    if (!replacement) return undefined;
    const url = URL.createObjectURL(replacement);
    setReplacementUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [replacement]);

  const save = async (deleteItem = false) => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      await onSave({ name, targetId, deleteItem, replacement });
    } catch {
      setSubmitting(false);
      setError("封面保存失败，修改已保留，请重试。");
    }
  };

  const close = () => { if (!submitting) onClose(); };

  return (
    <Dialog
      title="编辑封面"
      eyebrow="EDIT COVER"
      description="调整作品名称、封面和评分等级。"
      className="dialog--item"
      onClose={close}
      footer={
        <>
          <div className="item-delete-control">
            <button
              className={`button button--danger${deleteArmed ? " button--danger-confirm" : ""}`}
              type="button"
              disabled={submitting}
              onClick={() => {
                if (!deleteArmed) { setDeleteArmed(true); return; }
                save(true);
              }}
            ><Trash2 size={16} />{deleteArmed ? "确认删除" : "删除"}</button>
            <small>删除后可撤销</small>
          </div>
          <button className="button button--ghost" type="button" onClick={close} disabled={submitting}>
            取消
          </button>
          <button
            className="button button--primary"
            type="submit"
            form="item-editor-form"
            disabled={submitting}
          >
            <Save size={16} />
            {submitting ? "保存中" : "保存"}
          </button>
        </>
      }
    >
      <form id="item-editor-form" className="item-editor" onSubmit={(event) => { event.preventDefault(); save(); }}>
        <div className="item-editor__cover">
          {replacementUrl || imageUrl
            ? <img src={replacementUrl || imageUrl} alt={`${name}的封面预览`} />
            : <div className="item-editor__placeholder"><ImagePlus size={36} /><span>封面预览</span></div>}
          <button className="button button--ghost" type="button" disabled={submitting} onClick={() => replacementRef.current?.click()}><ImagePlus size={16} />更换封面</button>
          <input ref={replacementRef} type="file" hidden accept="image/*" aria-label="选择替换封面" onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            if (!file.type.startsWith("image/")) { setError("请选择图片文件"); return; }
            setReplacement(file);
            setError("");
          }} />
        </div>
        <div className="item-editor__fields">
      <label className="field">
        <span>作品名称</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
          disabled={submitting}
        />
      </label>
      <label className="field">
        <span>评分等级</span>
        <select
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
          disabled={submitting}
        >
          <option value="unranked">待评分</option>
          {board.tiers.map((tier) => (
            <option key={tier.id} value={tier.id}>{tier.label}</option>
          ))}
        </select>
      </label>
        </div>
        {error ? <p className="item-editor__error" role="alert">{error}</p> : null}
      </form>
    </Dialog>
  );
}
