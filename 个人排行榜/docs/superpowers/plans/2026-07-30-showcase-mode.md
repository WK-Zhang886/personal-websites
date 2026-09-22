# Showcase Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished presentation mode for the existing personal tier-list app.

**Architecture:** Keep one React state flag in `TierApp.jsx` and use CSS state classes for the visual switch. Reuse the existing board export ref so the exported PNG captures the same showcase treatment.

**Tech Stack:** React, CSS, html-to-image, Node test runner, ESLint, vinext.

## Global Constraints

- Do not remove current editing functions: upload, paste, drag, label editing, autosave, backup, and item editing.
- Do not add new heavy dependencies.
- Keep the site local-friendly and sync final source/build to `D:\网站`.

---

### Task 1: Showcase State And Export

**Files:**
- Modify: `components/TierApp.jsx`
- Test: `tests/showcase-mode.test.mjs`

**Interfaces:**
- Produces: `showcaseMode: boolean`, `setShowcaseMode(boolean)`, and `app-shell is-showcase`.
- Produces: export temporarily enables showcase styling before rendering the PNG.

- [ ] **Step 1: Write failing source test**

```js
assert.match(source, /展示模式/);
assert.match(source, /编辑模式/);
assert.match(source, /is-showcase/);
assert.match(source, /setShowcaseMode\(true\)/);
```

- [ ] **Step 2: Run test and confirm it fails**

Run `node --test tests/showcase-mode.test.mjs`.

- [ ] **Step 3: Implement minimal React changes**

Add state, toggle button, app-shell class, export-mode temporary switch, and hide the unranked dock in showcase mode.

- [ ] **Step 4: Run the test and confirm it passes**

Run `node --test tests/showcase-mode.test.mjs`.

### Task 2: Showcase Visual System

**Files:**
- Modify: `app/globals.css`
- Test: `tests/showcase-mode.test.mjs`

**Interfaces:**
- Consumes: `.app-shell.is-showcase`.
- Produces: `.showcase-switch`, `.showcase-badge`, `.showcase-stat`, `.is-showcase .board-frame`, `.is-showcase .tier-row`, `.is-showcase .rank-card`.

- [ ] **Step 1: Write failing CSS test**

```js
assert.match(css, /\.showcase-switch\s*{/);
assert.match(css, /\.is-showcase \.board-frame\s*{/);
assert.match(css, /\.is-showcase \.rank-card\s*{/);
assert.match(css, /\.is-showcase \.unranked--dock\s*{/);
```

- [ ] **Step 2: Run test and confirm it fails**

Run `node --test tests/showcase-mode.test.mjs`.

- [ ] **Step 3: Implement CSS**

Style the toggle button and showcase mode with a framed archive poster layout, hidden editing controls, stronger heading, denser rows, and responsive sizing.

- [ ] **Step 4: Run test and confirm it passes**

Run `node --test tests/showcase-mode.test.mjs`.

### Task 3: Verification And Sync

**Files:**
- Modify: none unless verification reveals a defect.

**Interfaces:**
- Produces: a working local site in the project and synced copy in `D:\网站`.

- [ ] **Step 1: Run full automated checks**

Run node tests, ESLint on changed files, and `vinext build`.

- [ ] **Step 2: Verify visually**

Open `http://localhost:3000/`, toggle showcase mode, inspect desktop and laptop-sized layouts, and check that no controls overlap.

- [ ] **Step 3: Sync to user folder**

Copy changed source and current build output to `D:\网站`.
