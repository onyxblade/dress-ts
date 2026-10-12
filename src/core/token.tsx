import type { NodeComponent, NodeProps } from './types'
import { NodeSpan, leadingTrivia } from './splice'

/**
 * Component factory: render a token with different text, keeping its
 * leading trivia so layout and comments survive.
 */
export function replaceToken(replacement: string): NodeComponent {
  return function ReplacedToken({ node, ctx }) {
    return (
      <NodeSpan node={node} data-replaced={node.getText(ctx.sourceFile)}>
        {leadingTrivia(node, ctx.sourceFile)}
        {replacement}
      </NodeSpan>
    )
  }
}

/**
 * Render nothing for a token. Its leading trivia is kept only if it holds
 * something other than whitespace (a comment), and then without the
 * whitespace that led up to the token, so dropping `{` neither leaves a
 * dangling space nor eats a comment.
 */
export function OmitToken({ node, ctx }: NodeProps) {
  const trivia = leadingTrivia(node, ctx.sourceFile)
  return (
    <NodeSpan node={node} data-omitted={node.getText(ctx.sourceFile)}>
      {trivia.trim() === '' ? '' : trivia.trimEnd()}
    </NodeSpan>
  )
}
