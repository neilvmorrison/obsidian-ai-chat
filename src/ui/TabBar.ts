import { createIconButton } from './IconButton';

export interface TabBarHandle {
  el: HTMLElement;
  tabsRow: HTMLElement;
  setVisible(visible: boolean): void;
  setNewChatVisible(visible: boolean): void;
}

export interface TabBarProps {
  onNewChat: () => void;
}

export function createTabBar(
  parent: HTMLElement,
  props: TabBarProps,
): TabBarHandle {
  const el = parent.createEl('div', { cls: 'oac-tab-bar' });
  el.addClass('oac-hidden');

  const tabsRow = el.createEl('div', { cls: 'oac-tabs-row' });

  const { el: newChatBtn } = createIconButton(el, {
    icon: 'plus',
    label: 'New Chat',
    cls: ['oac-icon-btn', 'oac-new-chat-btn'],
    onClick: props.onNewChat,
  });
  newChatBtn.addClass('oac-hidden');

  return {
    el,
    tabsRow,
    setVisible(visible: boolean) {
      if (visible) { el.removeClass('oac-hidden'); } else { el.addClass('oac-hidden'); }
    },
    setNewChatVisible(visible: boolean) {
      if (visible) { newChatBtn.removeClass('oac-hidden'); } else { newChatBtn.addClass('oac-hidden'); }
    },
  };
}
