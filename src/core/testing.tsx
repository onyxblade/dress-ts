import ts from 'typescript'
import { render } from 'preact-render-to-string'
import { Render, Splice, compose, createCtx, type Transform } from '.'

/** Render source text to HTML with the given transforms. */
export function renderHtml(text: string, transforms: Transform[] = []): string {
  const sf = ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true)
  const ctx = createCtx(sf, compose(() => Splice, transforms))
  return render(<Render node={sf} ctx={ctx} />)
}

/** Render source text and strip markup, leaving only what the reader sees. */
export function renderText(text: string, transforms: Transform[] = []): string {
  return stripTags(renderHtml(text, transforms))
}

export function stripTags(html: string) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}
