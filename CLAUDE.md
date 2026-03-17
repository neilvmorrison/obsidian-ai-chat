# Obsidian Ollama Chat — Claude Guide

## Project Overview

An Obsidian plugin providing local AI chat powered by Ollama. Multi-tab conversations, context-aware prompting from the active note, streaming responses, and elaboration workflows.

**Plugin ID**: `obsidian-ollama-chat`
**Min Obsidian**: 1.4.0
**Desktop only**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript 5.0+ (strict) |
| Framework | Obsidian Plugin API |
| AI/Streaming | Vercel AI SDK v4.0+ |
| LLM | ollama-ai-provider → local Ollama |
| Bundler | esbuild (CommonJS output) |
| DOM | Native DOM + Obsidian MarkdownRenderer |
| CSS | Plain CSS with Obsidian CSS variables |

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
└── context/
    └── buildContext.ts      # Active note context builder
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
  model: string;              // default: "llama3.2"
  baseURL: string;            // default: "http://localhost:11434/api"
  contextWindowLines: number; // default: 40
  systemPromptPrefix: string;
  saveFolder: string;         // default: "AI Chats"
  promptSaveOnClose: boolean; // default: true
  hotkey: string;             // default: "Mod+Shift+A"
}
```

## Architecture Patterns

### Stream-First Rendering
1. `<pre>` element shows raw chunks as they stream
2. On completion → re-render with Obsidian `MarkdownRenderer`
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
- Don't add external UI component libraries — DOM is built via `createEl()`
- Don't forget `.oac-` prefix on new CSS classes
- Don't use `document.querySelector` — use `containerEl.querySelector()` or Obsidian helpers
- Don't add bundled dependencies that Obsidian provides at runtime (codemirror, electron)

## Adding Features Checklist

- [ ] New commands → add to `registerCommands.ts`
- [ ] New settings → add to `OllamaChatSettings` in `settings.ts` with default + UI
- [ ] New CSS → add to `styles.css` with `.oac-` prefix
- [ ] New views → register in `main.ts` `onload()`
- [ ] All streaming → use Vercel AI SDK `streamText()` pattern from `ChatSession.ts`
