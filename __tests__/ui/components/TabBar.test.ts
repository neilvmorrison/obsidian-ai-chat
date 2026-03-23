// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { tabBar } from '../../../src/ui/components/TabBar';

const TABS = ['Chat', 'History', 'Settings'];

describe('tabBar', () => {
  it('appends one root element to the container', () => {
    const container = document.createElement('div');

    tabBar(container, { tabs: TABS });

    expect(container.children).toHaveLength(1);
  });

  it('applies oac-tab-bar class to the root element', () => {
    const container = document.createElement('div');

    tabBar(container, { tabs: TABS });

    expect(container.children[0].classList.contains('oac-tab-bar')).toBe(true);
  });

  it('renders one button per tab', () => {
    const container = document.createElement('div');

    tabBar(container, { tabs: TABS });

    expect(container.querySelectorAll('button')).toHaveLength(3);
  });

  it('sets button text content from tab name', () => {
    const container = document.createElement('div');

    tabBar(container, { tabs: TABS });

    const buttons = container.querySelectorAll('button');
    expect(buttons[0].textContent).toBe('Chat');
    expect(buttons[1].textContent).toBe('History');
    expect(buttons[2].textContent).toBe('Settings');
  });

  it('marks the first tab as active by default', () => {
    const container = document.createElement('div');

    tabBar(container, { tabs: TABS });

    const buttons = container.querySelectorAll('button');
    expect(buttons[0].classList.contains('oac-tab-bar__tab--active')).toBe(true);
  });

  it('marks only one tab as active by default', () => {
    const container = document.createElement('div');

    tabBar(container, { tabs: TABS });

    const active = container.querySelectorAll('.oac-tab-bar__tab--active');
    expect(active).toHaveLength(1);
  });

  it('marks the initialTab as active when provided', () => {
    const container = document.createElement('div');

    tabBar(container, { tabs: TABS, initialTab: 'History' });

    const buttons = container.querySelectorAll('button');
    expect(buttons[1].classList.contains('oac-tab-bar__tab--active')).toBe(true);
    expect(buttons[0].classList.contains('oac-tab-bar__tab--active')).toBe(false);
  });

  it('calls onTabChange with the clicked tab name', () => {
    const container = document.createElement('div');
    const onTabChange = vi.fn();

    tabBar(container, { tabs: TABS, onTabChange });
    (container.querySelectorAll('button')[1] as HTMLButtonElement).click();

    expect(onTabChange).toHaveBeenCalledWith('History');
  });

  it('updates the active tab visually when a tab is clicked', () => {
    const container = document.createElement('div');

    tabBar(container, { tabs: TABS });
    const buttons = container.querySelectorAll('button');
    (buttons[2] as HTMLButtonElement).click();

    expect(buttons[2].classList.contains('oac-tab-bar__tab--active')).toBe(true);
    expect(buttons[0].classList.contains('oac-tab-bar__tab--active')).toBe(false);
  });

  it('does not call onTabChange before any tab is clicked', () => {
    const container = document.createElement('div');
    const onTabChange = vi.fn();

    tabBar(container, { tabs: TABS, onTabChange });

    expect(onTabChange).not.toHaveBeenCalled();
  });
});
