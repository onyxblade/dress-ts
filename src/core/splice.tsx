import type ts from 'typescript'
import { kindName } from './kind'
import type { NodeProps } from './types'
import { Render } from './render'

/**
 * Direct children of a node in source order.
 * `forEachChild` yields syntax nodes only (no punctuation tokens, no comments);
 * the gaps between them are handled as raw text by `Splice`.
 */
export function childNodes(node: ts.Node): ts.Node[] {
  const out: ts.Node[] = []
  node.forEachChild((c) => {
    out.push(c)
  })
  return out.sort((a, b) => a.pos - b.pos)
}

/**
 * Default component for any node: faithful text splicing.
 *
 * Emits the node's own source range [pos, end), but with every child's range
 * replaced by a recursive <Render> of that child. Whatever lies between
 * children (tokens, whitespace, comments) is emitted verbatim. With no other
 * components registered, the output text equals the input text exactly.
 */
export function Splice({ node, ctx }: NodeProps) {
  const text = ctx.sourceFile.text
  const parts: preact.ComponentChildren[] = []
  let cursor = node.pos
  for (const child of childNodes(node)) {
    if (child.pos < cursor) continue // defensive: overlapping/synthetic node
    if (child.pos > cursor) parts.push(text.slice(cursor, child.pos))
    parts.push(<Render key={child.pos} node={child} ctx={ctx} />)
    cursor = child.end
  }
  if (cursor < node.end) parts.push(text.slice(cursor, node.end))
  return <span data-kind={kindName(node.kind)}>{parts}</span>
}
