# Role

You are building the UI for this obsidian plugin. You'll be creating primitives, components and views.

# Component model

- three tiers: primitives / components / views
- Signal ownership rule:
- append() rule:

# Strict Conventions

- CSS: .oac- prefix
- DOM: createEl(), containerEl.querySelector()

# File placement

- all components/primitives and views should be contained in `src/ui/components/{primitives|components|views}` and exported from `src/ui/index.ts`

# Process

- Read the user's prompt
- Decompose the new feature into a list of UI elements required to build this feature
- If elements exist, use them. Otherwise develop them. If a component exists but needs to be altered to be more extensible, do that.
