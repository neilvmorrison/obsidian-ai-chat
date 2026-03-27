# Obsidian Chat Plugin

## What this is

An Obsidian plugin that provides an AI chat interface inside Obsidian's sidebar, built with React 18 and TypeScript.

## Architecture

- **Plugin entry**: `src/main.ts` — registers the view and ribbon icon
- **View bridge**: `src/view.ts` — `ItemView` subclass that mounts/unmounts the React root
- **React UI**: `src/components/` — all UI components live here
- **Styles**: `src/styles.css` → copied to `styles.css` at build time

## Build

- `npm run dev` — development build with inline sourcemaps
- `npm run build` — production build (minified, no sourcemaps)
- Output: `main.js` + `styles.css` in project root (Obsidian loads these directly)
- esbuild bundles everything; externalizes `obsidian`, `electron`, `@codemirror/*`, `@lezer/*`

## Key constraints

- **No DOM libraries**: Obsidian runs in Electron; no `window.fetch` polyfills or browser-only libs needed
- **CSS**: Use Obsidian's CSS custom properties (e.g. `var(--background-primary)`) for theming so the plugin respects the user's vault theme
- **React in Obsidian**: The React root is mounted in `ItemView.contentEl`. Access to the Obsidian `App` object should be passed down via React context if needed — do not use global state
- **File output**: The built `main.js` must stay in the project root (not `dist/`). This is how Obsidian discovers the plugin

## UI reference

- **shadcn AI chatbot**: https://www.shadcn.io/ai/chatbot
  Use this as the design reference for the chat UI. Key patterns to follow:
  - Conversation container with auto-scroll and scroll-to-bottom
  - Distinct user/assistant message bubbles
  - Streaming responses with word-by-word rendering
  - Prompt input area with action buttons
  - Model selector dropdown
  - Collapsible reasoning/thinking blocks
  - Markdown rendering in messages

## Code style

- TypeScript strict mode
- React functional components with hooks
- JSX transform: `react-jsx` (no need to import React in every file)
- Prefer small, focused components in `src/components/`
