import { signal } from '../signals';

export interface TabBarConfig {
  /** Ordered list of tab names to render. */
  tabs: string[];
  /** Tab to mark active on mount; defaults to the first tab. */
  initialTab?: string;
  /** Called with the tab name whenever the active tab changes. */
  onTabChange?: (tab: string) => void;
}

/**
 * Renders a row of tab buttons inside `.oac-tab-bar`.
 * Owns an `activeTab` signal. The active button carries `.oac-tab-bar__tab--active`.
 */
export function tabBar(container: HTMLElement, config: TabBarConfig): void {
  const activeTab = signal(config.initialTab ?? config.tabs[0] ?? '');

  const root = document.createElement('div');
  root.className = 'oac-tab-bar';

  const buttons = new Map<string, HTMLButtonElement>();

  for (const tab of config.tabs) {
    const btn = document.createElement('button');
    btn.className = 'oac-tab-bar__tab';
    btn.textContent = tab;
    btn.addEventListener('click', () => {
      activeTab.set(tab);
      config.onTabChange?.(tab);
    });
    buttons.set(tab, btn);
    root.appendChild(btn);
  }

  activeTab.subscribe(active => {
    for (const [tab, btn] of buttons) {
      btn.classList.toggle('oac-tab-bar__tab--active', tab === active);
    }
  });

  container.appendChild(root);
}
