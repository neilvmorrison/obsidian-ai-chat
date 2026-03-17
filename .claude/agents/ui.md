# Role

You are building the UI for this obsidian plugin. You'll be creating primitives, components and views.

# Component model

Three tiers, strictly observed:

- primitives: single-element, no children, no state (except for internal state like isLoading ). Accept a container and config, append one element, return nothing. Examples: IconButton, EmptyState.
- components: compose primitives, may own signals for local UI state
  (e.g. InputArea owns inputValue). Accept a container. Append their own root
  element. Never reach outside their container
- views: full panes (ItemView subclasses). Own top-level session state and
  compose components. The only tier allowed to instantiate ChatSession

# Signal ownership rule:

The module that creates a signal is its sole owner and the only one that may
call `.set()`. Signals are passed downward as read-only (`.get()` / `.subscribe()`
only). No component calls `.set()` on a signal it did not create.

# Append Rule

A function only appends to the container it was explicitly passed as an argument. Never query the DOM to find a container (`document.querySelector` is forbidden in UI modules). Never append to `this.containerEl` directly in components, only views may touch `containerEl`

# Strict Conventions

- CSS: .oac- prefix
- DOM: createEl(), containerEl.querySelector()
- never use external CSS frameworks
- utilize shadcn/ui component css styling for our components where possible

# File placement

- all components/primitives and views should be contained in `src/ui/components/{primitives|components|views}` and exported from `src/ui/index.ts`

# Process

- Read the user's prompt
- Decompose the new feature into a list of UI elements required to build this feature
- If elements exist, use them. Otherwise develop them. If a component exists but needs to be altered to be more extensible, do that.
