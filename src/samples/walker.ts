/**
 * A directory walker: an interface, a generic class with an async generator
 * method, a guard-heavy function, an arrow function. Small but varied.
 */
import { readFile } from 'node:fs/promises'
import type { Dirent } from 'node:fs'

export interface Options<T extends object = {}> {
  readonly root: string
  filter?: (entry: Dirent) => boolean
  extra?: T
}

// A class with modifiers, decorators-free, and an async method.
export class Walker<T extends object> {
  private readonly seen = new Set<string>()

  constructor(public readonly options: Options<T>) {}

  async *walk(path = this.options.root): AsyncGenerator<string> {
    if (this.seen.has(path)) return
    this.seen.add(path)
    const text = await readFile(path, 'utf8')
    yield `${path}: ${text.length} bytes` /* trailing comment */
  }
}

/**
 * The magnitude of `x`, with nothing read as zero.
 * @param x a number, or the two ways of having none
 */
export function guard(x: number | null | undefined): number {
  if (x === null) return 0
  if (x === undefined) return 0
  if (x < 0) {
    return -x
  }
  return x?.valueOf() ?? 0
}

export const pick = <K extends keyof Options>(o: Options, ...keys: K[]) =>
  Object.fromEntries(keys.map((k) => [k, o[k]])) as Pick<Options, K>
