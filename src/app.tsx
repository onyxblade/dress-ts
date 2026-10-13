import type ts from 'typescript'
import { useEffect, useRef, useState } from 'preact/hooks'
import {
  QuickInfo,
  Render,
  Verbatim,
  compose,
  createCtx,
  nodeById,
  parseNodeId,
  quickInfoAt,
  semanticIdentifiers,
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

/** Which view each side shows lives in the URL, so a comparison is a link. */
function readSides(): [View, View] {
  const params = new URLSearchParams(location.search)
  return [viewNamed(params.get('left'), views[0]), viewNamed(params.get('right'), views[views.length - 1])]
}

function writeSides(left: View, right: View) {
  const params = new URLSearchParams({ left: left.name, right: right.name })
  history.replaceState(null, '', `?${params}`)
}

function Pane({ program, fileName, view, onChange }: { program: ts.Program; fileName: string; view: View; onChange: (v: View) => void }) {
  const ctx = createCtx(program, fileName, compose(() => Verbatim, view.transforms))
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

/** The node under the pointer: its span and the range its identity encodes. */
function hovered(target: EventTarget | null) {
  const el = (target as Element | null)?.closest?.('[data-node]')
  const range = el && parseNodeId(el.getAttribute('data-node')!)
  return range ? { el, range } : undefined
}

/** The first line of a node as written, which is what a reading replaced. */
function written(node: ts.Node, sourceFile: ts.SourceFile): string {
  const text = sourceFile.text.slice(node.getStart(sourceFile), node.end)
  const nl = text.indexOf('\n')
  return nl === -1 ? text : `${text.slice(0, nl)} …`
}

/**
 * The reading the pointer is inside, when it is on words the theme wrote:
 * the mark's note, and the node as written. On a source token the quick
 * info wins, see below, so this is what the tinted words explain.
 */
function readingAt(target: EventTarget | null, sourceFile: ts.SourceFile) {
  const mark = (target as Element | null)?.closest?.('[data-reading]')
  const node = mark && nodeById(sourceFile, mark.getAttribute('data-node')!)
  return node ? { note: mark.getAttribute('data-reading')!, written: written(node, sourceFile) } : undefined
}

type Card = { kind: 'info'; info: ts.QuickInfo } | { kind: 'reading'; note: string; written: string }

/**
 * A card below the pointer, shown the moment it arrives: the quick info of
 * the token under it, or, on words a theme wrote, the reading they belong
 * to. Both panes show the same file, so one card serves both and a
 * position means the same thing on either side. The card owns the state,
 * so hovering re-renders the card and nothing else; the panes are large
 * and nothing about them changes.
 */
function Hover({ root, service, fileName }: { root: { current: HTMLElement | null }; service: ts.LanguageService; fileName: string }) {
  const [card, setCard] = useState<{ card: Card; at: { left: number; top: number } } | null>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    const over = (e: MouseEvent) => {
      const h = hovered(e.target)
      const info = h && quickInfoAt(service, fileName, h.range.end)
      const sourceFile = service.getProgram()!.getSourceFile(fileName)!
      const reading = !info && readingAt(e.target, sourceFile)
      if (info) {
        const r = h.el.getBoundingClientRect()
        setCard({ card: { kind: 'info', info }, at: { left: r.left, top: r.bottom } })
      } else if (reading) {
        // A reading mark has no box; anchor to the pointer.
        setCard({ card: { kind: 'reading', ...reading }, at: { left: e.clientX, top: e.clientY + 16 } })
      } else {
        setCard(null)
      }
    }
    const leave = () => setCard(null)
    el.addEventListener('mouseover', over)
    el.addEventListener('mouseleave', leave)
    return () => {
      el.removeEventListener('mouseover', over)
      el.removeEventListener('mouseleave', leave)
    }
  }, [root, service, fileName])
  if (!card) return null
  const left = Math.min(card.at.left, Math.max(0, window.innerWidth - 480))
  return (
    <div class="hover" style={`left: ${left}px; top: ${card.at.top + 4}px`}>
      {card.card.kind === 'info' ? (
        <QuickInfo info={card.card.info} />
      ) : (
        <div class="reading-info">
          <p class="note">{card.card.note}</p>
          <pre class="written">{card.card.written}</pre>
        </div>
      )}
    </div>
  )
}

/** One file, two readings side by side. Each side picks its view. */
export function App({ service, fileName }: { service: ts.LanguageService; fileName: string }) {
  const program = service.getProgram()!
  const [sides, setSides] = useState(readSides)
  const [left, right] = sides
  const set = (next: [View, View]) => {
    writeSides(...next)
    setSides(next)
  }
  const main = useRef<HTMLElement>(null)
  return (
    <>
      <main
        ref={main}
        class="compare"
        onMouseOver={(e) => markPeers(e.currentTarget, e.target)}
        onMouseLeave={(e) => markPeers(e.currentTarget, null)}
      >
        <Pane program={program} fileName={fileName} view={left} onChange={(v) => set([v, right])} />
        <Pane program={program} fileName={fileName} view={right} onChange={(v) => set([left, v])} />
      </main>
      <Hover root={main} service={service} fileName={fileName} />
    </>
  )
}
