/** A subscriber callback that receives the current value. */
type Subscriber<T> = (value: T) => void;

/** Cleanup function returned by `subscribe()`. Call it to stop receiving updates. */
type Unsubscribe = () => void;

/**
 * Read-only view of a signal. Components receive this interface so they can
 * read and observe state without being able to mutate it.
 */
export interface ReadonlySignal<T> {
  /** Returns the current value. */
  get(): T;

  /**
   * Subscribes to value changes. The callback is called immediately with the
   * current value, then again whenever the value changes.
   *
   * @param cb - Called with the current value on subscribe and on each change.
   * @returns An unsubscribe function. Call it to remove the subscription.
   */
  subscribe(cb: Subscriber<T>): Unsubscribe;
}

/**
 * A writable reactive value. Only the module that created the signal should
 * call `set()` — pass `ReadonlySignal<T>` to anything that should only read.
 */
export interface Signal<T> extends ReadonlySignal<T> {
  /**
   * Updates the value. Accepts either a direct value or an updater function
   * that receives the previous value and returns the next value.
   *
   * @param valueOrUpdater - The new value, or a function `(prev: T) => T`.
   */
  set(valueOrUpdater: T | ((prev: T) => T)): void;
}

/**
 * Creates a writable reactive signal.
 *
 * @param initial - The starting value.
 * @returns A `Signal<T>` with `get()`, `set()`, and `subscribe()`.
 *
 * @example
 * ```ts
 * const count = signal(0);
 * count.subscribe(v => console.log('count:', v)); // logs 0 immediately
 * count.set(1);                                   // logs 1
 * count.set(prev => prev + 1);                    // logs 2
 * ```
 */
export function signal<T>(initial: T): Signal<T> {
  let current = initial;
  const subscribers = new Set<Subscriber<T>>();

  return {
    get() {
      return current;
    },

    set(valueOrUpdater) {
      const next =
        typeof valueOrUpdater === 'function'
          ? (valueOrUpdater as (prev: T) => T)(current)
          : valueOrUpdater;
      current = next;
      for (const cb of subscribers) {
        cb(current);
      }
    },

    subscribe(cb) {
      subscribers.add(cb);
      cb(current);
      return () => {
        subscribers.delete(cb);
      };
    },
  };
}

/**
 * Creates a read-only signal derived from one or more dependency signals.
 * Recomputes `fn` and notifies its own subscribers whenever any dependency
 * emits a new value.
 *
 * @param fn   - Pure function that reads dependencies and returns a derived value.
 * @param deps - The signals that `fn` depends on. Must list every signal read
 *               inside `fn` — there is no auto-tracking.
 * @returns A `ReadonlySignal<T>`.
 *
 * @example
 * ```ts
 * const firstName = signal('Ada');
 * const lastName  = signal('Lovelace');
 * const fullName  = computed(() => `${firstName.get()} ${lastName.get()}`, [firstName, lastName]);
 * fullName.subscribe(v => console.log(v)); // "Ada Lovelace"
 * lastName.set('Byron');                   // "Ada Byron"
 * ```
 */
export function computed<T>(
  fn: () => T,
  deps: ReadonlySignal<unknown>[],
): ReadonlySignal<T> {
  const derived = signal<T>(fn());

  for (const dep of deps) {
    dep.subscribe(() => {
      derived.set(fn());
    });
  }

  return {
    get: () => derived.get(),
    subscribe: cb => derived.subscribe(cb),
  };
}
