import ts from 'typescript'
import { NodeSpan, OmitToken, leadingTrivia, spliceChildren, type NodeProps, type PickChild } from '../../core'

/** `}` reads as `end`. If nothing separates it from what came before, add a space. */
function End({ node, ctx }: NodeProps) {
  const trivia = leadingTrivia(node, ctx.sourceFile)
  return (
    <NodeSpan node={node} data-replaced="}">
      {trivia === '' ? ' ' : trivia}
      end
    </NodeSpan>
  )
}

/**
 * For a node whose direct children include a `{ ... }` pair: drop the `{`
 * and show the `}` as `end`. Only the direct children are affected, so
 * nested blocks and object literals inside keep their braces.
 */
export const bracesAsEnd: PickChild = (child) => {
  if (child.kind === ts.SyntaxKind.OpenBraceToken) return OmitToken
  if (child.kind === ts.SyntaxKind.CloseBraceToken) return End
  return undefined
}

/** A `Block` used as a body: its braces become `... end`. */
export function RubyBody({ node, ctx }: NodeProps) {
  return <NodeSpan node={node}>{spliceChildren(node, ctx, bracesAsEnd)}</NodeSpan>
}
