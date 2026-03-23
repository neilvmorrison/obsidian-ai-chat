export interface EmptyStateConfig {
  /** Message displayed when there is no content to show. */
  message: string;
}

/**
 * Appends a single `<div>` to `container`.
 * CSS class: `.oac-empty-state`.
 */
export function emptyState(container: HTMLElement, config: EmptyStateConfig): void {
  const el = document.createElement('div');
  el.className = 'oac-empty-state';
  el.textContent = config.message;
  container.appendChild(el);
}
