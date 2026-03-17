---
name: refactor
description: Refactor code in this Obsidian plugin codebase for clarity, consistency, and maintainability
---

You are refactoring code in an Obsidian plugin that provides local AI chat via Ollama. Review the instructions below and apply them to whatever the user has selected or asked you to refactor.

## Project conventions to enforce

**CSS**
- All CSS classes must be prefixed `.oac-`
- Use Obsidian CSS variables (`--background-primary`, `--text-normal`, `--text-muted`, etc.) — never hardcode colours
- No CSS frameworks

**DOM construction**
- Use Obsidian's `createEl()` / `createDiv()` helpers — not `document.createElement()`
- Use `containerEl.querySelector()` — not `document.querySelector()`
- Never use inline styles; use CSS classes

**TypeScript**
- Strict mode is on — no implicit `any`, no `!` non-null assertions unless unavoidable
- Use `async/await` — not raw `.then()` chains
- Keep `ChatSession` as the single source of truth for conversation state — don't duplicate message arrays in views
- Views (ChatView, ElaborateView) should orchestrate UI only; business logic belongs in ChatSession or helpers

**Streaming**
- Always use the Vercel AI SDK `streamText()` pattern (see ChatSession.ts)
- Raw chunks → `<pre>` element; final render → Obsidian `MarkdownRenderer.render()`
- Always attach an `AbortController` and expose `abort()` to allow cancellation

**Naming**
- Tab state lives in `Tab` interface objects — don't add properties directly to DOM elements
- Event handlers should be arrow functions assigned to named variables so they can be removed with `removeEventListener`

**File placement**
- New commands → `src/commands/registerCommands.ts`
- New settings → `OllamaChatSettings` in `src/settings.ts` with a default value and a settings UI widget
- New views → registered in `src/main.ts` `onload()`
- New CSS → `src/styles.css`

## Refactoring steps

1. **Read** the target file(s) in full before making any changes.
2. **Identify** violations of the conventions above, plus general issues:
   - Functions doing more than one thing
   - Duplicated logic across ChatView / ElaborateView
   - Magic strings/numbers that should be constants
   - Missing `removeEventListener` / memory leaks
   - Unclear variable names
3. **Plan** the changes as a short list and confirm with the user if the scope is large.
4. **Apply** changes in minimal diffs — preserve existing behaviour exactly.
5. **Check** that all CSS classes still start with `.oac-`, all new TS is strict-clean, and no Obsidian runtime deps were accidentally bundled.
6. **Do not** add docstrings, comments, or type annotations to code you didn't change. Only comment non-obvious logic.
