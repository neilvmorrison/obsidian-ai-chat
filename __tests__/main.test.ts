import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CHAT_VIEW_TYPE } from '../src/ui/components/views/ChatView';
import { ELABORATE_VIEW_TYPE } from '../src/ui/components/views/ElaborateView';
import { DEFAULT_SETTINGS } from '../src/settings';

// Mock obsidian — must cover everything imported transitively by main.ts
vi.mock('obsidian', () => {
  class Plugin {
    app: any;
    constructor(app?: any, _manifest?: any) {
      this.app = app ?? {};
    }
    loadData = vi.fn().mockResolvedValue(null);
    saveData = vi.fn().mockResolvedValue(undefined);
    registerView = vi.fn();
    addRibbonIcon = vi.fn().mockReturnValue({ style: {} });
    addSettingTab = vi.fn();
    addCommand = vi.fn();
    registerEditorSuggest = vi.fn();
  }
  class PluginSettingTab {
    constructor(_app: unknown, _plugin: unknown) {}
    display() {}
  }
  class ItemView {
    containerEl = document.createElement('div');
    contentEl = document.createElement('div');
    app: any = {};
    constructor(_leaf: any) {}
    getViewType() { return ''; }
    getDisplayText() { return ''; }
    getIcon() { return ''; }
    async onOpen() {}
    async onClose() {}
  }
  class WorkspaceLeaf {
    setViewState(_s: unknown) { return Promise.resolve(); }
    detach() {}
  }
  class Setting {
    constructor(_el: unknown) {}
    setName() { return this; }
    setDesc() { return this; }
    setHeading() { return this; }
    addText() { return this; }
    addToggle() { return this; }
    addDropdown() { return this; }
    addButton() { return this; }
  }
  class Modal {
    contentEl = { empty: () => {}, createEl: () => ({}) };
    constructor(_app: unknown) {}
    open() {}
    close() {}
  }
  class EditorSuggest {
    constructor(_app: any) {}
  }
  class Notice {
    constructor(_msg: string) {}
  }
  class TFile {
    path = ''; name = '';
  }
  class App {
    workspace = {
      getLeavesOfType: vi.fn().mockReturnValue([]),
      getRightLeaf: vi.fn().mockReturnValue(null),
      revealLeaf: vi.fn(),
      detachLeavesOfType: vi.fn(),
    };
  }
  return { Plugin, PluginSettingTab, ItemView, WorkspaceLeaf, Setting, Modal, EditorSuggest, Notice, TFile, App };
});

// Mock SettingsStore so we don't need real plugin storage
vi.mock('../src/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/settings')>();
  return {
    ...actual,
    SettingsStore: class {
      load = vi.fn().mockResolvedValue({ ...actual.DEFAULT_SETTINGS });
      save = vi.fn().mockResolvedValue(undefined);
    },
  };
});

// Mock registerCommands — tested separately
vi.mock('../src/commands/registerCommands', () => ({
  registerCommands: vi.fn(),
}));

// Mock buildModel — not needed for lifecycle tests
vi.mock('../src/providers/buildModel', () => ({
  buildModel: vi.fn(),
}));

// Mock AI SDK providers (pulled in transitively via ChatSession → ai)
vi.mock('ai', () => ({
  streamText: vi.fn(),
  generateText: vi.fn(),
}));
vi.mock('@ai-sdk/openai', () => ({ createOpenAI: vi.fn() }));
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: vi.fn() }));
vi.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: vi.fn() }));

import AIChatPlugin from '../src/main';
import { registerCommands } from '../src/commands/registerCommands';

function makeApp() {
  return {
    workspace: {
      getLeavesOfType: vi.fn().mockReturnValue([]),
      getRightLeaf: vi.fn().mockReturnValue(null),
      revealLeaf: vi.fn(),
      detachLeavesOfType: vi.fn(),
    },
  };
}

describe('AIChatPlugin', () => {
  let plugin: AIChatPlugin;
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    app = makeApp();
    plugin = new AIChatPlugin(app as any, {} as any);
  });

  describe('onload()', () => {
    it('registers ChatView', async () => {
      await plugin.onload();
      expect(plugin.registerView).toHaveBeenCalledWith(CHAT_VIEW_TYPE, expect.any(Function));
    });

    it('registers ElaborateView', async () => {
      await plugin.onload();
      expect(plugin.registerView).toHaveBeenCalledWith(ELABORATE_VIEW_TYPE, expect.any(Function));
    });

    it('adds the settings tab', async () => {
      await plugin.onload();
      expect(plugin.addSettingTab).toHaveBeenCalledTimes(1);
    });

    it('calls registerCommands with plugin and deps', async () => {
      await plugin.onload();
      expect(registerCommands).toHaveBeenCalledWith(plugin, expect.objectContaining({ settings: expect.any(Object), buildModel: expect.any(Function) }));
    });

    it('loads and stores settings', async () => {
      await plugin.onload();
      expect(plugin.settings).toMatchObject({ version: 1 });
    });
  });

  describe('onunload()', () => {
    it('detaches chat view leaves', async () => {
      await plugin.onload();
      plugin.onunload();
      expect(app.workspace.detachLeavesOfType).toHaveBeenCalledWith(CHAT_VIEW_TYPE);
    });

    it('detaches elaborate view leaves', async () => {
      await plugin.onload();
      plugin.onunload();
      expect(app.workspace.detachLeavesOfType).toHaveBeenCalledWith(ELABORATE_VIEW_TYPE);
    });
  });
});
