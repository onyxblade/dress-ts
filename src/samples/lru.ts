/**
 * A least-recently-used cache over a Map. A Map keeps insertion order, so
 * the first key is the oldest and a hit becomes the newest by being deleted
 * and set again.
 */
export class LruCache<K, V> {
  private readonly entries = new Map<K, V>()

  constructor(private readonly capacity: number) {
    if (capacity < 1) throw new RangeError(`capacity must be positive, got ${capacity}`)
  }

  get size(): number {
    return this.entries.size
  }

  get(key: K): V | undefined {
    if (!this.entries.has(key)) return undefined
    const value = this.entries.get(key)!
    // Set again, so the key moves to the end: the most recent.
    this.entries.delete(key)
    this.entries.set(key, value)
    return value
  }

  set(key: K, value: V): this {
    this.entries.delete(key)
    this.entries.set(key, value)
    while (this.entries.size > this.capacity) {
      for (const oldest of this.entries.keys()) {
        this.entries.delete(oldest)
        break
      }
    }
    return this
  }

  has(key: K): boolean {
    return this.entries.has(key)
  }

  delete(key: K): boolean {
    return this.entries.delete(key)
  }

  clear(): void {
    this.entries.clear()
  }

  /** The keys from the most recent to the least. */
  keys(): K[] {
    return [...this.entries.keys()].reverse()
  }

  *[Symbol.iterator](): IterableIterator<[K, V]> {
    yield* this.entries
  }
}

/** `fn` remembered over its last `capacity` distinct arguments. */
export function memoize<A, R>(fn: (arg: A) => R, capacity = 64): (arg: A) => R {
  const cache = new LruCache<A, R>(capacity)
  return (arg) => {
    if (cache.has(arg)) return cache.get(arg)!
    const value = fn(arg)
    cache.set(arg, value)
    return value
  }
}
