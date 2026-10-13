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
 * SourceFiles shared by every service in the process: a lib file never
 * changes for a given compiler, so the first service pays for the parse
 * and the ones after it (every test) take milliseconds.
 */
const registry = ts.createDocumentRegistry()

/**
 * A language service over files given as text, with no file system behind
 * it. The host is the whole bridge between the compiler and where the text
 * lives; everything else (parsing, binding, checking, quick info) is the
 * compiler's own. The program it builds is what components render from;
 * the service itself answers the editor-level questions (quick info,
 * references) that need the file *and* a position.
 *
 * Imports that resolve to nothing, such as `node:fs` here, are reported as
 * diagnostics and typed `any`. The checker still answers every other
 * question, so a component treats `any` as "unknown", never as a fact.
 */
export function createMemoryService(
  files: Record<string, string>,
  libs: LibSource,
  options: ts.CompilerOptions = defaultCompilerOptions,
): ts.LanguageService {
  const text = (name: string) => files[name] ?? (name.startsWith('lib.') ? libs(name) : undefined)
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => Object.keys(files),
    // The registry reuses a parse for the same name and version, and the
    // text is what tells two files of one name apart, so it is the version.
    getScriptVersion: (name) => files[name] ?? '0',
    getScriptSnapshot: (name) => {
      const t = text(name)
      return t === undefined ? undefined : ts.ScriptSnapshot.fromString(t)
    },
    getCompilationSettings: () => options,
    getDefaultLibFileName: () => DEFAULT_LIB,
    fileExists: (name) => text(name) !== undefined,
    readFile: text,
    // No directory at all: file names are used exactly as given, so `./a`
    // from `b.ts` resolves to `a.ts`, the key the caller chose.
    getCurrentDirectory: () => '',
    useCaseSensitiveFileNames: () => true,
  }
  return ts.createLanguageService(host, registry)
}

/** The program of a memory service, for a caller that only renders. */
export function createMemoryProgram(
  files: Record<string, string>,
  libs: LibSource,
  options: ts.CompilerOptions = defaultCompilerOptions,
): ts.Program {
  return createMemoryService(files, libs, options).getProgram()!
}
