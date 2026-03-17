import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DEFAULT_SETTINGS, OllamaChatSettingTab } from '../src/settings';
import type { OllamaChatSettings } from '../src/types/settings';

vi.mock('obsidian', () => {
  class PluginSettingTab {
    containerEl = { empty: vi.fn() };
    constructor(_app: unknown, _plugin: unknown) {}
  }

  class Setting {
    constructor(_el: unknown) {}
    setName(_n: string) { return this; }
    setDesc(_d: string) { return this; }
    addText(cb: (text: { setValue(v: string): unknown; onChange(cb2: (v: string) => void): unknown }) => void) {
      const text = { setValue(_v: string) { return text; }, onChange(_cb: (v: string) => void) { return text; } };
      cb(text);
      return this;
    }
    addToggle(cb: (toggle: { setValue(v: boolean): unknown; onChange(cb2: (v: boolean) => void): unknown }) => void) {
      const toggle = { setValue(_v: boolean) { return toggle; }, onChange(_cb: (v: boolean) => void) { return toggle; } };
      cb(toggle);
      return this;
    }
  }

  return { PluginSettingTab, Setting };
});

function makePlugin(overrides: Partial<OllamaChatSettings> = {}) {
  return {
    settings: { ...DEFAULT_SETTINGS, ...overrides },
    saveData: vi.fn().mockResolvedValue(undefined),
  };
}

// ---------------------------------------------------------------------------
// DEFAULT_SETTINGS
// ---------------------------------------------------------------------------

describe('DEFAULT_SETTINGS', () => {
  it('has model "llama3.2"', () => {
    expect(DEFAULT_SETTINGS.model).toBe('llama3.2');
  });

  it('has baseURL "http://localhost:11434/api"', () => {
    expect(DEFAULT_SETTINGS.baseURL).toBe('http://localhost:11434/api');
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
});

// ---------------------------------------------------------------------------
// OllamaChatSettingTab
// ---------------------------------------------------------------------------

describe('OllamaChatSettingTab', () => {
  let plugin: ReturnType<typeof makePlugin>;
  let tab: OllamaChatSettingTab;

  beforeEach(() => {
    plugin = makePlugin();
    tab = new OllamaChatSettingTab({} as never, plugin as never);
  });

  it('calls containerEl.empty() when display() is called', () => {
    tab.display();

    expect(tab.containerEl.empty).toHaveBeenCalledOnce();
  });

  it('onTextChange updates the named string field and saves', async () => {
    await tab.onTextChange('model', 'mistral');

    expect(plugin.settings.model).toBe('mistral');
    expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
  });

  it('onToggleChange updates the named boolean field and saves', async () => {
    await tab.onToggleChange('promptSaveOnClose', false);

    expect(plugin.settings.promptSaveOnClose).toBe(false);
    expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
  });

  it('onNumberChange updates the named numeric field and saves', async () => {
    await tab.onNumberChange('contextWindowLines', '80');

    expect(plugin.settings.contextWindowLines).toBe(80);
    expect(plugin.saveData).toHaveBeenCalledWith(plugin.settings);
  });

  it('onNumberChange does not save when value is not a valid number', async () => {
    await tab.onNumberChange('contextWindowLines', 'abc');

    expect(plugin.settings.contextWindowLines).toBe(DEFAULT_SETTINGS.contextWindowLines);
    expect(plugin.saveData).not.toHaveBeenCalled();
  });

  it('onNumberChange does not save when value is empty string', async () => {
    await tab.onNumberChange('contextWindowLines', '');

    expect(plugin.saveData).not.toHaveBeenCalled();
  });
});
