// Minimal runtime stub. Tests override this via vi.mock('obsidian', factory).
export class Plugin {}
export class PluginSettingTab {
  containerEl = { empty: () => {} };
  constructor(_app: unknown, _plugin: unknown) {}
}
export class Setting {
  constructor(_el: unknown) {}
  setName(_n: string) { return this; }
  setDesc(_d: string) { return this; }
  setHeading() { return this; }
  addText(_cb: unknown) { return this; }
  addToggle(_cb: unknown) { return this; }
  addDropdown(_cb: unknown) { return this; }
  addButton(_cb: unknown) { return this; }
}
export class Modal {
  contentEl = { empty: () => {}, createEl: () => ({}) };
  constructor(_app: unknown) {}
  open() {}
  close() {}
}
export class App {}
