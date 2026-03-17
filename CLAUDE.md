# Project Identity

This is an AI-Chat integration plugin for Obsidian

# Source Map

```
src/
├── main.ts                      # Plugin entrypoint (stub — Phase 1 scaffold)
├── settings.ts                  # PROVIDER_PRESETS, DEFAULT_SETTINGS, migrate(), SettingsStore, AIChatSettingTab, AddProviderModal
├── types/
│   └── settings.ts              # ProviderType, ProviderSettings, AIChatSettings interfaces
├── context/
│   └── buildContext.ts          # buildContext(), extractEditorContext(), extractTags()
└── ui/
    └── signals.ts               # signal<T>() and computed<T>() reactive primitives

__tests__/
├── settings.test.ts             # Unit tests for settings.ts
├── context/
│   └── buildContext.test.ts     # Unit tests for buildContext.ts
└── ui/
    └── signals.test.ts          # Unit tests for signals.ts

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
