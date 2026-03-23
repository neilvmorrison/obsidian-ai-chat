import { App, Modal, PluginSettingTab, Setting } from 'obsidian';
import type { AIChatSettings, ProviderSettings, ProviderType } from './types/settings';

// Insertion order defines built-in preset rendering order in the UI.
const PRESET_ORDER = ['ollama', 'lmstudio', 'openai', 'openrouter', 'anthropic', 'gemini'] as const;

/** Factory functions — call to get a fresh preset object. Never export the objects directly. */
export const PROVIDER_PRESETS: Record<string, () => ProviderSettings> = {
  ollama:      () => ({ id: 'ollama',      name: 'Ollama',      type: 'ollama',        baseUrl: 'http://localhost:11434/api',              apiKey: '', model: 'llama3.2',            enabled: true  }),
  lmstudio:    () => ({ id: 'lmstudio',    name: 'LM Studio',   type: 'openai-compat', baseUrl: 'http://localhost:1234/v1',                  apiKey: '', model: 'local-model',       enabled: false }),
  openai:      () => ({ id: 'openai',      name: 'OpenAI',      type: 'openai-compat', baseUrl: 'https://api.openai.com/v1',                 apiKey: '', model: 'gpt-4o',            enabled: false }),
  openrouter:  () => ({ id: 'openrouter',  name: 'OpenRouter',  type: 'openai-compat', baseUrl: 'https://openrouter.ai/api/v1',              apiKey: '', model: 'openai/gpt-4o',    enabled: false }),
  anthropic:   () => ({ id: 'anthropic',   name: 'Anthropic',   type: 'anthropic',     baseUrl: 'https://api.anthropic.com',                 apiKey: '', model: 'claude-sonnet-4-5', enabled: false }),
  gemini:      () => ({ id: 'gemini',      name: 'Gemini',      type: 'gemini',        baseUrl: 'https://generativelanguage.googleapis.com', apiKey: '', model: 'gemini-2.0-flash', enabled: false }),
};

export const DEFAULT_SETTINGS: AIChatSettings = {
  version: 1,
  defaultProviderId: 'ollama',
  providers: Object.fromEntries(
    Object.entries(PROVIDER_PRESETS).map(([id, factory]) => [id, factory()]),
  ),
  contextWindowLines: 40,
  systemPromptPrefix: 'You are a helpful assistant embedded in Obsidian.',
  saveFolder: 'AI Chats',
  promptSaveOnClose: true,
  hotkey: 'Mod+Shift+A',
  agentProviderId: 'ollama',
  agentModel: '',
  agentSystemPrompt: 'You are a precise file-system agent. Complete tasks using only the tools provided.',
};

/** Lowercase, spaces to hyphens, strip non-alphanumeric-hyphen, collapse consecutive hyphens. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Slugify name and append -2, -3, … on collision. */
export function generateProviderId(name: string, existingIds: string[]): string {
  const base = slugify(name);
  if (!existingIds.includes(base)) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/**
 * Migrate raw persisted data to AIChatSettings.
 *
 * Cases:
 *   null / undefined           → DEFAULT_SETTINGS
 *   no `version` field         → prototype-era OllamaChatSettings shape; map fields and warn
 *   { version: 1, … }         → return as-is, no warning
 *   anything else              → merge against defaults and warn
 */
export function migrate(raw: unknown): AIChatSettings {
  if (raw === null || raw === undefined) {
    return structuredClone(DEFAULT_SETTINGS);
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    console.warn('migrate: unrecognised settings shape, merging against defaults');
    return structuredClone(DEFAULT_SETTINGS);
  }

  const obj = raw as Record<string, unknown>;

  if (obj.version === 1) {
    const settings = raw as AIChatSettings;
    // Migrate Ollama provider to native type: update type and baseUrl to use /api path.
    if (settings.providers?.ollama) {
      const ollama = settings.providers.ollama;
      if ((ollama.type as string) === 'openai-compat' && ollama.baseUrl?.endsWith('/v1')) {
        ollama.type = 'ollama';
        ollama.baseUrl = ollama.baseUrl.replace(/\/v1$/, '/api');
      }
    }
    return settings;
  }

  if (!('version' in obj)) {
    console.warn('migrate: detected prototype-era settings (no version field), migrating to v1');
    const result: AIChatSettings = structuredClone(DEFAULT_SETTINGS);

    if (typeof obj.baseURL === 'string') {
      // Prototype stored the Ollama /api path; native ollama type also uses /api.
      result.providers.ollama.baseUrl = obj.baseURL;
    }
    if (typeof obj.model === 'string')              result.providers.ollama.model = obj.model;
    if (typeof obj.contextWindowLines === 'number') result.contextWindowLines = obj.contextWindowLines;
    if (typeof obj.systemPromptPrefix === 'string') result.systemPromptPrefix = obj.systemPromptPrefix;
    if (typeof obj.saveFolder === 'string')         result.saveFolder = obj.saveFolder;
    if (typeof obj.promptSaveOnClose === 'boolean') result.promptSaveOnClose = obj.promptSaveOnClose;
    if (typeof obj.hotkey === 'string')             result.hotkey = obj.hotkey;
    if (typeof obj.agentModel === 'string')         result.agentModel = obj.agentModel;
    if (typeof obj.agentSystemPrompt === 'string')  result.agentSystemPrompt = obj.agentSystemPrompt;

    result.providers.ollama.enabled = true;
    result.defaultProviderId = 'ollama';
    return result;
  }

  console.warn('migrate: unrecognised settings shape, merging against defaults');
  return { ...structuredClone(DEFAULT_SETTINGS), ...(obj as Partial<AIChatSettings>) } as AIChatSettings;
}

interface PluginRef {
  app: App;
  settings: AIChatSettings;
  loadData(): Promise<unknown>;
  saveData(data: AIChatSettings): Promise<void>;
}

export class SettingsStore {
  constructor(private plugin: { loadData(): Promise<unknown>; saveData(data: unknown): Promise<void> }) {}

  async load(): Promise<AIChatSettings> {
    const raw = await this.plugin.loadData();
    const migrated = migrate(raw);
    const result: AIChatSettings = { ...DEFAULT_SETTINGS, ...migrated };
    result.providers = { ...DEFAULT_SETTINGS.providers, ...migrated.providers };
    return result;
  }

  async save(settings: AIChatSettings): Promise<void> {
    await this.plugin.saveData(settings);
  }
}

export class AIChatSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: PluginRef) {
    super(app, plugin as never);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    const { settings } = this.plugin;
    const enabledProviders = Object.values(settings.providers).filter(p => p.enabled);

    // 1. Default provider dropdown
    const dropdownSetting = new Setting(containerEl)
      .setName('Default provider')
      .setDesc('Provider used for new chat sessions');

    if (enabledProviders.length === 0) {
      dropdownSetting.addDropdown(dd => {
        dd.addOption('', 'No providers enabled');
        dd.setValue('');
        (dd as unknown as { setDisabled(v: boolean): void }).setDisabled?.(true);
      });
    } else {
      dropdownSetting.addDropdown(dd => {
        for (const p of enabledProviders) dd.addOption(p.id, p.name);
        dd.setValue(settings.defaultProviderId);
        dd.onChange(v => {
          settings.defaultProviderId = v;
          this.plugin.saveData(settings).then(() => this.display());
        });
      });
    }

    // 2. Provider sections — built-in presets first (in PRESET_ORDER), then custom alphabetically
    const builtinIds = PRESET_ORDER.filter(id => id in settings.providers);
    const customIds = Object.keys(settings.providers)
      .filter(id => !(id in PROVIDER_PRESETS))
      .sort((a, b) => settings.providers[a].name.localeCompare(settings.providers[b].name));

    for (const id of [...builtinIds, ...customIds]) {
      this.renderProviderSection(containerEl, settings.providers[id]);
    }

    // 3. Add custom provider button
    new Setting(containerEl).addButton(btn =>
      btn.setButtonText('Add provider').onClick(() =>
        new AddProviderModal(this.plugin.app, this.plugin, () => this.display()).open(),
      ),
    );
  }

  private renderProviderSection(containerEl: HTMLElement, provider: ProviderSettings): void {
    const { settings } = this.plugin;
    const isBuiltin = provider.id in PROVIDER_PRESETS;

    new Setting(containerEl).setName(provider.name).setHeading();

    // Toggle: enabled/disabled
    new Setting(containerEl).setName('Enabled').addToggle(toggle =>
      toggle.setValue(provider.enabled).onChange(v => {
        provider.enabled = v;
        if (!v && settings.defaultProviderId === provider.id) {
          const next = Object.values(settings.providers).find(p => p.enabled && p.id !== provider.id);
          settings.defaultProviderId = next?.id ?? '';
        }
        this.plugin.saveData(settings).then(() => this.display());
      }),
    );

    // Base URL
    new Setting(containerEl).setName('Base URL').addText(text =>
      text.setValue(provider.baseUrl).onChange(v => {
        provider.baseUrl = v;
        this.plugin.saveData(settings);
      }),
    );

    // API key (rendered as password field)
    const isLocalOAICompat =
      provider.type === 'openai-compat' &&
      (provider.baseUrl.startsWith('http://localhost') || provider.baseUrl.startsWith('http://127.0.0.1'));
    new Setting(containerEl).setName('API key').addText(text => {
      const el = (text as unknown as { inputEl?: HTMLInputElement }).inputEl;
      if (el) el.type = 'password';
      text
        .setPlaceholder(isLocalOAICompat ? 'No key required' : 'sk-...')
        .setValue(provider.apiKey)
        .onChange(v => {
          provider.apiKey = v;
          this.plugin.saveData(settings);
        });
    });

    // Model
    new Setting(containerEl).setName('Model').addText(text =>
      text.setValue(provider.model).onChange(v => {
        provider.model = v;
        this.plugin.saveData(settings);
      }),
    );

    // Reset to defaults — built-in presets only
    if (isBuiltin) {
      new Setting(containerEl).addButton(btn =>
        btn.setButtonText('Reset to defaults').onClick(() => {
          settings.providers[provider.id] = PROVIDER_PRESETS[provider.id]();
          this.plugin.saveData(settings).then(() => this.display());
        }),
      );
    }

    // Delete — custom providers only, two-click confirmation
    if (!isBuiltin) {
      let confirmed = false;
      new Setting(containerEl).addButton(btn => {
        btn.setButtonText('Delete').onClick(() => {
          if (!confirmed) {
            confirmed = true;
            btn.setButtonText('Click again to confirm');
            const el = (btn as unknown as { buttonEl?: HTMLElement }).buttonEl;
            if (el) el.classList.add('is-warning');
          } else {
            delete settings.providers[provider.id];
            this.plugin.saveData(settings).then(() => this.display());
          }
        });
      });
    }
  }
}

export class AddProviderModal extends Modal {
  private name = '';
  private type: ProviderType = 'openai-compat';
  private baseUrl = '';
  private apiKey = '';
  private model = '';

  constructor(app: App, private plugin: PluginRef, private onComplete: () => void) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();

    new Setting(contentEl).setName('Name').addText(text =>
      text.onChange(v => { this.name = v; }),
    );

    new Setting(contentEl).setName('Type').addDropdown(dd => {
      dd.addOption('openai-compat', 'OpenAI-compatible');
      dd.addOption('anthropic', 'Anthropic');
      dd.addOption('gemini', 'Gemini');
      dd.setValue(this.type);
      dd.onChange(v => { this.type = v as ProviderType; });
    });

    new Setting(contentEl).setName('Base URL').addText(text =>
      text.onChange(v => { this.baseUrl = v; }),
    );

    new Setting(contentEl).setName('API key').addText(text => {
      const el = (text as unknown as { inputEl?: HTMLInputElement }).inputEl;
      if (el) el.type = 'password';
      text.onChange(v => { this.apiKey = v; });
    });

    new Setting(contentEl).setName('Model').addText(text =>
      text.onChange(v => { this.model = v; }),
    );

    new Setting(contentEl).addButton(btn =>
      btn.setButtonText('Add provider').onClick(() => this.submit()),
    );
  }

  private submit(): void {
    const id = generateProviderId(this.name, Object.keys(this.plugin.settings.providers));
    this.plugin.settings.providers[id] = {
      id,
      name: this.name,
      type: this.type,
      baseUrl: this.baseUrl,
      apiKey: this.apiKey,
      model: this.model,
      enabled: true,
    };
    this.plugin.saveData(this.plugin.settings).then(() => {
      this.close();
      this.onComplete();
    });
  }
}
