import ts from 'typescript'
import { Join, NodeSpan, Render, claim, type NodeProps } from '../../core'

/**
 * Construction as a message to the class: `new Foo(a)` reads as
 * `Foo.new(a)`. The expression, type arguments and arguments are the
 * node's own fields; `.new` and the parens are this component's output.
 *
 * Type arguments stay on the class, `Set<string>.new()`, since they
 * describe what is being made rather than the call. `new Foo` with no
 * argument list reads as `Foo.new`, parens and all left out as Ruby would.
 *
 * An expression component, so it wraps itself in a NodeSpan: unlike a
 * statement or member there is no Line to carry the node's identity.
 */
export function RubyNew({ node, ctx }: NodeProps<ts.NewExpression>) {
  return (
    <NodeSpan node={node}>
      <Render node={node.expression} ctx={ctx} />
      {node.typeArguments && (
        <>
          {'<'}
          <Join nodes={node.typeArguments} sep=", " ctx={ctx} />
          {'>'}
        </>
      )}
      .new
      {node.arguments && (
        <>
          (<Join nodes={node.arguments} sep=", " ctx={ctx} />)
        </>
      )}
    </NodeSpan>
  )
}

/** `new Foo(a)` reads as `Foo.new(a)`. */
export const rubyNew = claim(ts.isNewExpression, RubyNew)
