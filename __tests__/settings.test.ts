import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DEFAULT_SETTINGS,
  PROVIDER_PRESETS,
  migrate,
  SettingsStore,
  AIChatSettingTab,
  slugify,
  generateProviderId,
} from '../src/settings';
import type { AIChatSettings } from '../src/types/settings';

vi.mock('obsidian', () => {
  class PluginSettingTab {
    containerEl = { empty: vi.fn() };
    constructor(_app: unknown, _plugin: unknown) {}
  }

  function makeText() {
    const text: {
      setValue(v: string): typeof text;
      onChange(cb: (v: string) => void): typeof text;
      setPlaceholder(v: string): typeof text;
      inputEl: { type: string };
    } = {
      setValue(_v: string)       { return text; },
      onChange(_cb: unknown)     { return text; },
      setPlaceholder(_v: string) { return text; },
      inputEl:                   { type: 'text' },
    };
    return text;
  }

  function makeToggle() {
    const toggle = {
      setValue(_v: boolean)  { return toggle; },
      onChange(_cb: unknown) { return toggle; },
    };
    return toggle;
  }

  function makeDropdown() {
    const dd = {
      addOption(_v: string, _l: string) { return dd; },
      setValue(_v: string)              { return dd; },
      onChange(_cb: unknown)            { return dd; },
      setDisabled(_v: boolean)          { return dd; },
    };
    return dd;
  }

  function makeButton() {
    const btn = {
      setButtonText(_v: string) { return btn; },
      onClick(_cb: unknown)     { return btn; },
      buttonEl:                 { classList: { add: vi.fn() } },
    };
    return btn;
  }

  class Setting {
    constructor(_el: unknown) {}
    setName(_n: string)  { return this; }
    setDesc(_d: string)  { return this; }
    setHeading()         { return this; }
    addText(cb: (text: ReturnType<typeof makeText>) => void) {
      cb(makeText()); return this;
    }
    addToggle(cb: (toggle: ReturnType<typeof makeToggle>) => void) {
      cb(makeToggle()); return this;
    }
    addDropdown(cb: (dd: ReturnType<typeof makeDropdown>) => void) {
      cb(makeDropdown()); return this;
    }
    addButton(cb: (btn: ReturnType<typeof makeButton>) => void) {
      cb(makeButton()); return this;
    }
  }

  class Modal {
    contentEl = { empty: vi.fn() };
    constructor(_app: unknown) {}
    open()  {}
    close() {}
  }

  return { PluginSettingTab, Setting, Modal };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlugin(overrides: Partial<AIChatSettings> = {}) {
  return {
    app: {} as never,
    settings: { ...DEFAULT_SETTINGS, ...overrides },
    loadData: vi.fn().mockResolvedValue(null),
    saveData: vi.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// DEFAULT_SETTINGS
// ---------------------------------------------------------------------------

describe('DEFAULT_SETTINGS', () => {
  // model moved to providers.ollama.model in v1 schema
  it('has providers.ollama.model "llama3.2"', () => {
    expect(DEFAULT_SETTINGS.providers.ollama.model).toBe('llama3.2');
  });

  it('has providers.ollama.baseUrl "http://localhost:11434/api"', () => {
    expect(DEFAULT_SETTINGS.providers.ollama.baseUrl).toBe('http://localhost:11434/api');
  });

  it('has contextWindowLines 40', () => {
    expect(DEFAULT_SETTINGS.contextWindowLines).toBe(40);
  });

  it('has systemPromptPrefix as a non-empty string', () => {
    expect(DEFAULT_SETTINGS.systemPromptPrefix).toBeTypeOf('string');
    expect(DEFAULT_SETTINGS.systemPromptPrefix.length).toBeGreaterThan(0);
  });

  it('has saveFolder "AI Chats"', () => {
    expect(DEFAULT_SETTINGS.saveFolder).toBe('AI Chats');
  });

  it('has promptSaveOnClose true', () => {
    expect(DEFAULT_SETTINGS.promptSaveOnClose).toBe(true);
  });

  it('has hotkey "Mod+Shift+A"', () => {
    expect(DEFAULT_SETTINGS.hotkey).toBe('Mod+Shift+A');
  });

  it('has agentModel as empty string', () => {
    expect(DEFAULT_SETTINGS.agentModel).toBe('');
  });

  it('has agentSystemPrompt as a non-empty string', () => {
    expect(DEFAULT_SETTINGS.agentSystemPrompt).toBeTypeOf('string');
    expect(DEFAULT_SETTINGS.agentSystemPrompt.length).toBeGreaterThan(0);
  });

  it('contains all global fields with sensible non-empty defaults', () => {
    expect(DEFAULT_SETTINGS.contextWindowLines).toBe(40);
    expect(DEFAULT_SETTINGS.systemPromptPrefix).toBe('You are a helpful assistant embedded in Obsidian.');
    expect(DEFAULT_SETTINGS.saveFolder).toBe('AI Chats');
    expect(DEFAULT_SETTINGS.promptSaveOnClose).toBe(true);
    expect(DEFAULT_SETTINGS.hotkey).toBe('Mod+Shift+A');
    expect(DEFAULT_SETTINGS.agentModel).toBe('');
    expect(DEFAULT_SETTINGS.agentSystemPrompt).toBe(
      'You are a precise file-system agent. Complete tasks using only the tools provided.',
    );
  });

  it('providers contains exactly the six preset ids', () => {
    expect(Object.keys(DEFAULT_SETTINGS.providers).sort()).toEqual(
      ['anthropic', 'gemini', 'lmstudio', 'ollama', 'openai', 'openrouter'],
    );
  });

  it('only ollama has enabled: true', () => {
    for (const [id, p] of Object.entries(DEFAULT_SETTINGS.providers)) {
      if (id === 'ollama') expect(p.enabled).toBe(true);
      else expect(p.enabled).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// PROVIDER_PRESETS
// ---------------------------------------------------------------------------

describe('PROVIDER_PRESETS', () => {
  it('each factory returns a new object on every call', () => {
    for (const factory of Object.values(PROVIDER_PRESETS)) {
      expect(factory()).not.toBe(factory());
    }
  });
});

// ---------------------------------------------------------------------------
// AIChatSettingTab
// ---------------------------------------------------------------------------

describe('AIChatSettingTab', () => {
  let plugin: ReturnType<typeof makePlugin>;
  let tab: AIChatSettingTab;

  beforeEach(() => {
    plugin = makePlugin();
    tab = new AIChatSettingTab({} as never, plugin as never);
  });

  it('calls containerEl.empty() when display() is called', () => {
    tab.display();
    expect(tab.containerEl.empty).toHaveBeenCalledOnce();
  });

  // onTextChange / onToggleChange / onNumberChange were atomic helpers on the old
  // OllamaChatSettingTab. The new AIChatSettingTab delegates persistence directly
  // to Obsidian Setting onChange callbacks — those helpers no longer exist.
});

// ---------------------------------------------------------------------------
// migrate
// ---------------------------------------------------------------------------

describe('migrate', () => {
  it('migrate(null) returns a value deeply equal to DEFAULT_SETTINGS', () => {
    expect(migrate(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('migrate(undefined) returns a value deeply equal to DEFAULT_SETTINGS', () => {
    expect(migrate(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it('migrate({}) returns a valid AIChatSettings with all required keys', () => {
    const result = migrate({});
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('defaultProviderId');
    expect(result).toHaveProperty('providers');
    expect(result).toHaveProperty('contextWindowLines');
    expect(result).toHaveProperty('systemPromptPrefix');
    expect(result).toHaveProperty('saveFolder');
    expect(result).toHaveProperty('promptSaveOnClose');
    expect(result).toHaveProperty('hotkey');
    expect(result).toHaveProperty('agentModel');
    expect(result).toHaveProperty('agentSystemPrompt');
  });

  it('prototype-era shape preserves the /api baseURL for the native ollama provider', () => {
    const result = migrate({ baseURL: 'http://custom:11434/api', model: 'mistral' });
    expect(result.providers.ollama.baseUrl).toBe('http://custom:11434/api');
    expect(result.providers.ollama.model).toBe('mistral');
  });

  it('prototype-era shape preserves all global fields at the top level', () => {
    const result = migrate({
      baseURL: 'http://localhost:11434/api',
      model: 'llama3',
      contextWindowLines: 99,
      systemPromptPrefix: 'custom prefix',
      saveFolder: 'My Chats',
      promptSaveOnClose: false,
      hotkey: 'Ctrl+K',
      agentModel: 'llama3-agent',
      agentSystemPrompt: 'custom agent prompt',
    });
    expect(result.contextWindowLines).toBe(99);
    expect(result.systemPromptPrefix).toBe('custom prefix');
    expect(result.saveFolder).toBe('My Chats');
    expect(result.promptSaveOnClose).toBe(false);
    expect(result.hotkey).toBe('Ctrl+K');
    expect(result.agentModel).toBe('llama3-agent');
    expect(result.agentSystemPrompt).toBe('custom agent prompt');
  });

  it('prototype-era shape sets providers.ollama.enabled === true and defaultProviderId === "ollama"', () => {
    const result = migrate({ model: 'mistral' });
    expect(result.providers.ollama.enabled).toBe(true);
    expect(result.defaultProviderId).toBe('ollama');
  });

  it('passes baseURL through unchanged when it has no /api suffix', () => {
    const result = migrate({ baseURL: 'http://localhost:11434' });
    expect(result.providers.ollama.baseUrl).toBe('http://localhost:11434');
  });

  it('version: 1 data is returned unchanged and does not warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const input: AIChatSettings = {
      version: 1,
      defaultProviderId: 'ollama',
      providers: { ollama: PROVIDER_PRESETS.ollama() },
      contextWindowLines: 40,
      systemPromptPrefix: 'test',
      saveFolder: 'AI Chats',
      promptSaveOnClose: true,
      hotkey: 'Mod+Shift+A',
      agentProviderId: 'ollama',
      agentModel: '',
      agentSystemPrompt: 'test agent',
    };
    const result = migrate(input);
    expect(result).toBe(input); // same reference — not cloned
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('unrecognised shape (unknown version) logs console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    migrate({ version: 99, foo: 'bar' });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('prototype-era shape logs console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    migrate({ baseURL: 'http://localhost:11434/api' });
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// SettingsStore
// ---------------------------------------------------------------------------

describe('SettingsStore', () => {
  it('load() passes loadData result through migrate (verified via output)', async () => {
    // Verify behaviorally: prototype-era data from loadData should emerge as mapped v1 settings.
    // Spying on the exported migrate symbol cannot intercept same-module calls in ESM.
    const plugin = {
      loadData: vi.fn().mockResolvedValue({ baseURL: 'http://custom:11434/api', model: 'mistral' }),
      saveData: vi.fn(),
    };
    const store = new SettingsStore(plugin);
    const result = await store.load();
    expect(result.providers.ollama.baseUrl).toBe('http://custom:11434/api');
    expect(result.providers.ollama.model).toBe('mistral');
  });

  it('save() calls saveData with exactly the object passed in', async () => {
    const plugin = { loadData: vi.fn(), saveData: vi.fn().mockResolvedValue(undefined) };
    const store = new SettingsStore(plugin);
    const settings = structuredClone(DEFAULT_SETTINGS);
    await store.save(settings);
    expect(plugin.saveData).toHaveBeenCalledWith(settings);
    expect(plugin.saveData).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// slugify
// ---------------------------------------------------------------------------

describe('slugify', () => {
  it('"My Custom Model" → "my-custom-model"', () => {
    expect(slugify('My Custom Model')).toBe('my-custom-model');
  });

  it('"GPT-4o (test!)" → "gpt-4o-test"', () => {
    expect(slugify('GPT-4o (test!)')).toBe('gpt-4o-test');
  });
});

// ---------------------------------------------------------------------------
// generateProviderId (collision handling)
// ---------------------------------------------------------------------------

describe('generateProviderId', () => {
  it('returns base slug when no collision', () => {
    expect(generateProviderId('local', [])).toBe('local');
  });

  it('appends -2 on first collision', () => {
    expect(generateProviderId('local', ['local'])).toBe('local-2');
  });

  it('two providers both named "local" produce ids "local" and "local-2"', () => {
    const existing: string[] = [];
    const first = generateProviderId('local', existing);
    existing.push(first);
    const second = generateProviderId('local', existing);
    expect(first).toBe('local');
    expect(second).toBe('local-2');
  });
});
