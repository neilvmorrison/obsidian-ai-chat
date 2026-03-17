import { Notice, Modal, Setting } from 'obsidian';
import type OllamaChatPlugin from '../main';
import { summarizeNote } from './summarizeNote';
import { AgentSession } from '../chat/AgentSession';

export function registerCommands(plugin: OllamaChatPlugin): void {
  // Ribbon icon
  plugin.addRibbonIcon('bot-message-square', 'Open AI Chat', () => {
    plugin.openChatView();
  });

  // Command palette + default hotkey
  plugin.addCommand({
    id: 'open-ai-chat',
    name: 'Open AI Chat',
    hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'A' }],
    callback: () => {
      plugin.openChatView(undefined, true);
    },
  });

  plugin.addCommand({
    id: 'summarize-note',
    name: 'Summarize note',
    callback: () => summarizeNote(plugin),
  });

  plugin.addCommand({
    id: 'run-agent',
    name: 'Run AI Agent',
    callback: () => new AgentPromptModal(plugin).open(),
  });

  // Editor context menu — right-click agent trigger
  plugin.registerEvent(
    plugin.app.workspace.on('editor-menu', (menu) => {
      menu.addItem(item => {
        item
          .setTitle('Run AI Agent')
          .setIcon('bot')
          .onClick(() => new AgentPromptModal(plugin).open());
      });
    })
  );

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

class AgentPromptModal extends Modal {
  private plugin: OllamaChatPlugin;
  private prompt = '';

  constructor(plugin: OllamaChatPlugin) {
    super(plugin.app);
    this.plugin = plugin;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'AI Agent' });
    contentEl.createEl('p', {
      text: 'Describe what you want the agent to do. It can create folders and notes in your vault.',
      cls: 'oac-agent-modal-desc',
    });

    new Setting(contentEl)
      .setName('Instruction')
      .addTextArea(ta => {
        ta.setPlaceholder('e.g. Create a "Projects/2024" folder and add a README.md with a project overview.')
          .onChange(v => { this.prompt = v; });
        ta.inputEl.rows = 4;
        ta.inputEl.addClass('oac-agent-modal-input');
        ta.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            this.run();
          }
        });
        // Focus on open
        setTimeout(() => ta.inputEl.focus(), 50);
      });

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Run')
        .setCta()
        .onClick(() => this.run()));
  }

  private async run(): Promise<void> {
    const prompt = this.prompt.trim();
    if (!prompt) return;
    this.close();

    let yesToAll = false;
    const confirmFn = (toolName: string, params: Record<string, unknown>) => {
      if (yesToAll) return Promise.resolve(true);
      return new Promise<boolean>((resolve) =>
        new ToolConfirmModal(this.plugin.app, toolName, params, resolve, () => {
          yesToAll = true;
        }).open()
      );
    };

    const session = new AgentSession(
      this.plugin.app.vault,
      this.plugin.settings,
      confirmFn,
    );
    const notice = new Notice('Agent running…', 0);

    try {
      const result = await session.runAgent(prompt);
      notice.hide();
      new Notice(result, 10000);
    } catch (err) {
      notice.hide();
      new Notice(`Agent error: ${err instanceof Error ? err.message : String(err)}`, 0);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

class ToolConfirmModal extends Modal {
  private toolName: string;
  private params: Record<string, unknown>;
  private resolve: (value: boolean) => void;
  private onYesToAll: () => void;
  private resolved = false;

  constructor(
    app: import('obsidian').App,
    toolName: string,
    params: Record<string, unknown>,
    resolve: (value: boolean) => void,
    onYesToAll: () => void,
  ) {
    super(app);
    this.toolName = toolName;
    this.params = params;
    this.resolve = resolve;
    this.onYesToAll = onYesToAll;
  }

  onOpen(): void {
    const { contentEl } = this;

    contentEl.createEl('h2', { text: 'Allow AI action?' });

    const card = contentEl.createDiv({ cls: 'oac-confirm-card' });
    card.createEl('p', { text: this.toolName, cls: 'oac-confirm-tool-name' });

    const table = card.createEl('table', { cls: 'oac-confirm-params' });
    for (const [key, value] of Object.entries(this.params)) {
      const row = table.createEl('tr');
      row.createEl('td', { text: key, cls: 'oac-confirm-param-key' });
      const val = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
      row.createEl('td', { text: val, cls: 'oac-confirm-param-val' });
    }

    new Setting(contentEl)
      .addButton(btn => btn
        .setButtonText('Allow')
        .setCta()
        .onClick(() => { this.finish(true); }))
      .addButton(btn => btn
        .setButtonText('Yes to all')
        .onClick(() => { this.onYesToAll(); this.finish(true); }))
      .addButton(btn => btn
        .setButtonText('Deny')
        .onClick(() => { this.finish(false); }));
  }

  private finish(value: boolean): void {
    this.resolved = true;
    this.resolve(value);
    this.close();
  }

  onClose(): void {
    if (!this.resolved) this.resolve(false);
    this.contentEl.empty();
  }
}
