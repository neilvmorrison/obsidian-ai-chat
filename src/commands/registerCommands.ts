import type OllamaChatPlugin from '../main';
import { summarizeNote } from './summarizeNote';

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

  plugin.addCommand({
    id: 'summarize-note',
    name: 'Summarize note',
    callback: () => summarizeNote(plugin),
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
      menu.addItem(item => {
        item
          .setTitle('Summarize note')
          .setIcon('sparkles')
          .onClick(() => summarizeNote(plugin));
      });
    })
  );
}
