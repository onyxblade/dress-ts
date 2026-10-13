import ts from 'typescript'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { render } from 'preact-render-to-string'
import { Render, Verbatim, allComments, compose, createCtx, createMemoryProgram, type LibSource, type Transform } from '.'

/** The compiler's lib files, read from the installed `typescript` package. */
const libDir = dirname(createRequire(import.meta.url).resolve('typescript'))
export const nodeLibs: LibSource = (name) => {
  try {
    return readFileSync(join(libDir, name), 'utf8')
  } catch {
    return undefined
  }
}

const FILE = 'x.ts'

/** A program over one file of source text, as the tests see it. */
export function programFor(text: string): ts.Program {
  return createMemoryProgram({ [FILE]: text }, nodeLibs)
}

/** Render source text to HTML with the given transforms. */
export function renderHtml(text: string, transforms: Transform[] = []): string {
  const ctx = createCtx(programFor(text), FILE, compose(() => Verbatim, transforms))
  return render(<Render node={ctx.sourceFile} ctx={ctx} />)
}

/** Render source text and reduce the HTML to what the reader sees. */
export function renderText(text: string, transforms: Transform[] = []): string {
  return htmlToText(renderHtml(text, transforms))
}

/**
 * The comments of the source that the rendering does not show. A reader
 * trusts a rendering only if it keeps every comment, so tests assert this
 * is empty for every theme over every input they have.
 */
export function lostComments(text: string, transforms: Transform[] = []): string[] {
  const shown = renderText(text, transforms)
  return allComments(ts.createSourceFile(FILE, text, ts.ScriptTarget.Latest, true))
    .map((c) => c.text)
    .filter((t) => !shown.includes(t))
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
  // A tag, with `>` allowed inside quoted attribute values, or text.
  const re = /<\/?[a-z][^\s>]*(?:\s+[^\s=>]+(?:="[^"]*")?)*\s*\/?>|[^<]+/g
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
