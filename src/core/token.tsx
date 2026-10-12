import type { NodeComponent } from './types'
import { kindName } from './kind'
import { leadingTrivia } from './splice'

/**
 * Component factory: render a token with different text, keeping its
 * leading trivia so layout and comments survive.
 */
export function replaceToken(replacement: string): NodeComponent {
  return function ReplacedToken({ node, ctx }) {
    return (
      <span data-kind={kindName(node.kind)} data-replaced={node.getText(ctx.sourceFile)}>
        {leadingTrivia(node, ctx.sourceFile)}
        {replacement}
      </span>
    )
  }
}
