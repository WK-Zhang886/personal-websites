# Showcase Mode Design

## Goal

Add a beautiful presentation mode for the personal tier-list site so the same board can be edited efficiently and shown/exported as a polished archive poster.

## Direction

The app should keep the current editing workflow: upload covers, paste screenshots, drag between tiers, edit labels, and autosave locally. A new showcase mode changes the visual treatment only: sidebar and edit controls retreat, the board gains a stronger archive title area, poster rows become denser and more cinematic, and the unranked dock is hidden so the result reads like a finished ranking image.

## Behavior

- Add a toolbar button named `展示模式` / `编辑模式`.
- In showcase mode, apply an `is-showcase` class to the app shell.
- Hide editing-only controls from the exported board through existing `data-export-ignore`.
- Exported images should temporarily use showcase mode so saved PNGs match the polished presentation layout.
- Drag, upload, paste, autosave, and editing remain unchanged in editing mode.

## Visual Requirements

- Showcase mode should feel like a personal media archive, not an admin dashboard.
- The board should have a dramatic framed background, compact poster-wall rows, and a stronger title/header.
- Tier labels remain editable in normal mode and readable in showcase mode.
- Laptop view must fit the useful board area without requiring the user to hunt below the fold.

## Verification

- Add source/CSS tests proving the toggle, showcase class, export behavior, and showcase styles exist.
- Run the full test suite, lint the changed files, build, and verify in the browser at desktop and laptop-like sizes.
