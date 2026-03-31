# /workflow

Pull a ticket from Linear, implement it, and draft a PR — end to end.

---

## Steps

- Pull issue details from Linear based on user input (ticket URL or ID).
- Read `.claude/lessons.md` if it exists — use any relevant entries to inform your implementation plan, especially testing conventions, component constraints, and known gotchas.
- Form a structured implementation plan based on the ticket description and acceptance criteria.
  - We use a Test Driven Development approach, so the plan should write failing tests first, and include which tests to write and in what order.
- If the ticket is about UI, use the Figma MCP to pull relevant design details and assets
  - Figma url should be in the Linear ticket description or comments. If missing, ask the user to provide it if needed for this task.
  - Pull figma designs and plan which components need to be created vs modified, based on current design system and components in relevant part of code base.
- Create a new branch named `claude/<ticket-id>` from the default branch.
- Start implementing the ticket based on the plan, running tests, linters and self-review sub agents as you go, and iterating on the implementation until all tests pass and the implementation meets the acceptance criteria.
- After implementation is complete, use chrome devtools MCP to review the changes in a local dev environment, and make any necessary adjustments. If there's any issues in launching the dev environment or reviewing the changes, troubleshoot and fix those as well - ask the user for any necessary credentials or access needed to do this.
- Before committing, check whether the change requires doc updates and make them in the same commit. Use `CLAUDE.md` and `.claude/docs/architecture.md` to identify which docs apply to this repo:
  - New/removed/renamed structural element (app, service, package, module) → relevant table or section in `CLAUDE.md` + directory tree in architecture doc
  - New/changed CI workflow or pre-commit hook → CI/CD or Development Setup section in `CLAUDE.md`
  - New/changed required env var → env vars table in `CLAUDE.md`
  - New/changed linting or TypeScript rule → `.claude/docs/coding-standards.md`
- After you're happy with the implementation, break up the commits into logical chunks with clear commit messages, and draft a PR with a clear description of the changes and how they address the ticket.
  - Follow the repo's github template if it exists, and if not, use a clear structure in the PR description (e.g., Summary, Implementation details, Testing details, etc.)
  - Use `gh` cli to interact with the PR and assign it to the user.
- Return the PR link in the final output.
- [Optional] Offer the user to keep running and monitor the CI checks on the PR
  - address any issues that come up in CI, and update the PR as needed until it passes.
