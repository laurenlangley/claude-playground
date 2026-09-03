/** Small helpers for building native, keyboard-operable controls. */

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  for (const c of children) n.append(c);
  return n;
}

export interface SliderOptions {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  onInput: (v: number) => void;
}

/**
 * Native <input type="range">. Not a styled div: range inputs are arrow-key
 * adjustable, Home/End aware, screen-reader legible and thumb-draggable for
 * free, and every custom slider re-implementation loses at least one of those.
 */
export function slider(o: SliderOptions): { row: HTMLElement; input: HTMLInputElement; out: HTMLOutputElement } {
  const id = `s-${Math.random().toString(36).slice(2, 8)}`;
  const input = el('input', {
    type: 'range',
    id,
    min: String(o.min),
    max: String(o.max),
    step: String(o.step),
    value: String(o.value),
  }) as HTMLInputElement;
  const out = el('output', { for: id }, [o.format(o.value)]) as HTMLOutputElement;
  const label = el('label', { for: id }, [o.label]);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    out.textContent = o.format(v);
    o.onInput(v);
  });
  const row = el('div', { class: 'row' }, [label, input, out]);
  return { row, input, out };
}

export function toggleGroup(
  options: { value: string; label: string }[],
  initial: string,
  onChange: (v: string) => void,
): HTMLElement {
  const wrap = el('div', { class: 'controls', role: 'radiogroup' });
  const buttons: HTMLButtonElement[] = [];
  for (const o of options) {
    const b = el('button', {
      type: 'button',
      role: 'radio',
      'aria-checked': String(o.value === initial),
      'aria-pressed': String(o.value === initial),
    }, [o.label]) as HTMLButtonElement;
    b.addEventListener('click', () => {
      for (const other of buttons) {
        other.setAttribute('aria-checked', String(other === b));
        other.setAttribute('aria-pressed', String(other === b));
      }
      onChange(o.value);
    });
    buttons.push(b);
    wrap.append(b);
  }
  return wrap;
}

export function section(title: string, children: (Node | string)[]): HTMLElement {
  return el('section', {}, [el('h2', {}, [title]), ...children]);
}
