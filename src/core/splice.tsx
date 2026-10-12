import ts from 'typescript'
import type { Ctx, NodeComponent, NodeProps } from './types'
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
 * A parent's say over its *direct* children: return a component to render
 * this child with, or undefined to fall through to the normal `resolve`.
 * Grandchildren are unaffected. Compare `withTransforms`, which applies to
 * the whole subtree.
 */
export type PickChild = (child: ts.Node, ctx: Ctx) => NodeComponent | undefined

/**
 * The splicing itself, as a reusable building block for components.
 *
 * Returns the node's source range [pos, end) with every child's range
 * replaced by a render of that child, and whatever lies between children
 * emitted verbatim. Components that want to own a node's layout but not
 * re-implement child dispatch call this, optionally with a `pick` to
 * override the component for specific direct children.
 */
export function spliceChildren(node: ts.Node, ctx: Ctx, pick?: PickChild): preact.ComponentChildren[] {
  const text = ctx.sourceFile.text
  const parts: preact.ComponentChildren[] = []
  let cursor = node.pos
  for (const child of childNodes(node, ctx.sourceFile)) {
    if (child.pos < cursor) continue // defensive: overlapping node
    if (child.pos > cursor) parts.push(text.slice(cursor, child.pos))
    const Picked = pick?.(child, ctx)
    parts.push(
      Picked ? <Picked key={child.pos} node={child} ctx={ctx} /> : <Render key={child.pos} node={child} ctx={ctx} />,
    )
    cursor = child.end
  }
  if (cursor < node.end) parts.push(text.slice(cursor, node.end))
  return parts
}

/** The kind-tagged span every node component wraps itself in. */
export function NodeSpan({
  node,
  children,
  ...attrs
}: { node: ts.Node; children?: preact.ComponentChildren } & Record<`data-${string}`, string | undefined>) {
  return (
    <span data-kind={kindName(node.kind)} {...attrs}>
      {children}
    </span>
  )
}

/**
 * Default component for any node: faithful text splicing wrapped in a
 * kind-tagged span. With no other components registered, the output text
 * equals the input text exactly.
 */
export function Splice({ node, ctx }: NodeProps) {
  return <NodeSpan node={node}>{spliceChildren(node, ctx)}</NodeSpan>
}
