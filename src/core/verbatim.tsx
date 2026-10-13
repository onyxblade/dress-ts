import ts from 'typescript'
import { createContext } from 'preact'
import { useContext } from 'preact/hooks'
import type { NodeProps } from './types'
import { Dispatch } from './render'
import { kindName } from './kind'

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
}: { node: ts.Node; children?: preact.ComponentChildren; title?: string } & Record<`data-${string}`, string | undefined>) {
  return (
    <span data-kind={kindName(node.kind)} {...attrs}>
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
 * `end` lets a theme's fallback variant stop short of the node's last
 * characters, e.g. a closing `;`, without re-implementing the splice.
 */
export function Verbatim({ node, ctx, end = node.end }: NodeProps & { end?: number }) {
  const { sourceFile } = ctx
  const text = sourceFile.text
  const inherited = useContext(VerbatimScope)
  const start = startOf(node, sourceFile)
  const width = inherited ?? lineIndentAt(text, start)

  const parts: preact.ComponentChildren[] = []
  let cursor = start
  for (const child of childNodes(node)) {
    const childStart = startOf(child, sourceFile)
    if (childStart < cursor) continue // defensive: overlapping node
    if (childStart > cursor) parts.push(dedent(text.slice(cursor, childStart), width))
    parts.push(<Dispatch key={child.pos} node={child} ctx={ctx} />)
    cursor = child.end
  }
  if (cursor < end) parts.push(dedent(text.slice(cursor, end), width))

  const span = <NodeSpan node={node}>{parts}</NodeSpan>
  return inherited === null ? <VerbatimScope.Provider value={width}>{span}</VerbatimScope.Provider> : span
}
