# Project Identity

This is an AI-Chat integration plugin for Obsidian

# Source Map

```
src/
├── main.ts                      # Plugin entrypoint, view registration, settings persistence
├── settings.ts                  # OllamaChatSettings interface + settings tab UI
├── styles.css                   # Global styles (.oac- prefix)
├── chat/
│   ├── ChatView.ts              # Main chat pane (ItemView), multi-tab, model select
│   ├── ChatSession.ts           # Session state, streaming, title gen, markdown serialization
│   ├── ElaborateView.ts         # Focused single-prompt view with auto-send
│   ├── renderMessage.ts         # Chunk -> <pre>, finalize via MarkdownRenderer
│   ├── AgentSession.ts          # Tool-call agent loop, confirmation callback
│   └── InlineGenerateSuggest.ts # /generate editor suggest, inline streaming
├── ui/
│   ├── index.ts                 # Barrel export
│   ├── InputArea.ts             # Auto-resize textarea, send/abort actions
│   ├── MessageList.ts           # Scrollable message container + scroll-to-bottom
│   ├── TabBar.ts                # Tab row, new-chat button
│   ├── StreamingControls.ts     # Send/abort buttons + loading state
│   ├── ModelSelect.ts           # Ollama model dropdown
│   ├── IconButton.ts            # Reusable icon button
│   └── EmptyState.ts            # Empty tab placeholder
├── commands/
│   ├── registerCommands.ts      # Ribbon, command palette, editor context menu
│   └── summarizeNote.ts         # Summarize active note -> ElaborateView
└── context/
    └── buildContext.ts          # File metadata, cursor-relative context window
```

# Code Priorities

- Small files (< 300 lines)
- Test-driven development
- Well documented and readable

# Maintenance

After completing any task that adds, removes or moves files, update the source map above to reflect the current state of the codebase, don't wait to bes asked. This is a part of every task.

# What never to do:

- use external CSS frameworks
- make assumptions about critical tech-decisions
- generate boilerplate or placeholder code (unless explicitly asked)

# Task Completion Checklist

- [ ] claude.md Project Structure section reflects current directory
- [ ] New modules have a one-line description in the structure
- [ ] Deleted files are removed from the structure
