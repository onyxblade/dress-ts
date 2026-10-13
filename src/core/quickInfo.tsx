import ts from 'typescript'

/**
 * What an editor shows on hover: the declaration form of what a token
 * names, `(method) Walker<T>.walk(path?: string): AsyncGenerator<string>`,
 * then its documentation. The language service composes it; this only asks
 * at the end of a node's range and checks the answer is about a token
 * filling that range, so a hover over `return x` or `a.b` does not pick up
 * the `x` or `b` it ends with. The range is the node's, leading trivia
 * included, as `nodeId` encodes it.
 */
export function quickInfoAt(service: ts.LanguageService, fileName: string, range: { pos: number; end: number }): ts.QuickInfo | undefined {
  const info = service.getQuickInfoAtPosition(fileName, range.end - 1)
  if (!info) return undefined
  return info.textSpan.start === tokenStart(service, fileName, range.pos) && info.textSpan.start + info.textSpan.length === range.end
    ? info
    : undefined
}

/** Where the first token at or after `pos` starts, past whitespace and comments. */
function tokenStart(service: ts.LanguageService, fileName: string, pos: number): number {
  const text = service.getProgram()!.getSourceFile(fileName)!.text
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, /* skipTrivia */ true, ts.LanguageVariant.Standard, text)
  scanner.resetTokenState(pos)
  scanner.scan()
  return scanner.getTokenStart()
}

/**
 * A quick info laid out as an editor would: the display parts in a
 * `pre`, each tagged with its kind (`keyword`, `className`,
 * `parameterName`...) for the stylesheet, then the documentation and its
 * tags as paragraphs.
 */
export function QuickInfo({ info }: { info: ts.QuickInfo }) {
  const doc = ts.displayPartsToString(info.documentation)
  return (
    <div class="quick-info">
      <pre class="signature">
        {info.displayParts?.map((p, i) => (
          <span key={i} data-part={p.kind}>
            {p.text}
          </span>
        ))}
      </pre>
      {doc && <p class="doc">{doc}</p>}
      {info.tags?.map((t, i) => (
        <p key={i} class="tag">
          <b>@{t.name}</b> {ts.displayPartsToString(t.text)}
        </p>
      ))}
    </div>
  )
}
