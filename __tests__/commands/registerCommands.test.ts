import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerCommands } from '../../src/commands/registerCommands';

vi.mock('obsidian', () => ({
  EditorSuggest: class {
    context: any = null;
    constructor(_app: any) {}
  },
  Notice: vi.fn(),
  ItemView: class {
    containerEl = document.createElement('div');
    contentEl = document.createElement('div');
    constructor(_leaf: any) {}
  },
  WorkspaceLeaf: class {},
}));

vi.mock('ai', () => ({
  streamText: vi.fn(),
}));

const SETTINGS = {
  defaultProviderId: 'ollama',
  providers: { ollama: { id: 'ollama', model: 'llama3', enabled: true } },
  systemPromptPrefix: 'You are helpful.',
} as any;

const mockBuildModel = vi.fn();
const deps = { settings: SETTINGS, buildModel: mockBuildModel };

function makeLeaf() {
  return { setViewState: vi.fn().mockResolvedValue(undefined), detach: vi.fn() };
}

function makePlugin(leaves: any[] = []) {
  const workspace = {
    getLeavesOfType: vi.fn().mockReturnValue(leaves),
    getRightLeaf: vi.fn().mockReturnValue(makeLeaf()),
    revealLeaf: vi.fn(),
  };
  return {
    app: { workspace },
    addCommand: vi.fn(),
    registerEditorSuggest: vi.fn(),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registerCommands', () => {
  it('registers the toggle-chat command', () => {
    const plugin = makePlugin();

    registerCommands(plugin as any, deps);

    expect(plugin.addCommand).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'toggle-chat' }),
    );
  });

  it('sets hotkey Mod+Shift+A on the toggle command', () => {
    const plugin = makePlugin();

    registerCommands(plugin as any, deps);

    const cmd = (plugin.addCommand as any).mock.calls[0][0];
    expect(cmd.hotkeys).toEqual([{ modifiers: ['Mod', 'Shift'], key: 'A' }]);
  });

  it('registers one editor suggest', () => {
    const plugin = makePlugin();

    registerCommands(plugin as any, deps);

    expect(plugin.registerEditorSuggest).toHaveBeenCalledTimes(1);
  });

  it('toggle callback opens chat view when no leaf exists', async () => {
    const plugin = makePlugin([]);
    registerCommands(plugin as any, deps);
    const { callback } = (plugin.addCommand as any).mock.calls[0][0];

    await callback();

    expect(plugin.app.workspace.getRightLeaf).toHaveBeenCalled();
    expect(plugin.app.workspace.revealLeaf).toHaveBeenCalled();
  });

  it('toggle callback sets view state when creating new leaf', async () => {
    const leaf = makeLeaf();
    const plugin = makePlugin([]);
    plugin.app.workspace.getRightLeaf = vi.fn().mockReturnValue(leaf);
    registerCommands(plugin as any, deps);
    const { callback } = (plugin.addCommand as any).mock.calls[0][0];

    await callback();

    expect(leaf.setViewState).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'oac-chat-view', active: true }),
    );
  });

  it('toggle callback detaches existing leaf when one is open', async () => {
    const leaf = makeLeaf();
    const plugin = makePlugin([leaf]);
    registerCommands(plugin as any, deps);
    const { callback } = (plugin.addCommand as any).mock.calls[0][0];

    await callback();

    expect(leaf.detach).toHaveBeenCalled();
    expect(plugin.app.workspace.getRightLeaf).not.toHaveBeenCalled();
  });

  it('toggle callback does nothing when getRightLeaf returns null', async () => {
    const plugin = makePlugin([]);
    plugin.app.workspace.getRightLeaf = vi.fn().mockReturnValue(null);
    registerCommands(plugin as any, deps);
    const { callback } = (plugin.addCommand as any).mock.calls[0][0];

    await callback();

    expect(plugin.app.workspace.revealLeaf).not.toHaveBeenCalled();
  });
});
