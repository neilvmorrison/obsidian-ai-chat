// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { iconButton } from '../../../../src/ui/components/primitives/IconButton';

describe('iconButton', () => {
  it('appends one button element to the container', () => {
    const container = document.createElement('div');

    iconButton(container, { icon: '✕', label: 'Close', onClick: vi.fn() });

    expect(container.children).toHaveLength(1);
    expect(container.children[0].tagName).toBe('BUTTON');
  });

  it('applies oac-icon-button class to the button', () => {
    const container = document.createElement('div');

    iconButton(container, { icon: '✕', label: 'Close', onClick: vi.fn() });

    expect(container.children[0].classList.contains('oac-icon-button')).toBe(true);
  });

  it('sets aria-label from config', () => {
    const container = document.createElement('div');

    iconButton(container, { icon: '✕', label: 'Close dialog', onClick: vi.fn() });

    expect(container.children[0].getAttribute('aria-label')).toBe('Close dialog');
  });

  it('sets button text content from icon config', () => {
    const container = document.createElement('div');

    iconButton(container, { icon: '✕', label: 'Close', onClick: vi.fn() });

    expect(container.children[0].textContent).toBe('✕');
  });

  it('calls onClick when button is clicked', () => {
    const container = document.createElement('div');
    const onClick = vi.fn();

    iconButton(container, { icon: '✕', label: 'Close', onClick });
    (container.children[0] as HTMLButtonElement).click();

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not call onClick before button is clicked', () => {
    const container = document.createElement('div');
    const onClick = vi.fn();

    iconButton(container, { icon: '✕', label: 'Close', onClick });

    expect(onClick).not.toHaveBeenCalled();
  });
});
