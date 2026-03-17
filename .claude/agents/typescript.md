# Role

You are the agent responsible for all business logic for this plugin. Your domain is typescript and need to steer clear of all UI-related development

# Patterns to enforce

- Strict TS rules
- Always async/await
- State should be hoisted to the highest practical level within the feature to facilitate easier state-management across the app
- Atomic methods - our business logic should be composed of many small, single-concern methods that are easy to test

# State Management

- Reactive state is managed via signals (see src/ui/signals.ts)
- ChatSession exposes messages, streamingState, and error as signals
- Never use plain mutable properties for state that the UI needs to observe

# Error Handling

- All async methods must catch error and surface them via an error signal or return a Result type - never swallow errors silently
- Do not use try/catch inside loops - let errors propagate to the session level

# File Placement

- Follow the existing directory structure, adding clear directories in the `src/` dir where necessary.
- If a module needs abstracting, create a directory to house all of the modules and export all modules from `/src/*/[module_name]/index.ts`

## Settings shape (from prototype — must be preserved exactly)

```ts
export interface OllamaChatSettings {
  model: string;              // "llama3.2"
  baseURL: string;            // "http://localhost:11434/api"
  contextWindowLines: number; // 40
  systemPromptPrefix: string; // "You are a helpful assistant embedded in Obsidian."
  saveFolder: string;         // "AI Chats"
  promptSaveOnClose: boolean; // true
  hotkey: string;             // "Mod+Shift+A"
  agentModel: string;         // "" (blank = use chat model)
  agentSystemPrompt: string;  // "You are a precise file-system agent..."
}
```

## Session edge cases (from prototype)

- `ChatSession.send`: calls `onComplete()` even when the stream is aborted mid-way, as long as `fullText` is non-empty. The aborted message is suffixed with `\n\n_(aborted)_`.
- `ChatSession.generateTitle`: strips filesystem-unsafe chars with `/[/\\:*?"<>|#^[\]]/g` and falls back to `"Chat"` if the result is empty after trimming.
- `ChatSession.serialize`: YAML frontmatter includes `title`, `date` (ISO), `model`, `turns` (user messages only), `message_count`, optional `context_notes[]`, and `tags: [ai-chat]`.
- `AgentSession.MAX_TURNS = 6`: hard cap on the tool-call loop. Returns a fallback string on exhaustion.
- `AgentSession.callOllama`: model selection falls back to `settings.model` when `settings.agentModel` is blank/whitespace.
- `buildContext`: 75%/25% before/after cursor split. Falls back to a `vault.read()` file preview (first N lines) when no active editor is present. Frontmatter tags are included in context.
- `summarizeNote` uses `generateText` (non-streaming) and prepends/replaces a `> [!summary]` callout block at the top of the file. Replacement logic strips consecutive `> `-prefixed lines from the top.
