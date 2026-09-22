# Premium Game Archive UI Design

## Goal

Restyle the existing tier-list page so it feels like a personal game archive instead of a SaaS dashboard, without changing storage, drag-and-drop, upload, paste, autosave, backup, or ranking logic.

## Approved Direction

Use the user's requested direction: Steam player profile + Tier Maker + game collection archive. The mood is Dark Premium UI, Game Archive, and Personal Collection.

## Visual Requirements

- Replace the old cyan-heavy archive look with a darker premium palette:
  - Background: `#090D12`
  - Card: `#151A21`
  - Floating layer: `#1C232D`
  - Primary accent: `#7C5CFF`
  - Secondary accent: `#38BDF8`
- Reduce table-like borders and use fewer, softer dividers.
- Increase visual depth through rounded panels, shadows, and layered surfaces.
- Use a stronger font stack: Inter / Space Grotesk for English and HarmonyOS Sans / Source Han Sans / Microsoft YaHei for Chinese fallback.
- Rename the product feel from generic personal rating to game archive:
  - `个人游戏档案`
  - `MY GAME ARCHIVE`
- Tier labels should read like game ratings:
  - `S TIER` with a sublabel such as `MASTERPIECE`
  - `A TIER`, `B TIER`, etc.
- Game cards should look like premium cover cards:
  - Fixed poster ratio
  - Rounded corners
  - Shadow
  - Visible name plate
  - Subtle hover lift
  - Dragging/chosen states should feel animated
- Keep laptop ergonomics for 14-inch displays:
  - No horizontal page scrolling
  - Tier lanes wrap cards automatically
  - Cards fit around 100-120px wide and 140-170px tall on normal editing view

## Non-Goals

- Do not redesign the data model.
- Do not change upload, paste, drag, autosave, backup, or export behavior.
- Do not add heavy external dependencies or remote imagery.

## Verification

- Add tests for the palette, font stack, game archive copy, tier label subtext, card sizing, rounded/shadow styling, and laptop-safe wrapping.
- Verify in the browser at 1920x1080 and 1920x1200-like layouts.
