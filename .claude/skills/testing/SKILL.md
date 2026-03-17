---
name: testing
description: Write tests to guarantee codebase integrity
---

You are writing tests for an Obsidian plugin that provides local AI chat via Ollama. Review the instructions below and apply them to whatever the user has selected or asked you to write tests for.

## Framework & tooling

- **Vitest** — the test framework for this project. Zero config, runs in Node without Obsidian.
- Test files live alongside source files: `src/foo.test.ts` next to `src/foo.ts`
- Run tests with `npx vitest run` (or `npx vitest` for watch mode)

## What to test

### Pure functions — highest ROI, no mocking needed

These are directly testable:

| Function | File |
|---|---|
| `replaceOrPrependCallout()` | `src/commands/summarizeNote.ts` |
| `buildCallout()` | `src/commands/summarizeNote.ts` |
| `serialize()` | `src/chat/ChatSession.ts` |
| Filename sanitization regex in `generateTitle()` | `src/chat/ChatSession.ts` |

### Integration tests — mock Obsidian and Vercel AI SDK

The streaming + abort flow in `ChatSession.send()` is the highest-risk area (race conditions, partial text accumulation, `AbortController` state). Mock `createOllama` / `streamText` from the Vercel AI SDK. A minimal `App` mock with just the used properties is enough.

### What NOT to test

`ChatView`, `ElaborateView`, `renderMessage` — these are tightly coupled to Obsidian's DOM APIs and workspace. The mocking cost exceeds the signal. Prefer refactoring state out of views first, then test the extracted logic.

## Test conventions

**Structure**
- One `describe` block per function
- Test names state the condition and expected outcome: `"replaces existing callout block"`, `"prepends when no callout exists"`
- Cover: happy path, edge cases, error/boundary inputs

**TypeScript**
- Strict mode applies in test files too — no implicit `any`
- Use `async/await` — not `.then()` chains
- Import types from source files, not re-declare them

**Mocking**
- Use `vi.fn()` for callbacks; assert call count and arguments explicitly
- For Obsidian `App`, only mock the properties actually accessed — don't build a full mock object
- Restore mocks after each test with `vi.restoreAllMocks()` in `afterEach`

**Assertions**
- Prefer specific matchers: `toEqual`, `toContain`, `toHaveBeenCalledWith` over `toBeTruthy`
- For streaming tests, collect all `onChunk` calls and assert the full accumulated output

## Workflow

1. **Read** the target function(s) in full before writing any tests.
2. **List** the logical cases to cover: happy path, boundary inputs, error conditions.
3. **Check** whether the function is pure or needs mocking — pure functions first.
4. **Write** tests grouped in `describe` blocks, one case per `it`.
5. **Run** `npx vitest run` and fix any failures before declaring done.
6. **Do not** refactor source code to make tests pass unless the source has a real bug. If the code is hard to test, note it for the refactor skill instead.
