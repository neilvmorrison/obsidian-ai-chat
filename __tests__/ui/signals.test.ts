import { describe, it, expect, vi } from 'vitest';
import { signal, computed } from '../../src/ui/signals';

describe('signal()', () => {
  it('returns initial value from get()', () => {
    const s = signal(42);

    const result = s.get();

    expect(result).toBe(42);
  });

  it('returns updated value after set()', () => {
    const s = signal('hello');

    s.set('world');

    expect(s.get()).toBe('world');
  });

  it('calls subscriber immediately on subscribe()', () => {
    const s = signal(10);
    const cb = vi.fn();

    s.subscribe(cb);

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(10);
  });

  it('calls subscriber on each set()', () => {
    const s = signal(0);
    const cb = vi.fn();
    s.subscribe(cb);
    cb.mockClear();

    s.set(1);
    s.set(2);

    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith(2);
  });

  it('updates value via updater function form of set()', () => {
    const s = signal(5);

    s.set(prev => prev * 2);

    expect(s.get()).toBe(10);
  });

  it('passes previous value to updater function', () => {
    const s = signal(3);
    const updater = vi.fn((prev: number) => prev + 1);

    s.set(updater);

    expect(updater).toHaveBeenCalledWith(3);
  });

  it('does not call subscriber after unsubscribe', () => {
    const s = signal(0);
    const cb = vi.fn();
    const unsub = s.subscribe(cb);
    cb.mockClear();

    unsub();
    s.set(99);

    expect(cb).not.toHaveBeenCalled();
  });

  it('supports multiple independent subscribers', () => {
    const s = signal('a');
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    s.subscribe(cb1);
    s.subscribe(cb2);
    cb1.mockClear();
    cb2.mockClear();

    s.set('b');

    expect(cb1).toHaveBeenCalledWith('b');
    expect(cb2).toHaveBeenCalledWith('b');
  });

  it('unsubscribing one does not affect other subscribers', () => {
    const s = signal(0);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    const unsub1 = s.subscribe(cb1);
    s.subscribe(cb2);
    cb1.mockClear();
    cb2.mockClear();

    unsub1();
    s.set(1);

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledWith(1);
  });
});

describe('computed()', () => {
  it('returns derived value from fn on get()', () => {
    const s = signal(4);

    const c = computed(() => s.get() * 2, [s]);

    expect(c.get()).toBe(8);
  });

  it('recomputes when a dependency changes', () => {
    const s = signal(3);
    const c = computed(() => s.get() + 1, [s]);

    s.set(10);

    expect(c.get()).toBe(11);
  });

  it('notifies subscribers when a dependency changes', () => {
    const s = signal(1);
    const c = computed(() => s.get() * 3, [s]);
    const cb = vi.fn();
    c.subscribe(cb);
    cb.mockClear();

    s.set(4);

    expect(cb).toHaveBeenCalledWith(12);
  });

  it('calls subscriber immediately on subscribe()', () => {
    const s = signal(2);
    const c = computed(() => s.get() + 10, [s]);
    const cb = vi.fn();

    c.subscribe(cb);

    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(12);
  });

  it('does not call subscriber after unsubscribe', () => {
    const s = signal(0);
    const c = computed(() => s.get(), [s]);
    const cb = vi.fn();
    const unsub = c.subscribe(cb);
    cb.mockClear();

    unsub();
    s.set(5);

    expect(cb).not.toHaveBeenCalled();
  });

  it('derives from multiple dependencies', () => {
    const a = signal(2);
    const b = signal(3);

    const c = computed(() => a.get() + b.get(), [a, b]);

    expect(c.get()).toBe(5);
  });

  it('recomputes when any of multiple dependencies change', () => {
    const a = signal(1);
    const b = signal(1);
    const c = computed(() => a.get() * b.get(), [a, b]);

    b.set(5);

    expect(c.get()).toBe(5);
  });
});
