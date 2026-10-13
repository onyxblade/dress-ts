import ts from 'typescript'
import { Join, Render, claim, type NodeProps } from '../../core'
import { TypeList } from './generics'

/**
 * Construction as a message to the class: `new Foo(a)` reads as
 * `Foo.new(a)`. The expression, type arguments and arguments are the
 * node's own fields; `.new` and the parens are this component's output.
 *
 * Type arguments stay on the class, `Set[string].new()`, since they
 * describe what is being made rather than the call. `new Foo` with no
 * argument list reads as `Foo.new`, parens and all left out as Ruby would.
 *
 * No span of its own: the Reading mark from `claim` carries the node's
 * identity, and `.new` sits directly in it, so the mark can tint it.
 */
export function RubyNew({ node, ctx }: NodeProps<ts.NewExpression>) {
  return (
    <>
      <Render node={node.expression} ctx={ctx} />
      <TypeList nodes={node.typeArguments} ctx={ctx} />
      .new
      {node.arguments && (
        <>
          (<Join nodes={node.arguments} sep=", " ctx={ctx} />)
        </>
      )}
    </>
  )
}

export const rubyNew = claim(ts.isNewExpression, RubyNew, '`new Foo(a)` reads as `Foo.new(a)`')
