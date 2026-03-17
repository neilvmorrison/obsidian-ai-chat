---
name: ui-dev
description: Build atomic, composable UI components for this Obsidian plugin — DRY, readable, scalable
---

You are building or reviewing UI in an Obsidian plugin. This codebase uses a **component library pattern** (analogous to React components, but using plain DOM factory functions) located in `src/ui/`. Apply the rules and patterns below whenever you create or modify UI elements.

---

## Component library location

```
src/
└── ui/
    ├── index.ts            # Re-exports all components
    ├── IconButton.ts
    ├── InputArea.ts
    ├── MessageList.ts
    ├── ModelSelect.ts
    ├── StreamingControls.ts
    ├── TabBar.ts
    └── SelectionPopup.ts
```

Each file exports a single factory function. **Views (`ChatView`, `ElaborateView`) orchestrate components — they do not build raw DOM elements themselves.**

---

## Component contract

Every component is a **factory function** that:
1. Accepts a `parent: HTMLElement` as its first argument (where to mount) plus a props object.
2. Creates its own root element using `parent.createEl()`.
3. Returns a **handle object** with the root `el` and any imperative methods needed by the caller.
4. Manages its own event listeners internally and exposes a `destroy()` method when cleanup is needed.

```typescript
// Pattern
export interface MyComponentHandle {
  el: HTMLElement;
  destroy(): void;
  // ...other imperative methods
}

export function createMyComponent(
  parent: HTMLElement,
  props: MyComponentProps,
): MyComponentHandle {
  const el = parent.createEl('div', { cls: 'oac-my-component' });
  // ...build internal DOM
  // ...wire events
  return {
    el,
    destroy() { /* removeEventListener calls */ },
  };
}
```

---

## Existing components (already extracted or to extract)

### `createIconButton(parent, { icon, label, cls?, onClick })`
Wraps a `<button>` + `setIcon()`. Use instead of repeating:
```typescript
// ❌ raw — don't do this inline in views
const btn = parent.createEl('button', { cls: 'oac-icon-btn oac-save-btn' });
setIcon(btn, 'save');
btn.setAttribute('aria-label', 'Save as Note');
btn.addEventListener('click', handler);

// ✅ component
const { el: saveBtn } = createIconButton(toolbarRight, {
  icon: 'save',
  label: 'Save as Note',
  cls: 'oac-save-btn',
  onClick: () => this.handleSave(),
});
```

### `createInputArea(parent, { placeholder?, onSend, onInput? })`
Returns `{ el, textarea, resizeTextarea() }`. Encapsulates the `<textarea>` auto-resize logic and Enter-to-send keybinding. Both `ChatView` and `ElaborateView` have **identical** `resizeTextarea()` implementations — this must live here, not in the views.

### `createStreamingControls(parent, { onAbort })`
Returns `{ el, sendBtn, abortBtn, setStreaming(bool) }`. The `setStreaming()` toggle (disable send, show/hide abort) is duplicated in both views — it belongs here.

### `createMessageList(parent)`
Returns `{ el, scrollToBottom(), showScrollBtn(), hideScrollBtn(), smartScroll() }`. Owns the scroll-to-bottom button and scroll-state logic. The `isNearBottom()` helper lives inside this component.

### `createModelSelect(parent, { currentModel, baseURL, onModelChange })`
Encapsulates the model `<select>`, the `fetchModels()` API call, and the option population. Returns `{ el, modelSelect }`.

### `createTabBar(parent, { onNewChat })`
Returns `{ el, tabsRow, addTab(label), removeTab(id), setActive(id), toolbarRight }`. Owns tab rendering; callers receive a `tabsRow` slot to append individual tab buttons into if needed.

---

## Rules

### DO

- **Always** use `parent.createEl()` / `parent.createDiv()` — never `document.createElement()`.
- **Always** prefix CSS classes with `.oac-`.
- **Always** use Obsidian CSS variables (`--background-primary`, `--text-normal`, `--interactive-accent`, etc.) — never hardcode colours.
- **Always** expose a `destroy()` method on components that attach event listeners to `document` or `window` (e.g. `SelectionPopup`).
- Keep components **single-responsibility**: one job, one file.
- Co-locate the component's CSS in `src/styles.css` under a comment block matching the component name.

### DON'T

- Don't use inline `el.style.xxx = ...` to toggle visibility — use CSS classes like `oac-hidden` / `oac-visible`, or a CSS modifier. Exception: initial `display: none` before first render.
- Don't put business logic (API calls, session state) inside components. Components are pure UI — they receive callbacks, they don't call plugin APIs directly. Exception: `createModelSelect` may do a single `fetch()` because fetching models is inherently UI-scoped.
- Don't duplicate `resizeTextarea()`, `setStreaming()`, `scrollToBottom()`, or `isNearBottom()` across views. These already exist in components — import them.
- Don't pass `plugin` into components — pass only the data the component needs (a string, a callback, etc.).
- Don't build new views without checking if an existing component already covers the pattern.

---

## Adding a new UI element — checklist

1. **Identify** whether it maps to an existing component. Check `src/ui/index.ts` exports first.
2. **If new**, create `src/ui/MyComponent.ts` following the factory function contract above.
3. **Export** it from `src/ui/index.ts`.
4. **Add CSS** in `src/styles.css` under `/* ── MyComponent ── */`.
5. **Import and compose** in the view — never inline raw DOM construction in views for anything larger than a single element.
6. **Wire destroy** — if the component registers global listeners, call `component.destroy()` in the view's `onClose()`.

---

## Refactoring existing duplication

The following are known violations to fix when touching these files:

| Duplication | Location | Extract to |
|---|---|---|
| `resizeTextarea()` | `ChatView`, `ElaborateView` | `createInputArea` |
| `setStreaming()` | `ChatView`, `ElaborateView` | `createStreamingControls` |
| `scrollToBottom()` / `isNearBottom()` | `ChatView`, `ElaborateView` | `createMessageList` |
| Icon button boilerplate | `ChatView.onOpen()` (×4 buttons) | `createIconButton` |
| Input area DOM structure | `ChatView.onOpen()`, `ElaborateView.onOpen()` | `createInputArea` |

When refactoring, preserve existing behaviour exactly — no logic changes, only extraction.

---

## Example: extracting `createStreamingControls`

```typescript
// src/ui/StreamingControls.ts
import { HTMLElement } from 'obsidian';

export interface StreamingControlsHandle {
  el: HTMLElement;
  sendBtn: HTMLButtonElement;
  abortBtn: HTMLButtonElement;
  setStreaming(streaming: boolean): void;
}

export function createStreamingControls(
  parent: HTMLElement,
  { onAbort }: { onAbort: () => void },
): StreamingControlsHandle {
  const el = parent.createEl('div', { cls: 'oac-streaming-controls' });

  const abortBtn = el.createEl('button', { cls: 'oac-abort-btn', text: 'Stop' });
  abortBtn.style.display = 'none';

  const sendBtn = el.createEl('button', { cls: 'oac-send-btn', text: 'Send' });

  const onAbortClick = () => onAbort();
  abortBtn.addEventListener('click', onAbortClick);

  return {
    el,
    sendBtn,
    abortBtn,
    setStreaming(streaming: boolean) {
      sendBtn.disabled = streaming;
      abortBtn.style.display = streaming ? 'inline-flex' : 'none';
    },
  };
}
```

Then in both views:
```typescript
// ✅ one line instead of 8
const controls = createStreamingControls(inputActions, { onAbort: () => this.session.abort() });
this.sendBtn = controls.sendBtn;   // keep reference if the view needs it
```

---

## Steps when asked to build new UI

1. **Read** the relevant view file(s) in full.
2. **Identify** which existing components to compose and what (if anything) is genuinely new.
3. **Plan** the component breakdown and confirm with the user if scope is large.
4. **Create** new component file(s) following the contract above.
5. **Update** `src/ui/index.ts` exports.
6. **Update** `src/styles.css` with scoped `.oac-` CSS.
7. **Refactor** the view to use the new component — remove the raw DOM code it replaces.
8. **Verify** no existing behaviour changed, all CSS classes start with `.oac-`, strict TypeScript is satisfied.
