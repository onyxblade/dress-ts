import ts from 'typescript'
import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { NodeProps } from './types'
import { Dispatch } from './render'
import { kindName } from './kind'
import { nodeId } from './identity'

/** Semantic children of a node in source order, as `forEachChild` sees them. */
export function childNodes(node: ts.Node): ts.Node[] {
  const out: ts.Node[] = []
  node.forEachChild((c) => {
    out.push(c)
  })
  return out.sort((a, b) => a.pos - b.pos)
}

/** The kind-tagged span every node component wraps itself in. */
export function NodeSpan({
  node,
  children,
  ...attrs
}: { node: ts.Node; children?: preact.ComponentChildren } & Record<`data-${string}`, string | undefined>) {
  return (
    <span data-kind={kindName(node.kind)} data-node={nodeId(node)} {...attrs}>
      {children}
    </span>
  )
}

/**
 * Where the text of a node starts: after its leading trivia, except for the
 * whole file, whose leading comment belongs to nobody else.
 */
function startOf(node: ts.Node, sourceFile: ts.SourceFile): number {
  return ts.isSourceFile(node) ? 0 : node.getStart(sourceFile)
}

/** Width of the whitespace that opens the line containing `pos`. */
function lineIndentAt(text: string, pos: number): number {
  const lineStart = text.lastIndexOf('\n', pos - 1) + 1
  return /^[ \t]*/.exec(text.slice(lineStart, pos))![0].length
}

/** Drop up to `width` chars of indentation after every newline. */
function dedent(text: string, width: number): string {
  return width === 0 ? text : text.replace(/\n[ \t]*/g, (m) => '\n' + m.slice(1).slice(width))
}

/**
 * The indentation a verbatim region is shown relative to. Set by the
 * outermost Verbatim node of a region; layout primitives reset it so a
 * region nested inside their own layout starts fresh.
 */
export const VerbatimScope = createContext<number | null>(null)

/**
 * Fallback for any node nobody has designed a component for: show its
 * original text. Semantic children are rendered recursively (so a designed
 * component can still take over deep inside); the tokens, whitespace and
 * comments between them are emitted as they were, which is why children
 * are dispatched bare: their comments are already in the gap text.
 *
 * A node's text starts after its leading trivia, so that trivia (including
 * comments) is the responsibility of whoever lays the node out: here, the
 * parent's gap text. The whole file rendered this way equals the source.
 *
 * Multi-line text is shown relative to the indentation of its first line,
 * so a verbatim statement placed under a layout `Indent` lines up.
 *
 * `edits` let a theme's fallback variant change the text between
 * children without re-implementing the splice: drop a closing `;`, show
 * `<T>` as `[T]`. An edit replaces one source range with a string, and
 * must lie within a gap; one reaching into a child is left unapplied,
 * since the child's component owns that text.
 */
export interface Edit {
  from: number
  to: number
  text: string
}

/** The text of `[from, to)` with the edits inside it applied, in position order. */
function edited(text: string, from: number, to: number, edits: readonly Edit[]): string {
  let out = ''
  let cursor = from
  for (const e of [...edits].filter((e) => e.from >= from && e.to <= to).sort((a, b) => a.from - b.from)) {
    out += text.slice(cursor, e.from) + e.text
    cursor = e.to
  }
  return out + text.slice(cursor, to)
}

export function Verbatim({ node, ctx, edits = [] }: NodeProps & { edits?: readonly Edit[] }) {
  const { sourceFile } = ctx
  const text = sourceFile.text
  const inherited = useContext(VerbatimScope)
  const start = startOf(node, sourceFile)
  const width = inherited ?? lineIndentAt(text, start)

  const gap = (from: number, to: number) => dedent(edited(text, from, to, edits), width)
  const parts: preact.ComponentChildren[] = []
  let cursor = start
  for (const child of childNodes(node)) {
    const childStart = startOf(child, sourceFile)
    if (childStart < cursor) continue // defensive: overlapping node
    if (childStart > cursor) parts.push(gap(cursor, childStart))
    parts.push(<Dispatch key={child.pos} node={child} ctx={ctx} />)
    cursor = child.end
  }
  if (cursor < node.end) parts.push(gap(cursor, node.end))

  const span = <NodeSpan node={node}>{parts}</NodeSpan>
  return inherited === null ? <VerbatimScope.Provider value={width}>{span}</VerbatimScope.Provider> : span
}
