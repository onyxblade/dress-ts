import ts from 'typescript'
import type { Ctx, NodeProps } from './types'
import { Render } from './render'
import { kindName } from './kind'

/**
 * Direct children of a node in source order, tokens included.
 *
 * We use the services-layer `getChildren()` rather than `forEachChild`
 * because the latter yields syntax nodes only: `function`, `=>`, `;` and
 * friends are not visible to it, so no transform could ever claim them.
 * `getChildren()` lazily scans the node's range and materialises tokens
 * (and SyntaxList wrappers around node arrays) as real `ts.Node`s.
 *
 * JSDoc nodes are dropped: their range overlaps the leading trivia of the
 * next token, and that trivia is emitted verbatim anyway.
 */
export function childNodes(node: ts.Node, sourceFile: ts.SourceFile): ts.Node[] {
  return node.getChildren(sourceFile).filter((c) => !ts.isJSDoc(c))
}

/** Leading trivia (whitespace, comments) that precedes the node's own text. */
export function leadingTrivia(node: ts.Node, sourceFile: ts.SourceFile): string {
  return sourceFile.text.slice(node.pos, node.getStart(sourceFile))
}

/**
 * The splicing itself, as a reusable building block for components.
 *
 * Returns the node's source range [pos, end) with every child's range
 * replaced by a recursive <Render> of that child, and whatever lies between
 * children emitted verbatim. Components that want to own a node's layout
 * but not re-implement child dispatch call this, usually with a ctx from
 * `withTransforms`.
 */
export function spliceChildren(node: ts.Node, ctx: Ctx): preact.ComponentChildren[] {
  const text = ctx.sourceFile.text
  const parts: preact.ComponentChildren[] = []
  let cursor = node.pos
  for (const child of childNodes(node, ctx.sourceFile)) {
    if (child.pos < cursor) continue // defensive: overlapping node
    if (child.pos > cursor) parts.push(text.slice(cursor, child.pos))
    parts.push(<Render key={child.pos} node={child} ctx={ctx} />)
    cursor = child.end
  }
  if (cursor < node.end) parts.push(text.slice(cursor, node.end))
  return parts
}

/**
 * Default component for any node: faithful text splicing wrapped in a
 * kind-tagged span. With no other components registered, the output text
 * equals the input text exactly.
 */
export function Splice({ node, ctx }: NodeProps) {
  return <span data-kind={kindName(node.kind)}>{spliceChildren(node, ctx)}</span>
}
