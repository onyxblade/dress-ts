import type ts from 'typescript'
import { useEffect, useRef, useState } from 'preact/hooks'
import {
  QuickInfo,
  ImportInfo,
  Render,
  Verbatim,
  compose,
  createCtx,
  importOf,
  importsOf,
  nodeById,
  parseNodeId,
  quickInfoAt,
  semanticIdentifiers,
  type NodeRange,
  type StaticImport,
  type Theme,
  type Transform,
} from './core'
import { themes } from './themes'

/**
 * A view is what one pane shows: a named transform list. The two core views
 * are not themes, they are the baselines a theme is compared against: the
 * source as written, and the source with only the checker's contribution.
 */
interface View {
  name: string
  transforms: Transform[]
}

const views: View[] = [
  { name: 'source', transforms: [] },
  { name: 'typed', transforms: [semanticIdentifiers] },
  ...themes.map((t: Theme) => ({ name: t.name, transforms: t.transforms })),
]

const viewNamed = (name: string | null, fallback: View) => views.find((v) => v.name === name) ?? fallback

/** What the page shows: a file, and a view on each side. It lives in the URL, so a comparison is a link. */
interface Choice {
  file: string
  left: View
  right: View
}

function readChoice(fileNames: string[]): Choice {
  const params = new URLSearchParams(location.search)
  const file = params.get('file')
  return {
    file: file && fileNames.includes(file) ? file : fileNames[0],
    left: viewNamed(params.get('left'), views[0]),
    right: viewNamed(params.get('right'), views[views.length - 1]),
  }
}

function writeChoice({ file, left, right }: Choice) {
  const params = new URLSearchParams({ file, left: left.name, right: right.name })
  history.replaceState(null, '', `?${params}`)
}

function Pane({ program, fileName, view, onChange }: { program: ts.Program; fileName: string; view: View; onChange: (v: View) => void }) {
  const ctx = createCtx(program, fileName, compose(() => Verbatim, view.transforms))
  const imports = importsOf(ctx.sourceFile)
  return (
    <section class="pane">
      <header>
        <select value={view.name} onChange={(e) => onChange(viewNamed(e.currentTarget.value, view))}>
          {views.map((v) => (
            <option key={v.name} value={v.name}>
              {v.name}
            </option>
          ))}
        </select>
        {imports.length > 0 && (
          <button type="button" class="imports-summary" data-imports="" aria-label={`Show ${imports.length} ${imports.length === 1 ? 'import' : 'imports'}`}>
            {imports.length} {imports.length === 1 ? 'import' : 'imports'}
          </button>
        )}
      </header>
      <pre class="code" data-theme={view.name}>
        <Render node={ctx.sourceFile} ctx={ctx} />
      </pre>
    </section>
  )
}

/**
 * Both panes render the same AST, so a node hovered on one side has a twin
 * on the other: the span with the same `data-node` (see core nodeId). The
 * twin is marked `peer`. Done on the DOM, not through state: the trees are
 * large and nothing about them changes.
 */
function markPeers(root: HTMLElement, target: EventTarget | null) {
  root.querySelectorAll('.peer').forEach((el) => el.classList.remove('peer'))
  const id = (target as Element | null)?.closest?.('[data-node]')?.getAttribute('data-node')
  if (!id) return
  root.querySelectorAll(`[data-node="${id}"]`).forEach((el) => el.classList.add('peer'))
}

/** The node under the pointer: the nearest element carrying an identity, and what it encodes. */
function hovered(target: EventTarget | null): Hovered | undefined {
  const el = (target as Element | null)?.closest?.('[data-node]')
  const id = el?.getAttribute('data-node')
  const range = id ? parseNodeId(id) : undefined
  return el && id && range ? { el, id, range } : undefined
}

interface Hovered {
  el: Element
  id: string
  range: NodeRange
}

/**
 * Where an element's text is on screen. Not its own rect: a reading mark
 * is `display: contents` (see style.css), with no box of its own, and it
 * is the hovered element when a theme's word fills a whole token, `self`
 * for `this`. A Range over the contents measures the text either way.
 */
function boxOf(el: Element): DOMRect {
  const range = document.createRange()
  range.selectNodeContents(el)
  return range.getBoundingClientRect()
}

/** The first line of a node as written, which is what a reading replaced. */
function written(node: ts.Node, sourceFile: ts.SourceFile): string {
  const text = sourceFile.text.slice(node.getStart(sourceFile), node.end)
  const nl = text.indexOf('\n')
  return nl === -1 ? text : `${text.slice(0, nl)} …`
}

/**
 * The reading the hovered node is shown in, when a theme gave it one: the
 * mark's note, and the node as written. The mark carries the node's own
 * identity and is the hovered element itself, around it, or just inside
 * it, since the Line laid out for a statement wraps the mark. The nearest
 * mark around the pointer would be wrong: beside the header of an
 * `if ... end` the pointer is on the if's Line, yet inside the mark of the
 * function around it. On a source token the quick info wins, see below.
 */
function readingOf({ el, id }: Hovered, sourceFile: ts.SourceFile) {
  const own = `[data-reading][data-node="${id}"]`
  const mark = el.closest(own) ?? el.querySelector(own)
  const node = mark && nodeById(sourceFile, id)
  return node ? { note: mark.getAttribute('data-reading')!, written: written(node, sourceFile) } : undefined
}

type Card = { kind: 'info'; info?: ts.QuickInfo; imports: StaticImport[] } | { kind: 'reading'; note: string; written: string }

/** The card for a pointer position: what it says, and where it hangs. */
function cardAt(e: MouseEvent | FocusEvent, service: ts.LanguageService, fileName: string): Shown | null {
  const program = service.getProgram()!
  const sourceFile = program.getSourceFile(fileName)!
  const summary = (e.target as Element | null)?.closest?.('[data-imports]')
  if (summary) {
    const r = boxOf(summary)
    return { key: 'imports', card: { kind: 'info', imports: importsOf(sourceFile) }, at: { left: r.left, top: r.bottom }, pinned: false }
  }
  const h = hovered(e.target)
  if (!h) return null
  const node = nodeById(sourceFile, h.id)
  const origin = node && importOf(node, program.getTypeChecker())
  const info = quickInfoAt(service, fileName, h.range)
  if (info || origin) {
    const r = boxOf(h.el)
    return { key: h.id, card: { kind: 'info', info, imports: origin ? [origin] : [] }, at: { left: r.left, top: r.bottom }, pinned: false }
  }
  const reading = readingOf(h, sourceFile)
  // A reading mark has no box; anchor to the pointer.
  const r = boxOf(h.el)
  const at = 'clientX' in e ? { left: e.clientX, top: e.clientY + 16 } : { left: r.left, top: r.bottom }
  return reading ? { key: h.id, card: { kind: 'reading', ...reading }, at, pinned: false } : null
}

interface Shown {
  key: string
  card: Card
  at: { left: number; top: number }
  /** Held in place by a click: hovering leaves it alone, and it can be read and copied from. */
  pinned: boolean
}

/**
 * A card below the pointer, shown the moment it arrives: the quick info of
 * the token under it, or, on words a theme wrote, the reading they belong
 * to. Both panes show the same file, so one card serves both and a
 * position means the same thing on either side. A click pins the card
 * where it is, so it can be read at leisure; a click or Escape lets it go.
 * The card owns the state, so hovering re-renders the card and nothing
 * else; the panes are large and nothing about them changes.
 */
function Hover({ root, service, fileName }: { root: { current: HTMLElement | null }; service: ts.LanguageService; fileName: string }) {
  const [shown, setShown] = useState<Shown | null>(null)
  useEffect(() => {
    setShown(null)
    const el = root.current
    if (!el) return
    const over = (e: MouseEvent) => setShown((prev) => (prev?.pinned ? prev : cardAt(e, service, fileName)))
    const leave = () => setShown((prev) => (prev?.pinned ? prev : null))
    const focus = (e: FocusEvent) => {
      if ((e.target as Element).closest('[data-imports]')) setShown(cardAt(e, service, fileName))
    }
    const click = (e: MouseEvent) => {
      if (!(e.target as Element).closest('.code, [data-imports]')) return
      const next = cardAt(e, service, fileName)
      setShown((prev) => next && !(prev?.pinned && prev.key === next.key) ? { ...next, pinned: true } : null)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShown(null)
    }
    el.addEventListener('mouseover', over)
    el.addEventListener('mouseleave', leave)
    el.addEventListener('click', click)
    el.addEventListener('focusin', focus)
    el.addEventListener('focusout', leave)
    document.addEventListener('keydown', key)
    return () => {
      el.removeEventListener('mouseover', over)
      el.removeEventListener('mouseleave', leave)
      el.removeEventListener('click', click)
      el.removeEventListener('focusin', focus)
      el.removeEventListener('focusout', leave)
      document.removeEventListener('keydown', key)
    }
  }, [root, service, fileName])
  if (!shown) return null
  const { card, at, pinned } = shown
  const left = Math.min(at.left, Math.max(0, window.innerWidth - 480))
  return (
    <div class={pinned ? 'hover pinned' : 'hover'} style={`left: ${left}px; top: ${at.top + 4}px`}>
      {card.kind === 'info' ? (
        <>
          {card.info && <QuickInfo info={card.info} />}
          {card.imports.length > 0 && <ImportInfo imports={card.imports} />}
        </>
      ) : (
        <div class="reading-info">
          <p class="note">{card.note}</p>
          <pre class="written">{card.written}</pre>
        </div>
      )}
    </div>
  )
}

/** One of the files, two readings side by side. Each side picks its view; the bar above picks the file. */
export function App({ service, fileNames }: { service: ts.LanguageService; fileNames: string[] }) {
  const program = service.getProgram()!
  const [choice, setChoice] = useState(() => readChoice(fileNames))
  const { file, left, right } = choice
  const set = (next: Partial<Choice>) => {
    const whole = { ...choice, ...next }
    writeChoice(whole)
    setChoice(whole)
  }
  const main = useRef<HTMLElement>(null)
  return (
    <>
      <nav class="files">
        <select value={file} onChange={(e) => set({ file: e.currentTarget.value })}>
          {fileNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </nav>
      <main
        ref={main}
        class="compare"
        onMouseOver={(e) => markPeers(e.currentTarget, e.target)}
        onMouseLeave={(e) => markPeers(e.currentTarget, null)}
      >
        <Pane program={program} fileName={file} view={left} onChange={(v) => set({ left: v })} />
        <Pane program={program} fileName={file} view={right} onChange={(v) => set({ right: v })} />
      </main>
      <Hover root={main} service={service} fileName={file} />
    </>
  )
}
