import ts from 'typescript'

/**
 * Where the text of a `lib.*.d.ts` comes from. The checker needs the
 * compiler's own declarations of `Array`, `Promise` and so on, and how
 * they are read depends on where the rendering runs: from disk in tests,
 * from bundled text in the browser. Core only asks; the caller answers.
 */
export type LibSource = (name: string) => string | undefined

export const DEFAULT_LIB = 'lib.es2022.d.ts'

/**
 * Strict, ES2022, no DOM, no `@types`: enough for the checker to answer
 * questions about a file on its own. Bundler resolution lets a relative
 * import find another file given by name.
 */
export const defaultCompilerOptions: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  lib: [DEFAULT_LIB],
  strict: true,
  noEmit: true,
  types: [],
}

/**
 * Lib files never change for a given compiler, so their SourceFiles are
 * parsed once per process and shared by every program: the first program
 * pays for the parse, the ones after it (every test) take milliseconds.
 */
const libCache = new Map<string, ts.SourceFile>()

/**
 * A program over files given as text, with no file system behind it. The
 * CompilerHost is the whole bridge between the compiler and where the text
 * lives; everything else (binding, checking) is the compiler's own.
 *
 * Imports that resolve to nothing, such as `node:fs` here, are reported as
 * diagnostics and typed `any`. The checker still answers every other
 * question, so a component treats `any` as "unknown", never as a fact.
 */
export function createMemoryProgram(
  files: Record<string, string>,
  libs: LibSource,
  options: ts.CompilerOptions = defaultCompilerOptions,
): ts.Program {
  const sources = new Map(
    Object.entries(files).map(([name, text]) => [name, ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true)]),
  )
  const lib = (name: string): ts.SourceFile | undefined => {
    const cached = libCache.get(name)
    if (cached) return cached
    const text = libs(name)
    if (text === undefined) return undefined
    const sf = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true)
    libCache.set(name, sf)
    return sf
  }
  const host: ts.CompilerHost = {
    getSourceFile: (name) => sources.get(name) ?? (name.startsWith('lib.') ? lib(name) : undefined),
    getDefaultLibFileName: () => DEFAULT_LIB,
    fileExists: (name) => sources.has(name) || (name.startsWith('lib.') && libs(name) !== undefined),
    readFile: (name) => files[name] ?? (name.startsWith('lib.') ? libs(name) : undefined),
    writeFile: () => {},
    // No directory at all: file names are used exactly as given, so `./a`
    // from `b.ts` resolves to `a.ts`, the key the caller chose.
    getCurrentDirectory: () => '',
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
  }
  return ts.createProgram([...sources.keys()], options, host)
}
