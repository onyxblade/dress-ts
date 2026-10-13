import ts from 'typescript'
import { render } from 'preact-render-to-string'
import { Render, Verbatim, compose, createCtx, type Transform } from '.'

/** Render source text to HTML with the given transforms. */
export function renderHtml(text: string, transforms: Transform[] = []): string {
  const sf = ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true)
  const ctx = createCtx(sf, compose(() => Verbatim, transforms))
  return render(<Render node={sf} ctx={ctx} />)
}

/** Render source text and reduce the HTML to what the reader sees. */
export function renderText(text: string, transforms: Transform[] = []): string {
  return htmlToText(renderHtml(text, transforms))
}

const INDENT = '  '

/**
 * Reduce rendered HTML to plain text the way the layout CSS would show it:
 * a `div.line` is a line, a `div.indent` indents what it contains, spans
 * are transparent. With no layout divs at all (pure Verbatim) this is just
 * tag stripping.
 */
export function htmlToText(html: string): string {
  let out = ''
  let depth = 0
  let atLineStart = true
  const stack: Array<'line' | 'indent' | 'div'> = []
  const emit = (s: string) => {
    for (const ch of s) {
      if (atLineStart && ch !== '\n') out += INDENT.repeat(depth)
      out += ch
      atLineStart = ch === '\n'
    }
  }
  const re = /<\/?[^>]+>|[^<]+/g
  for (const m of html.match(re) ?? []) {
    if (m[0] !== '<') {
      emit(unescape(m))
    } else if (m.startsWith('</div')) {
      const kind = stack.pop()
      if (kind === 'indent') depth--
      if (kind === 'line' && !atLineStart) emit('\n')
    } else if (m.startsWith('<div')) {
      const kind = /class="line"/.test(m) ? 'line' : /class="indent"/.test(m) ? 'indent' : 'div'
      stack.push(kind)
      if (kind !== 'div' && !atLineStart) emit('\n')
      if (kind === 'indent') depth++
      if (kind === 'line' && /data-gap/.test(m)) emit('\n')
    }
  }
  return out
}

function unescape(s: string) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}
