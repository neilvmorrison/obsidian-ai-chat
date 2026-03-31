# CLAUDE.md

## Overview

obsidian-chat is an Obsidian desktop plugin that embeds a React 18 chat sidebar powered by a locally running Ollama LLM instance. It is a single-app plugin (desktop only) that communicates with Ollama's OpenAI-compatible REST API at `http://localhost:11434`. It also adds `/generate` and `/ask` slash commands to the Obsidian editor via an `EditorSuggest` extension.

## Commands

### Setup
```bash
npm install
```

### Development
```bash
node esbuild.config.mjs             # Dev build (watch mode)
node esbuild.config.mjs production  # Production build → main.js + styles.css
```

### Type checking
```bash
tsc --noEmit
```

No test, lint, format, migrate, or docker commands exist in this repo.

> **After every build:** commit `main.js` and root `styles.css` — Obsidian reads compiled artifacts directly from the repo.

## Architecture

**Pattern:** Obsidian Plugin + Embedded React SPA (plugin-in-sidebar)

**Main data flow:**
```
Hotkey (Cmd+Shift+A) / ribbon click
  → ReactPlugin.activateView()           [src/main.ts]
    → ReactView.onOpen()                 [src/view.ts]
      → createRoot().render(<App />)
        → useStreamChat()                [src/hooks/useStreamChat.ts]
          → streamText() via Vercel AI SDK
            → Ollama local API (http://localhost:11434/v1)
              → rAF-batched setMessages() → MessageList → MarkdownMessage
```

**Inline editor commands flow:**
```
User types /generate or /ask in editor
  → InlineCommandSuggest                 [src/editor/InlineCommandSuggest.ts]
    /generate → InlinePromptModal → generateText() → editor.replaceRange()
    /ask      → InlinePromptModal → activateView() with pre-filled prompt
```

**Key layers:**

| Layer | Location | Responsibility |
|-------|----------|---------------|
| Plugin entry | `src/main.ts` | Registers view, hotkey, ribbon, editor suggest, file-open handler |
| View bridge | `src/view.ts` | Mounts React root; bridges Obsidian `setState` to React props |
| Root component | `src/components/App.tsx` | All tab state (`tabs[]`, `activeTabId`); delegates AI to `useStreamChat` |
| AI hook | `src/hooks/useStreamChat.ts` | Streaming, model fetch, AbortController, rAF batching |
| Ollama config | `src/lib/ollama.ts` | Base URL + default model (single source of truth) |
| Editor commands | `src/editor/InlineCommandSuggest.ts` | `/generate` + `/ask` slash commands |
| Persistence | `src/utils/saveChat.ts` + `parseChatNote.ts` | Chat serialization/deserialization to vault notes |
| Context | `src/contexts/ObsidianAppContext.tsx` | Provides Obsidian `App` instance to React tree |

> Full directory tree, module breakdown, and static pitfalls:
> [`.claude/docs/architecture.md`](.claude/docs/architecture.md)

> Conventions and gotchas discovered during development:
> [`.claude/lessons.md`](.claude/lessons.md)

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Plugin framework | Obsidian Plugin API | latest |
| UI framework | React | 18.3.1 |
| UI primitives | Radix UI | various |
| Styling | Tailwind CSS v4 | 4.2.2 |
| Icons | lucide-react | ^1.0.1 |
| AI SDK | Vercel AI SDK (`ai`) | ^6.0.137 |
| LLM provider | `@ai-sdk/openai` (OpenAI-compat) | ^3.0.48 |
| LLM runtime | Ollama (local) | `http://localhost:11434` |
| Markdown renderer | react-markdown | ^10.1.0 |
| Math rendering | rehype-katex + KaTeX | ^7.0.1 / ^0.16.40 |
| Diagrams | mermaid | ^11.13.0 |
| Build tool | esbuild | ^0.21.0 |
| CSS build | @tailwindcss/cli | ^4.2.2 |
| Language | TypeScript | ^5.0.0 (strict) |
| Package manager | npm | — |
| Test runner | N/A | — |
| Linter/Formatter | N/A | — |

## Development Setup

### Prerequisites
- Node.js (check `.nvmrc` if present)
- Ollama installed and running — https://ollama.com
- An Obsidian vault with this plugin installed (symlink or copy to `.obsidian/plugins/obsidian-ollama-chat/`)

### First-time setup
```bash
npm install
ollama pull llama3.2        # Pull the default model
node esbuild.config.mjs     # Build (watch mode for development)
```

### Local Ollama
All AI features require Ollama running at `http://localhost:11434`. Start it with:
```bash
ollama serve
```

The base URL and default model are hardcoded in `src/lib/ollama.ts`. There is no configuration UI or `.env` file.

### Deploying to Obsidian vault
```bash
node esbuild.config.mjs production
# Then copy main.js, styles.css, manifest.json to:
# <vault>/.obsidian/plugins/obsidian-ollama-chat/
```

## Coding Standards

Files: `camelCase.tsx` for React, `snake_case.ts` for `lib/`+`utils/`. Interfaces: `IPascalCase`. No `any` — extend existing types. Components must use `useCallback`/`useMemo`/`memo`. Tailwind classes require `chat:` prefix (e.g., `chat:flex`). Custom CSS uses `oac-*` prefix.

Full rules (naming, required patterns, forbidden patterns, build constraints):
[`.claude/docs/coding-standards.md`](.claude/docs/coding-standards.md)

## Agent Workflow

Before reporting any task as complete, run the self-reviewer sub-agent:

1. Use the Task tool to invoke `self-reviewer`.
2. If it returns issues, fix them and invoke it again.
3. Only tell the user "done" after it outputs `APPROVED`.

## Maintenance

This Claude context is actively maintained. When making changes, update these files as you go:

**Update `.claude/docs/architecture.md` when:**
- Adding, removing, or renaming a module, hook, component, or layer
- Changing the data flow (new middleware, new abstraction, new external integration)
- Refactoring the directory structure
- Finding a static pitfall (HACK/FIXME, non-obvious config, environment setup issue)

**Update `.claude/lessons.md` when:**
- Discovering how something should be tested or mocked in this repo
- Learning a constraint about a component or module that isn't obvious from the code
- Finding a gotcha during implementation that future agents should know about

**Update `.claude/docs/coding-standards.md` when:**
- A new naming or pattern convention is established
- TypeScript config changes (stricter flags, new `tsconfig.json` rules)
- Build config changes affecting what can/cannot be imported

**Update this file (CLAUDE.md) when:**
- New scripts added to `package.json`
- Ollama base URL or default model changes
- New coding conventions established not captured in coding-standards.md

Do not wait for a scheduled review — update these files in the same PR as the change.
