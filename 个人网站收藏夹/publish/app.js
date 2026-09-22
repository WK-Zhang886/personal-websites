const storageKey = "personal-bookmark-site:v1";

const starterBookmarks = [
  {
    id: crypto.randomUUID(),
    name: "GitHub",
    url: "https://github.com",
    tags: ["开发", "代码"],
    notes: "代码托管、项目协作和开源资料。",
    pinned: true,
    createdAt: Date.now() - 5000,
  },
  {
    id: crypto.randomUUID(),
    name: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    tags: ["学习", "前端"],
    notes: "查询 HTML、CSS、JavaScript 文档。",
    pinned: true,
    createdAt: Date.now() - 4000,
  },
  {
    id: crypto.randomUUID(),
    name: "Figma Community",
    url: "https://www.figma.com/community",
    tags: ["设计", "灵感"],
    notes: "找设计模板、组件和视觉参考。",
    pinned: false,
    createdAt: Date.now() - 3000,
  },
  {
    id: crypto.randomUUID(),
    name: "Notion",
    url: "https://www.notion.so",
    tags: ["效率", "笔记"],
    notes: "整理文档、资料库和个人计划。",
    pinned: false,
    createdAt: Date.now() - 2000,
  },
];

const state = {
  bookmarks: loadBookmarks(),
  activeTag: "全部",
  query: "",
  sort: "pinned",
};

const elements = {
  addBookmarkBtn: document.querySelector("#addBookmarkBtn"),
  bookmarkDialog: document.querySelector("#bookmarkDialog"),
  bookmarkForm: document.querySelector("#bookmarkForm"),
  closeDialogBtn: document.querySelector("#closeDialogBtn"),
  cancelBtn: document.querySelector("#cancelBtn"),
  deleteBtn: document.querySelector("#deleteBtn"),
  dialogTitle: document.querySelector("#dialogTitle"),
  bookmarkId: document.querySelector("#bookmarkId"),
  nameInput: document.querySelector("#nameInput"),
  urlInput: document.querySelector("#urlInput"),
  tagsInput: document.querySelector("#tagsInput"),
  notesInput: document.querySelector("#notesInput"),
  pinnedInput: document.querySelector("#pinnedInput"),
  searchInput: document.querySelector("#searchInput"),
  sortSelect: document.querySelector("#sortSelect"),
  tagStrip: document.querySelector("#tagStrip"),
  bookmarkGrid: document.querySelector("#bookmarkGrid"),
  emptyState: document.querySelector("#emptyState"),
  totalCount: document.querySelector("#totalCount"),
  tagCount: document.querySelector("#tagCount"),
  pinnedCount: document.querySelector("#pinnedCount"),
  template: document.querySelector("#bookmarkTemplate"),
  resetBtn: document.querySelector("#resetBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  importFile: document.querySelector("#importFile"),
};

function loadBookmarks() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return starterBookmarks;

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : starterBookmarks;
  } catch {
    return starterBookmarks;
  }
}

function saveBookmarks() {
  localStorage.setItem(storageKey, JSON.stringify(state.bookmarks));
}

function normalizeUrl(url) {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getAllTags() {
  return [...new Set(state.bookmarks.flatMap((bookmark) => bookmark.tags))].sort((a, b) =>
    a.localeCompare(b, "zh-CN"),
  );
}

function getFilteredBookmarks() {
  const query = state.query.toLowerCase();
  const filtered = state.bookmarks.filter((bookmark) => {
    const matchesTag = state.activeTag === "全部" || bookmark.tags.includes(state.activeTag);
    const haystack = [bookmark.name, bookmark.url, bookmark.notes, ...bookmark.tags].join(" ").toLowerCase();
    return matchesTag && haystack.includes(query);
  });

  return filtered.sort((a, b) => {
    if (state.sort === "name") return a.name.localeCompare(b.name, "zh-CN");
    if (state.sort === "recent") return b.createdAt - a.createdAt;
    return Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name, "zh-CN");
  });
}

function renderTags() {
  const tags = ["全部", ...getAllTags()];
  const menu = document.createElement("details");
  menu.className = "category-menu";
  menu.open = state.activeTag !== "全部";

  const summary = document.createElement("summary");
  summary.innerHTML = `
    <span>全部</span>
    <strong>${state.activeTag === "全部" ? "所有分类" : state.activeTag}</strong>
  `;

  const options = document.createElement("div");
  options.className = "category-options";
  options.replaceChildren(
    ...tags.map((tag) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `category-option${tag === state.activeTag ? " active" : ""}`;
      button.textContent = tag;
      button.addEventListener("click", () => {
        state.activeTag = tag;
        render();
      });
      return button;
    }),
  );

  menu.append(summary, options);
  elements.tagStrip.replaceChildren(menu);
}

function renderStats() {
  elements.totalCount.textContent = state.bookmarks.length;
  elements.tagCount.textContent = getAllTags().length;
  elements.pinnedCount.textContent = state.bookmarks.filter((bookmark) => bookmark.pinned).length;
}

function renderBookmarks() {
  const bookmarks = getFilteredBookmarks();
  elements.bookmarkGrid.replaceChildren(
    ...bookmarks.map((bookmark) => {
      const node = elements.template.content.firstElementChild.cloneNode(true);
      const icon = node.querySelector(".site-icon");
      const pin = node.querySelector(".pin");
      const title = node.querySelector("h2");
      const link = node.querySelector("a");
      const notes = node.querySelector("p");
      const tagList = node.querySelector(".tag-list");
      const visitBtn = node.querySelector(".visit-btn");
      const editBtn = node.querySelector(".edit-btn");

      icon.textContent = getInitials(bookmark.name);
      pin.textContent = bookmark.pinned ? "★" : "☆";
      pin.classList.toggle("active", bookmark.pinned);
      title.textContent = bookmark.name;
      link.href = bookmark.url;
      link.textContent = getHostname(bookmark.url);
      notes.textContent = bookmark.notes || "暂无备注。";
      tagList.replaceChildren(
        ...bookmark.tags.map((tag) => {
          const span = document.createElement("span");
          span.textContent = tag;
          return span;
        }),
      );

      pin.addEventListener("click", () => togglePinned(bookmark.id));
      visitBtn.addEventListener("click", () => window.open(bookmark.url, "_blank", "noreferrer"));
      editBtn.addEventListener("click", () => openDialog(bookmark));

      return node;
    }),
  );

  elements.emptyState.hidden = bookmarks.length > 0;
}

function render() {
  renderTags();
  renderStats();
  renderBookmarks();
}

function openDialog(bookmark = null) {
  elements.bookmarkForm.reset();
  elements.bookmarkId.value = bookmark?.id || "";
  elements.dialogTitle.textContent = bookmark ? "编辑网站" : "添加网站";
  elements.deleteBtn.hidden = !bookmark;

  if (bookmark) {
    elements.nameInput.value = bookmark.name;
    elements.urlInput.value = bookmark.url;
    elements.tagsInput.value = bookmark.tags.join(", ");
    elements.notesInput.value = bookmark.notes;
    elements.pinnedInput.checked = bookmark.pinned;
  }

  elements.bookmarkDialog.showModal();
  elements.nameInput.focus();
}

function closeDialog() {
  elements.bookmarkDialog.close();
}

function parseTags(value) {
  const tags = value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean);

  return tags.length ? [...new Set(tags)] : ["未分类"];
}

function upsertBookmark(event) {
  event.preventDefault();

  const id = elements.bookmarkId.value || crypto.randomUUID();
  const existing = state.bookmarks.find((bookmark) => bookmark.id === id);
  const bookmark = {
    id,
    name: elements.nameInput.value.trim(),
    url: normalizeUrl(elements.urlInput.value),
    tags: parseTags(elements.tagsInput.value),
    notes: elements.notesInput.value.trim(),
    pinned: elements.pinnedInput.checked,
    createdAt: existing?.createdAt || Date.now(),
  };

  state.bookmarks = existing
    ? state.bookmarks.map((item) => (item.id === id ? bookmark : item))
    : [bookmark, ...state.bookmarks];

  saveBookmarks();
  closeDialog();
  render();
}

function deleteCurrentBookmark() {
  const id = elements.bookmarkId.value;
  state.bookmarks = state.bookmarks.filter((bookmark) => bookmark.id !== id);
  saveBookmarks();
  closeDialog();
  render();
}

function togglePinned(id) {
  state.bookmarks = state.bookmarks.map((bookmark) =>
    bookmark.id === id ? { ...bookmark, pinned: !bookmark.pinned } : bookmark,
  );
  saveBookmarks();
  render();
}

function exportBookmarks() {
  const blob = new Blob([JSON.stringify(state.bookmarks, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "my-bookmarks.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function importBookmarks(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error("Invalid bookmark file");
    state.bookmarks = imported.map((bookmark) => ({
      id: bookmark.id || crypto.randomUUID(),
      name: bookmark.name || "未命名网站",
      url: normalizeUrl(bookmark.url || "https://example.com"),
      tags: Array.isArray(bookmark.tags) && bookmark.tags.length ? bookmark.tags : ["未分类"],
      notes: bookmark.notes || "",
      pinned: Boolean(bookmark.pinned),
      createdAt: bookmark.createdAt || Date.now(),
    }));
    saveBookmarks();
    render();
  } catch {
    alert("导入失败：请选择有效的 JSON 收藏夹文件。");
  } finally {
    event.target.value = "";
  }
}

elements.addBookmarkBtn.addEventListener("click", () => openDialog());
elements.closeDialogBtn.addEventListener("click", closeDialog);
elements.cancelBtn.addEventListener("click", closeDialog);
elements.bookmarkForm.addEventListener("submit", upsertBookmark);
elements.deleteBtn.addEventListener("click", deleteCurrentBookmark);
elements.searchInput.addEventListener("input", (event) => {
  state.query = event.target.value.trim();
  renderBookmarks();
});
elements.sortSelect.addEventListener("change", (event) => {
  state.sort = event.target.value;
  renderBookmarks();
});
elements.resetBtn.addEventListener("click", () => {
  state.bookmarks = starterBookmarks.map((bookmark) => ({ ...bookmark, id: crypto.randomUUID() }));
  state.activeTag = "全部";
  state.query = "";
  elements.searchInput.value = "";
  saveBookmarks();
  render();
});
elements.exportBtn.addEventListener("click", exportBookmarks);
elements.importFile.addEventListener("change", importBookmarks);

render();
