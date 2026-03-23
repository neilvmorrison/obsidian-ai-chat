// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { emptyState } from '../../../../src/ui/components/primitives/EmptyState';

describe('emptyState', () => {
  it('appends one element to the container', () => {
    const container = document.createElement('div');

    emptyState(container, { message: 'No results found' });

    expect(container.children).toHaveLength(1);
  });

  it('applies oac-empty-state class to the element', () => {
    const container = document.createElement('div');

    emptyState(container, { message: 'No results found' });

    expect(container.children[0].classList.contains('oac-empty-state')).toBe(true);
  });

  it('renders the message as text content', () => {
    const container = document.createElement('div');

    emptyState(container, { message: 'Nothing here yet' });

    expect(container.children[0].textContent).toBe('Nothing here yet');
  });
});
