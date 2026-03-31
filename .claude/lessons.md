# Lessons Learned

Auto-updated by CI on every PR merged to main. Do not edit the section headers — add entries under the appropriate section. Human edits to entries are welcome and will not be overwritten.

Each entry should be a durable convention, architectural constraint, or discovered gotcha. Ephemeral task notes do not belong here.

---

## Testing

<!-- How to write and run tests in this repo: mocking patterns, test setup quirks, what needs real infra vs. mocks -->

## Architecture & Patterns

**Sharing state between an `EditorSuggest` and a CM6 `ViewPlugin`/keymap:** Use a plain mutable ref object (`{ current: T | null }`) created in `main.ts` and passed to both via constructor/closure. This avoids CM6 `StateField`/`StateEffect` complexity when the state doesn't need to participate in CM6's undo history. The ref is read synchronously at keypress time and mutated by the `EditorSuggest`. The `ViewPlugin` reads it on every `update()` call to decide whether to render decorations.

**CM6 line indexing vs. Obsidian `EditorPosition`:** Obsidian's `EditorPosition.line` is 0-indexed. CM6's `doc.line(n)` is 1-indexed. When converting, use `doc.line(obsidianLine + 1).from + ch` to get a CM6 document offset. When going the other direction, `doc.lineAt(offset).number - 1` gives the 0-indexed line.

**Triggering a CM6 `ViewPlugin` update without document/selection changes:** `view.dispatch({})` (empty TransactionSpec) dispatches a no-op transaction that still triggers `ViewPlugin.update()`. Useful when external mutable state has changed (e.g., clearing `pendingRef.current` on Escape) and you need the plugin to re-evaluate its decorations.

**CM6 `WidgetType.eq()` for stable widgets:** If a widget has no internal state and should be considered identical to any other instance of the same class, return `true` from `eq()`. This lets CM6 reuse the existing DOM node on updates instead of recreating it, avoiding unnecessary DOM churn.

## Components & UI

<!-- Component ownership, what to reuse vs. create, design system constraints -->

## Infrastructure & Environment

<!-- Build quirks, CI environment differences, env var dependencies, local dev setup gotchas -->

## Gotchas

<!-- Non-obvious behaviors, known pitfalls, things that look one way but act another -->
