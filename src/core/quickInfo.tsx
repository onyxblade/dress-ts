import ts from 'typescript'

/**
 * What an editor shows on hover: the declaration form of what a token
 * names, `(method) Walker<T>.walk(path?: string): AsyncGenerator<string>`,
 * then its documentation. The language service composes it; this only asks
 * at a position and checks the answer is about the token ending there, so
 * a hover over a whole expression does not pick up its last identifier.
 */
export function quickInfoAt(service: ts.LanguageService, fileName: string, end: number): ts.QuickInfo | undefined {
  const info = service.getQuickInfoAtPosition(fileName, end - 1)
  return info && info.textSpan.start + info.textSpan.length === end ? info : undefined
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
