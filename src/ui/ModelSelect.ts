export interface ModelSelectHandle {
  el: HTMLSelectElement;
}

export interface ModelSelectProps {
  currentModel: string;
  baseURL: string;
  onModelChange: (model: string) => Promise<void>;
}

export function createModelSelect(
  parent: HTMLElement,
  props: ModelSelectProps,
): ModelSelectHandle {
  const el = parent.createEl('select', {
    cls: 'oac-model-select',
  }) as HTMLSelectElement;

  const initialOption = el.createEl('option', { text: props.currentModel });
  initialOption.value = props.currentModel;

  el.addEventListener('change', () => props.onModelChange(el.value));

  fetchModels(props.baseURL).then((models) => {
    const current = props.currentModel;
    el.empty();
    if (!models.includes(current)) models.unshift(current);
    for (const m of models) {
      const opt = el.createEl('option', { text: m });
      opt.value = m;
      if (m === current) opt.selected = true;
    }
  });

  return { el };
}

async function fetchModels(baseURL: string): Promise<string[]> {
  const tagsURL = baseURL.replace(/\/+$/, '') + '/tags';
  const response = await fetch(tagsURL);
  if (!response.ok) throw new Error('Failed to fetch models');
  const data = await response.json();
  return (data.models ?? []).map((m: { name: string }) => m.name);
}
