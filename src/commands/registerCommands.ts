import type OllamaChatPlugin from '../main';

export function registerCommands(plugin: OllamaChatPlugin): void {
  // Ribbon icon
  plugin.addRibbonIcon('message-square', 'Open AI Chat', () => {
    plugin.openChatView();
  });

  // Command palette + default hotkey
  plugin.addCommand({
    id: 'open-ai-chat',
    name: 'Open AI Chat',
    hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'A' }],
    callback: () => {
      plugin.openChatView();
    },
  });

  // Editor context menu
  plugin.registerEvent(
    plugin.app.workspace.on('editor-menu', (menu, editor) => {
      menu.addItem(item => {
        item
          .setTitle('New AI Chat')
          .setIcon('message-square')
          .onClick(() => {
            const selection = editor.getSelection();
            plugin.openChatView(selection || undefined);
          });
      });
    })
  );
}
