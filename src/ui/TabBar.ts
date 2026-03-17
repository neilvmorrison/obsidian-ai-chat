import { createIconButton } from './IconButton';

export interface TabBarHandle {
  el: HTMLElement;
  tabsRow: HTMLElement;
  setVisible(visible: boolean): void;
  setSaveVisible(visible: boolean): void;
  setNewChatVisible(visible: boolean): void;
}

export interface TabBarProps {
  onSave: () => void;
  onNewChat: () => void;
}

export function createTabBar(
  parent: HTMLElement,
  props: TabBarProps,
): TabBarHandle {
  const el = parent.createEl('div', { cls: 'oac-tab-bar' });
  el.addClass('oac-hidden');

  const tabsRow = el.createEl('div', { cls: 'oac-tabs-row' });
  const toolbarRight = el.createEl('div', { cls: 'oac-toolbar-right' });

  const { el: saveBtn } = createIconButton(toolbarRight, {
    icon: 'save',
    label: 'Save as Note',
    cls: ['oac-icon-btn', 'oac-save-btn'],
    onClick: props.onSave,
  });
  saveBtn.addClass('oac-hidden');

  const { el: newChatBtn } = createIconButton(toolbarRight, {
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
    setSaveVisible(visible: boolean) {
      if (visible) { saveBtn.removeClass('oac-hidden'); } else { saveBtn.addClass('oac-hidden'); }
    },
    setNewChatVisible(visible: boolean) {
      if (visible) { newChatBtn.removeClass('oac-hidden'); } else { newChatBtn.addClass('oac-hidden'); }
    },
  };
}
