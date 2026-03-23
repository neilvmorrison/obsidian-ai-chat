import type { App, Modifier } from 'obsidian';
import type { LanguageModel } from 'ai';
import { CHAT_VIEW_TYPE } from '../ui/components/views/ChatView';
import { InlineGenerateSuggest } from './InlineGenerateSuggest';
import type { AIChatSettings, ProviderSettings } from '../types/settings';

export interface RegisterCommandsDeps {
  settings: AIChatSettings;
  buildModel(provider: ProviderSettings): LanguageModel;
}

/** Structural interface for the plugin reference — avoids importing Plugin at runtime. */
interface PluginRef {
  app: App;
  addCommand(cmd: {
    id: string;
    name: string;
    hotkeys?: Array<{ modifiers: Modifier[]; key: string }>;
    callback(): void | Promise<void>;
  }): void;
  registerEditorSuggest(suggest: InstanceType<typeof InlineGenerateSuggest>): void;
}

/**
 * Opens the chat panel in the right sidebar.
 * If a chat leaf is already open, detaches it instead (toggle behaviour).
 *
 * NOTE: Uses the private `rightSplit` workspace API only indirectly — all
 * sidebar manipulation is funnelled through `revealLeaf` / `detach` so
 * there is a single place to swap if the internal API changes.
 */
export async function toggleChatView(app: App): Promise<void> {
  const leaves = app.workspace.getLeavesOfType(CHAT_VIEW_TYPE);
  if (leaves.length > 0) {
    leaves[0].detach();
    return;
  }

  const leaf = app.workspace.getRightLeaf(false);
  if (!leaf) return;

  await leaf.setViewState({ type: CHAT_VIEW_TYPE, active: true });
  app.workspace.revealLeaf(leaf);
}

/**
 * Registers all plugin commands and editor suggests.
 * Must be called from `Plugin.onload()`.
 */
export function registerCommands(plugin: PluginRef, deps: RegisterCommandsDeps): void {
  plugin.addCommand({
    id: 'toggle-chat',
    name: 'Toggle chat panel',
    hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'A' }],
    callback: () => toggleChatView(plugin.app),
  });

  plugin.registerEditorSuggest(new InlineGenerateSuggest(plugin.app, deps));
}
