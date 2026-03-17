# Obsidian Ollama Chat — Claude Guide

## Project Overview

An Obsidian plugin providing local AI chat powered by Ollama. Multi-tab conversations, context-aware prompting from the active note, streaming responses, and elaboration workflows.

**Plugin ID**: `obsidian-ollama-chat`
**Min Obsidian**: 1.4.0
**Desktop only**

## Tech Stack

| Layer        | Technology                             |
| ------------ | -------------------------------------- |
| Language     | TypeScript 5.0+ (strict)               |
| Framework    | Obsidian Plugin API                    |
| AI/Streaming | Vercel AI SDK v4.0+                    |
| LLM          | ollama-ai-provider → local Ollama      |
| Bundler      | esbuild (CommonJS output)              |
| DOM          | Native DOM + Obsidian MarkdownRenderer |
| CSS          | Plain CSS with Obsidian CSS variables  |

## Source Structure

```
src/
├── main.ts                  # Plugin entry, lifecycle, settings tab
├── settings.ts              # OllamaChatSettings interface + defaults + UI
├── styles.css               # Plugin CSS (all selectors prefixed .oac-)
├── chat/
│   ├── ChatSession.ts       # Conversation state & streaming (core logic)
│   ├── ChatView.ts          # Tabbed chat UI (main view)
│   ├── ElaborateView.ts     # Follow-up sidebar view
│   └── renderMessage.ts     # Message DOM creation & selection popup
├── commands/
│   ├── registerCommands.ts  # Ribbon, hotkeys, context menu
│   └── summarizeNote.ts     # Note summarization feature
├── context/
│   └── buildContext.ts      # Active note context builder
└── ui/
    ├── signals.ts           # signal() reactive primitive
    ├── append.ts            # append() DOM composition helper
    ├── primitives/          # Stateless leaf components: Button, Icon, Textarea, Input, Spinner
    └── components/          # Stateful composed components: MessageBubble, ChatInputBar, TabBar, TypingIndicator
```

## Key Interfaces

```typescript
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Tab {
  id: string;
  session: ChatSession;
  messageListEl: HTMLElement;
  tabEl: HTMLButtonElement;
  closeEl: HTMLButtonElement;
}

interface OllamaChatSettings {
  model: string; // default: "llama3.2"
  baseURL: string; // default: "http://localhost:11434/api"
  contextWindowLines: number; // default: 40
  systemPromptPrefix: string;
  saveFolder: string; // default: "AI Chats"
  promptSaveOnClose: boolean; // default: true
  hotkey: string; // default: "Mod+Shift+A"
}
```

## UI Component Model

All UI is built using a **signal-driven factory pattern**. Every component is a function that returns `{ el, ...controls }`.

### Component contract

```typescript
// Primitives — stateless, no signals, just { el }
function Button(props): { el: HTMLElement };
function Icon(name): { el: HTMLElement };
function Textarea(props): { el: HTMLTextAreaElement; value: Signal<string> };

// Components — accept signals as props, may expose signals
function MessageBubble(props): { el: HTMLElement; content: Signal<string> };
function ChatInputBar(props): {
  el: HTMLElement;
  value: Signal<string>;
  clear(): void;
};
```

### Signals (`src/ui/signals.ts`)

```typescript
const content = signal(""); // create
content.set("hello"); // write
content.get(); // read
content.subscribe((v) => render(v)); // react
content.set((prev) => prev + chunk); // update from previous value
```

Signals are owned at the **call site** (view layer), not inside components. Components subscribe and reflect — they do not own state.

### append helper (`src/ui/append.ts`)

```typescript
// Accepts component objects { el } or raw HTMLElements
append(parent, avatar, contentEl, timestamp);
```

Use `append()` instead of repeated `appendChild()` calls.

### Streaming pattern

```typescript
const content = signal("");
const bubble = MessageBubble({ content, role: "assistant" });
append(messageListEl, bubble);

// On each chunk:
content.set((prev) => prev + chunk);

// On completion — re-render with MarkdownRenderer:
MarkdownRenderer.render(app, content.get(), bubble.el, sourcePath, component);
```

### Three-layer architecture

| Layer      | Location                     | Responsibility                                                             |
| ---------- | ---------------------------- | -------------------------------------------------------------------------- |
| Primitives | `src/ui/primitives/`         | Stateless leaf elements. Accept props, return `{ el }`. No signals.        |
| Components | `src/ui/components/`         | Accept signals as props, subscribe internally, compose primitives.         |
| Views      | `src/chat/`, `src/commands/` | Own signals, wire up streaming logic, compose components into full panels. |

## Architecture Patterns

### Stream-First Rendering

1. `content` signal updated on each chunk → `<pre>` reflects raw text
2. On stream completion → re-render with Obsidian `MarkdownRenderer`
3. Attach selection popup handlers to final DOM

### Tab Management

- `ChatView` holds `Tab[]` and `activeTabIndex`
- Each tab has its own independent `ChatSession`
- Switch: toggle `display` and classList on old/new tab DOM

### Context-Aware Prompting

1. `buildContext()` reads active file path, tags, cursor position
2. Extracts surrounding lines (configurable ratio before/after cursor)
3. System prompt = `systemPromptPrefix` + context block
4. Sent as system message to Ollama

### Save-on-Close Modal

- Promise-based modal returns `"save" | "discard" | "cancel"`
- Only shown when `promptSaveOnClose` is true and tab has content

## CSS Conventions

- All selectors prefixed with `.oac-` to avoid collisions
- Uses Obsidian CSS variables for theme consistency (`--background-primary`, `--text-normal`, etc.)
- No CSS frameworks

## Build & Dev

```bash
npm run dev    # watch mode with inline sourcemaps
npm run build  # minified production build → main.js
```

The bundle excludes: `obsidian`, `electron`, `@codemirror/*`, `@lezer/*` (provided by Obsidian at runtime).

## What NOT to Do

- Don't use any CSS framework — use Obsidian CSS variables
- Don't add external UI component libraries — use the component model above
- Don't forget `.oac-` prefix on new CSS classes
- Don't use `document.querySelector` — use `containerEl.querySelector()` or Obsidian helpers
- Don't add bundled dependencies that Obsidian provides at runtime (codemirror, electron)
- Don't own state inside components — signals belong to the caller (view layer)
- Don't use `innerHTML` for user or model content — always use `textContent` or `MarkdownRenderer`

## Adding Features Checklist

- [ ] New commands → add to `registerCommands.ts`
- [ ] New settings → add to `OllamaChatSettings` in `settings.ts` with default + UI
- [ ] New CSS → add to `styles.css` with `.oac-` prefix
- [ ] New views → registered in `main.ts` `onload()`
- [ ] New primitive UI element → add to `src/ui/primitives/`
- [ ] New composed UI element → add to `src/ui/components/`
- [ ] All streaming → use Vercel AI SDK `streamText()` pattern from `ChatSession.ts`
- [ ] All streaming renders → signal updated per chunk, `MarkdownRenderer` on completion
