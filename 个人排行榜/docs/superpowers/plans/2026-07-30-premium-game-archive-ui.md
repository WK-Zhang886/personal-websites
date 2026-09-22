# Premium Game Archive UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the current tier-list app into a dark premium personal game archive without changing core behavior.

**Architecture:** Keep the existing React component structure and storage/drag logic. Make limited JSX copy/markup additions for visual labels, and implement the redesign in `app/globals.css`.

**Tech Stack:** React, CSS, lucide-react icons, Node test runner, ESLint, vinext.

## Global Constraints

- Do not modify storage, drag-and-drop, upload, paste, backup, autosave, or ranking logic.
- Do not add heavy dependencies or remote assets.
- Keep 14-inch laptop ergonomics: wrapping cards, no horizontal page scrolling.
- Sync final source and build output to `D:\网站`.

---

### Task 1: Visual Contract Tests

**Files:**
- Create: `tests/premium-game-archive-ui.test.mjs`

**Interfaces:**
- Consumes: `components/TierApp.jsx` and `app/globals.css`.
- Produces: tests that fail until the premium game archive visual system exists.

- [ ] **Step 1: Write failing tests for copy and CSS tokens**

Check for `个人游戏档案`, `MY GAME ARCHIVE`, `S TIER`, `MASTERPIECE`, `#090d12`, `#151a21`, `#1c232d`, `#7c5cff`, `Space Grotesk`, `.tier-rank__sub`, and premium card sizing/shadows.

- [ ] **Step 2: Run the test to confirm failure**

Run the new test file with the bundled Node executable. Expected: failures for missing copy and CSS selectors.

### Task 2: JSX Visual Markup

**Files:**
- Modify: `components/TierApp.jsx`

**Interfaces:**
- Produces: game archive brand copy, game archive heading labels, and tier sublabels.

- [ ] **Step 1: Update UI copy only**

Change brand and headline copy to `个人游戏档案`, `MY GAME ARCHIVE`, and `GAME ARCHIVE`.

- [ ] **Step 2: Add visual-only tier label subtext**

Add a small `tier-rank__sub` element based on tier position. This must not affect tier data.

- [ ] **Step 3: Run visual contract tests**

Expected: JSX assertions pass; CSS assertions still fail.

### Task 3: Premium CSS

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: existing class names and new `.tier-rank__sub`.
- Produces: dark premium palette, card hierarchy, rounded poster cards, softer tier rows, laptop-safe wrapping.

- [ ] **Step 1: Replace palette and font stack**

Use requested dark premium colors and stronger font stack.

- [ ] **Step 2: Restyle shell, sidebar, topbar, board frame, tier rows, and rank cards**

Reduce hard table borders, add rounded panels/shadows, make cards 104x152px with hover lift and visible name plate.

- [ ] **Step 3: Update responsive card sizes**

Keep no horizontal page scroll; reduce card sizes on smaller breakpoints.

- [ ] **Step 4: Run visual contract tests**

Expected: all premium UI tests pass.

### Task 4: Verification And Sync

**Files:**
- Modify: none unless QA finds a defect.

**Interfaces:**
- Produces: verified local app and synced copy in `D:\网站`.

- [ ] **Step 1: Run all tests, lint, and production build**

Expected: all pass.

- [ ] **Step 2: Browser QA**

Check default and showcase/edit modes at laptop-sized layouts. Confirm no horizontal scroll and no overlapping controls.

- [ ] **Step 3: Sync to user folder**

Copy changed source, tests, docs, and `dist` to `D:\网站`.
