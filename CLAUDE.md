# Project Identity

This is an AI-Chat integration plugin for Obsidian

# Source Map

```
src/
├── main.ts                      # Plugin entrypoint: registers views, commands, settings; onload/onunload lifecycle
├── styles.css                   # Plugin stylesheet: .oac- prefixed selectors, Obsidian CSS variables only
├── settings.ts                  # PROVIDER_PRESETS, DEFAULT_SETTINGS, migrate(), SettingsStore, AIChatSettingTab, AddProviderModal
├── types/
│   └── settings.ts              # ProviderType, ProviderSettings, AIChatSettings interfaces
├── providers/
│   ├── buildModel.ts            # buildModel(): maps ProviderSettings → AI SDK LanguageModel (openai-compat/anthropic/gemini)
│   └── ollamaClient.ts          # fetchOllamaModels(): fetches locally downloaded model names from GET /api/tags
├── context/
│   └── buildContext.ts          # buildContext(), extractEditorContext(), extractTags()
├── chat/
│   ├── ChatSession.ts           # ChatSession: message state as signals, send(), abort(), serialize()
│   └── renderMessage.ts         # renderMessage(): streaming <pre> preview → MarkdownRenderer.render() finalize
├── commands/
│   ├── registerCommands.ts      # registerCommands(): registers toggle-chat command and InlineGenerateSuggest
│   ├── InlineGenerateSuggest.ts # InlineGenerateSuggest: EditorSuggest that fires on /generate and streams text at cursor
│   └── summarizeNote.ts         # summarizeNote(): generateText-based summary prepended as > [!summary] callout
└── ui/
    ├── signals.ts               # signal<T>() and computed<T>() reactive primitives
    ├── index.ts                 # Barrel: re-exports all primitives, components, signals, and types
    └── components/
        ├── primitives/
        │   ├── IconButton.ts    # iconButton(): single <button> with aria-label and onClick
        │   ├── EmptyState.ts    # emptyState(): single <div> for no-content placeholder
        │   ├── Input.ts         # input(): single <input> with onChange callback
        │   ├── Textarea.ts      # textarea(): single <textarea> with onChange callback
        │   └── Select.ts        # select(): single <select> with options and onChange callback
        ├── InputArea.ts         # inputArea(): row-flex textarea + send/stop toggle + optional model-select footer
        ├── MessageList.ts       # messageList(): subscribes to messages signal, renders items or empty state
        ├── StreamingControls.ts # streamingControls(): stop button visible only while streaming (standalone, unused by ChatView/ElaborateView)
        ├── ModelSelect.ts       # modelSelect(): <select> synced to a ReadonlySignal<string> (standalone, unused by ChatView)
        ├── TabBar.ts            # tabBar(): tab buttons; owns activeTab signal
        └── views/
            ├── ChatView.ts      # ChatView: ItemView subclass; tab counter, Chat (N) title, model select in inputArea footer
            └── ElaborateView.ts # ElaborateView: ItemView subclass; applyOptions() pattern, autoSend support

__tests__/
├── main.test.ts                 # Unit tests for main.ts (lifecycle: onload/onunload)
├── settings.test.ts             # Unit tests for settings.ts
├── providers/
│   ├── buildModel.test.ts       # Unit tests for buildModel.ts
│   └── ollamaClient.test.ts     # Unit tests for ollamaClient.ts
├── chat/
│   ├── ChatSession.test.ts      # Unit tests for ChatSession.ts
│   └── renderMessage.test.ts    # Unit tests for renderMessage.ts
├── context/
│   └── buildContext.test.ts     # Unit tests for buildContext.ts
├── commands/
│   ├── registerCommands.test.ts  # Unit tests for registerCommands.ts
│   ├── InlineGenerateSuggest.test.ts # Unit tests for InlineGenerateSuggest.ts
│   └── summarizeNote.test.ts    # Unit tests for summarizeNote.ts
└── ui/
    ├── signals.test.ts          # Unit tests for signals.ts
    └── components/
        ├── primitives/
        │   ├── IconButton.test.ts   # Unit tests for IconButton
        │   ├── EmptyState.test.ts   # Unit tests for EmptyState
        │   ├── Input.test.ts        # Unit tests for Input
        │   ├── Textarea.test.ts     # Unit tests for Textarea
        │   └── Select.test.ts       # Unit tests for Select
        ├── InputArea.test.ts        # Unit tests for InputArea
        ├── MessageList.test.ts      # Unit tests for MessageList
        ├── StreamingControls.test.ts # Unit tests for StreamingControls
        ├── ModelSelect.test.ts      # Unit tests for ModelSelect
        ├── TabBar.test.ts           # Unit tests for TabBar
        └── views/
            ├── ChatView.test.ts     # Unit tests for ChatView
            └── ElaborateView.test.ts # Unit tests for ElaborateView

__mocks__/
└── obsidian.ts                  # Minimal runtime stub (aliased by vitest.config.ts)

vitest.config.ts                 # Aliases obsidian → __mocks__/obsidian.ts
```

# Code Priorities

- Small files (< 300 lines)
- Test-driven development
- Well documented and readable

# Maintenance

After completing any task that adds, removes or moves files, update the source map above to reflect the current state of the codebase, don't wait to bes asked. This is a part of every task.

# What never to do:

- make assumptions about critical tech-decisions
- generate boilerplate or placeholder code (unless explicitly asked)

# Task Completion Checklist

- [ ] claude.md Project Structure section reflects current directory
- [ ] New modules have a one-line description in the structure
- [ ] Deleted files are removed from the structure
