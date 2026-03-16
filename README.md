# Obsidian Ollama Chat

An Obsidian plugin that brings local AI chat directly into your vault, powered by a locally-hosted [Ollama](https://ollama.com) instance.

## Features

- **Multi-tab chat** — open multiple independent conversations simultaneously
- **Context-aware** — automatically includes content from your active note (file path, tags, surrounding text near your cursor)
- **Streaming responses** — responses appear in real time as the model generates them
- **Note summarization** — generate an AI summary inserted as a callout block at the top of any note
- **Elaboration view** — select text from any assistant response to open a focused follow-up conversation
- **Auto-generated titles** — conversations are named automatically based on their content
- **Save to vault** — persist chats as markdown notes in a configurable folder
- **Model switching** — dynamically switch between any model available in your Ollama instance

## Requirements

- [Obsidian](https://obsidian.md) v1.4.0 or later (desktop only)
- [Ollama](https://ollama.com) running locally (default: `http://localhost:11434`)
- At least one Ollama model installed (e.g. `ollama pull llama3.2`)

## Installation

### Manual

1. Download or clone this repository.
2. Run `npm install && npm run build` to produce `main.js`.
3. Copy `main.js`, `manifest.json`, and `styles.css` into your vault at:
   ```
   <vault>/.obsidian/plugins/obsidian-ollama-chat/
   ```
4. In Obsidian, go to **Settings → Community plugins**, enable the plugin.

### Development

```bash
git clone <repo-url>
cd obsidian-chat
npm install

# Development build (with sourcemaps, rebuilds on change)
npm run dev

# Production build
npm run build
```

Symlink or copy the output into your vault's plugin folder, then reload Obsidian.

## Usage

| Action | How |
|--------|-----|
| Open chat | Ribbon icon (message-square) or `Mod+Shift+A` |
| New chat tab | "+" button in the chat toolbar |
| Summarize note | Command palette → "Summarize note", or right-click in editor |
| Elaborate on text | Select text in an assistant message → "Elaborate" or "Ask about this" |
| Stop generation | "Stop" button while a response is streaming |
| Save conversation | Save button in toolbar, or close the tab (prompts to save if there are messages) |

## Configuration

Open **Settings → Ollama Chat** to configure:

| Setting | Default | Description |
|---------|---------|-------------|
| Model | `llama3.2` | Ollama model to use |
| Base URL | `http://localhost:11434/api` | Ollama API endpoint |
| Context window lines | `40` | Lines of note content included as context |
| System prompt prefix | *(see settings)* | Prepended to every system prompt |
| Save folder | `AI Chats` | Vault folder where conversations are saved |
| Prompt to save on close | `true` | Ask before discarding unsaved chats |

## Project Structure

```
src/
├── main.ts                  # Plugin entry point
├── settings.ts              # Settings definitions and UI
├── styles.css               # Plugin stylesheet
├── chat/
│   ├── ChatView.ts          # Tabbed chat interface
│   ├── ChatSession.ts       # Chat state and streaming logic
│   ├── ElaborateView.ts     # Elaboration sidebar
│   └── renderMessage.ts     # Message rendering and selection UI
├── context/
│   └── buildContext.ts      # Builds context from the active file
└── commands/
    ├── registerCommands.ts  # Command palette and ribbon setup
    └── summarizeNote.ts     # Note summarization logic
```

## Tech Stack

- **TypeScript** — primary language
- **Obsidian API** — plugin framework
- **[Vercel AI SDK](https://sdk.vercel.ai)** — streaming text generation abstraction
- **[ollama-ai-provider](https://github.com/sgomez/ollama-ai-provider)** — Ollama integration for the AI SDK
- **esbuild** — bundler

## License

MIT
