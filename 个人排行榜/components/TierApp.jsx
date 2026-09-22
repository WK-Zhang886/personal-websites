"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  FileDown,
  FileUp,
  ImageDown,
  ImagePlus,
  Layers3,
  MoreHorizontal,
  Palette,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toPng } from "html-to-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  listBoards,
  listImages,
  putImage,
  removeBoard,
  replaceEverything,
  saveBoard,
} from "../lib/storage";
import { SortableLane } from "./SortableLane";

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

async function exportNodeAsTightPng(node) {
  const rect = node.getBoundingClientRect();
  const wrapper = document.createElement("div");
  const clone = node.cloneNode(true);

  wrapper.style.position = "fixed";
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
    await new Promise((resolve) => requestAnimationFrame(resolve));
    return await toPng(wrapper, {
      width: Math.ceil(rect.width),
      height: Math.ceil(wrapper.getBoundingClientRect().height),
      backgroundColor: "#151a21",
      pixelRatio: 2,
      cacheBust: true,
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

function formatArchiveIndex(index) {
  return String(index + 1).padStart(2, "0");
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

function Dialog({ title, eyebrow, description, children, onClose, footer, danger }) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
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

function RankCard({ item, imageUrl, onEdit }) {
  return (
    <article
      className="rank-card"
      data-item-id={item.id}
      tabIndex={0}
      title={item.name}
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
      <IconButton
        label={`编辑 ${item.name}`}
        className="rank-card__menu card-action"
        onClick={() => onEdit(item)}
      >
        <MoreHorizontal size={17} />
      </IconButton>
    </article>
  );
}

function CreateBoardDialog({ onClose, onCreate }) {
  const [title, setTitle] = useState("");

  const submit = () => {
    onCreate(title.trim() || "我的评分榜");
  };

  return (
    <Dialog
      title="新建榜单"
      eyebrow="NEW COLLECTION"
      description="建立一个新的评分档案，等级和封面稍后都可以继续调整。"
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
          >
            <Plus size={17} />
            创建榜单
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
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit();
              }
            }}
            placeholder="例如：动漫总榜"
            autoFocus
          />
        </label>
      </form>
    </Dialog>
  );
}

export default function TierApp() {
  const [boards, setBoards] = useState([PREVIEW_BOARD]);
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
  const uploadRef = useRef(null);
  const importRef = useRef(null);
  const boardExportRef = useRef(null);
  const saveTimer = useRef(null);
  const toastTimer = useRef(null);

  const activeBoard = boards.find((board) => board.id === activeId) ?? null;
  const activeBoardIndex = Math.max(
    0,
    boards.findIndex((board) => board.id === activeId),
  );
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
  }, [notify]);

  useEffect(() => {
    if (!ready || !activeBoard) return undefined;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      await saveBoard(activeBoard);
    }, 350);
    return () => window.clearTimeout(saveTimer.current);
  }, [activeBoard, ready]);

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
    setBoards((current) =>
      current.map((board) => {
        if (board.id !== activeId) return board;
        const next = typeof updater === "function" ? updater(board) : updater;
        return { ...next, updatedAt: new Date().toISOString() };
      })
    );
  }, [activeId]);

  const updateBoardTitle = useCallback((boardId, title) => {
    const nextTitle = title.trim() || "未命名榜单";
    setBoards((current) =>
      current.map((board) =>
        board.id === boardId
          ? { ...board, title: nextTitle, updatedAt: new Date().toISOString() }
          : board
      )
    );
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

  const handleUpload = useCallback(async (fileList, source = "upload") => {
    const files = Array.from(fileList || []);
    if (!files.length) return 0;
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
  }, [notify, updateActive]);

  useEffect(() => {
    if (!ready) return undefined;

    const handlePaste = async (event) => {
      const files = getClipboardImageFiles(event.clipboardData?.items);
      if (!files.length) return;

      event.preventDefault();
      await handleUpload(files, "paste");
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleUpload, ready]);

  const createNewBoard = async (title) => {
    const board = createBoard(title, "");
    await saveBoard(board);
    setBoards((current) => [...current, board]);
    setActiveId(board.id);
    setCreatingBoard(false);
    setSidebarOpen(false);
    notify("榜单已创建");
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

  const saveEditedItem = ({ name, targetId, deleteItem }) => {
    if (!editingItem || !activeBoard) return;
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
      return;
    }

    updateActive((board) => {
      const rename = (items) =>
        items.map((item) =>
          item.id === editingItem.item.id
            ? { ...item, name: name.trim() || "未命名" }
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
  };

  const openItemEditor = (item, containerId) => {
    setEditingItem({ item, containerId });
  };

  const exportBackup = async () => {
    await saveBoard(activeBoard);
    const allBoards = await listBoards();
    const images = await listImages();
    const encoded = await Promise.all(
      images.map(async (record) => ({
        id: record.id,
        type: record.type,
        data: await blobToBase64(record.blob),
      })),
    );
    const backup = createBackupEnvelope(allBoards, encoded);
    downloadBlob(
      new Blob([JSON.stringify(backup)], { type: "application/json" }),
      `个人评分备份-${new Date().toISOString().slice(0, 10)}.json`,
    );
    notify("完整备份已导出");
  };

  const importBackup = (file) => {
    if (!file) return;
    setConfirmDialog({
      title: "导入备份",
      message: "导入会替换当前浏览器中的所有榜单，确定继续吗？",
      confirmLabel: "确认导入",
      onConfirm: async () => {
        try {
          const text = await file.text();
          const parsed = validateBackupEnvelope(JSON.parse(text));
          const images = parsed.images.map((image) => ({
            id: image.id,
            type: image.type,
            blob: base64ToBlob(image.data, image.type),
          }));
          await replaceEverything(parsed.boards, images);
          let restored = await listBoards();
          if (!restored.length) {
            const starter = createBoard("我的第一张榜单", "");
            await saveBoard(starter);
            restored = [starter];
          }
          setBoards(restored);
          setActiveId(restored[0]?.id || "");
          notify("备份已恢复");
        } catch (error) {
          notify(error instanceof Error ? error.message : "备份导入失败");
        }
      },
    });
  };

  const exportBoardImage = async () => {
    if (!activeBoard || !boardExportRef.current) return;
    const wasShowcaseMode = showcaseMode;
    try {
      setShowcaseMode(true);
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const dataUrl = await exportNodeAsTightPng(boardExportRef.current);
      const response = await fetch(dataUrl);
      downloadBlob(await response.blob(), `${activeBoard.title}.png`);
      notify("评分图已导出");
    } catch {
      notify("导出图片失败，请稍后重试");
    } finally {
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
    <div
      className={`app-shell ${showcaseMode ? "is-showcase" : ""}`}
      onDragOver={(event) => {
        if (event.dataTransfer?.types?.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        if (event.dataTransfer?.files?.length) {
          event.preventDefault();
          handleUpload(event.dataTransfer.files);
        }
      }}
    >
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand__mark" aria-hidden="true">层</div>
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
          <p className="section-label">
            COLLECTIONS / {formatArchiveIndex(boards.length - 1)}
          </p>
          {boards.map((board, boardIndex) => {
            const isActive = board.id === activeId;
            return (
              <div
                role="button"
                tabIndex={0}
                key={board.id}
                className={`board-tab ${isActive ? "is-active" : ""}`}
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
                <span className="board-tab__index">
                  {formatArchiveIndex(boardIndex)}
                </span>
                <span>
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
                    {countItems(board)} 项{isActive ? " · 已自动保存" : ""}
                  </small>
                </span>
              </div>
            );
          })}
        </nav>

        <div className="sidebar__footer">
          <button type="button" onClick={exportBackup}>
            <FileDown size={16} />
            导出完整备份
          </button>
          <button type="button" onClick={() => importRef.current?.click()}>
            <FileUp size={16} />
            导入备份
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
                <span>PERSONAL RANKING {formatArchiveIndex(activeBoardIndex)}</span>
                <span>{countItems(activeBoard)} 项</span>
                <span className="save-state"><Check size={13} /> 自动保存</span>
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
            <IconButton label="删除榜单" onClick={deleteActiveBoard}>
              <Trash2 size={18} />
            </IconButton>
          </div>
        </header>

        <section className="board-scroll">
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
              {activeBoard.tiers.map((tier, tierIndex) => (
                <section className="tier-row" key={tier.id}>
                  <div className="tier-label" style={{ backgroundColor: tier.color }}>
                    <span className="tier-label__index">
                      {formatArchiveIndex(tierIndex)}
                    </span>
                    <input
                      value={tier.label}
                      aria-label={`等级 ${tier.label} 名称`}
                      maxLength={12}
                      onChange={(event) =>
                        updateTier(tier.id, { label: event.target.value })}
                    />
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
                  <SortableLane containerId={tier.id} onMove={handleMove}>
                    {tier.items.map((item) => (
                      <RankCard
                        key={item.id}
                        item={item}
                        imageUrl={imageUrls[item.imageId]}
                        onEdit={() => openItemEditor(item, tier.id)}
                      />
                    ))}
                    {!tier.items.length ? (
                      <span className="lane-hint">拖到这里</span>
                    ) : null}
                  </SortableLane>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="unranked unranked--dock">
              <div className="unranked__heading">
                <div className="unranked__copy">
                  <h2>待评分</h2>
                  <p>上传后先放在这里，再拖进上面的等级</p>
                </div>
                <div className="unranked__status">
                  <span className="paste-hint">CTRL + V 直接粘贴截图</span>
                  <span className="unranked__count">{activeBoard.unranked.length}</span>
                </div>
              </div>
              <SortableLane
                containerId="unranked"
                onMove={handleMove}
                className="item-lane--pool"
              >
                {activeBoard.unranked.map((item) => (
                  <RankCard
                    key={item.id}
                    item={item}
                    imageUrl={imageUrls[item.imageId]}
                    onEdit={() => openItemEditor(item, "unranked")}
                  />
                ))}
                {!activeBoard.unranked.length ? (
                  <button
                    type="button"
                    className="upload-empty"
                    data-export-ignore="true"
                    onClick={() => uploadRef.current?.click()}
                  >
                    <ImagePlus size={25} />
                    <strong>上传图片开始评分</strong>
                    <span>支持批量选择，也可以直接拖进页面</span>
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
  );
}

function ItemDialog({ board, editing, onClose, onSave }) {
  const [name, setName] = useState(editing.item.name);
  const [targetId, setTargetId] = useState(editing.containerId);
  const [deleteArmed, setDeleteArmed] = useState(false);

  return (
    <Dialog
      title="编辑封面"
      eyebrow="EDIT COVER"
      description="调整封面名称，或将它移动到另一个评分等级。"
      onClose={onClose}
      footer={
        <>
          <button className="button button--ghost" type="button" onClick={onClose}>
            取消
          </button>
          <button
            className="button button--primary"
            type="button"
            onClick={() => onSave({ name, targetId, deleteItem: false })}
          >
            <Save size={16} />
            保存
          </button>
        </>
      }
      danger={
        <>
          <div className="dialog__danger-copy">
            <strong>{deleteArmed ? "确认移除这个封面？" : "删除封面"}</strong>
            <span>
              {deleteArmed
                ? "再次点击右侧按钮后，将从当前榜单中移除。"
                : "此操作不可撤销，删除前需要再次确认。"}
            </span>
          </div>
          <button
            className={`button button--danger${deleteArmed ? " button--danger-confirm" : ""}`}
            type="button"
            onClick={() => {
              if (!deleteArmed) {
                setDeleteArmed(true);
                return;
              }
              onSave({ name, targetId, deleteItem: true });
            }}
          >
            <Trash2 size={16} />
            {deleteArmed ? "确认删除" : "删除"}
          </button>
        </>
      }
    >
      <label className="field">
        <span>名称</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
      </label>
      <label className="field">
        <span>移动到</span>
        <select
          value={targetId}
          onChange={(event) => setTargetId(event.target.value)}
        >
          <option value="unranked">待评分</option>
          {board.tiers.map((tier) => (
            <option key={tier.id} value={tier.id}>{tier.label}</option>
          ))}
        </select>
      </label>
    </Dialog>
  );
}