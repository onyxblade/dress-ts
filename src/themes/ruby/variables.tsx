import ts from 'typescript'
import { Join, claim, type NodeProps } from '../../core'

/**
 * Ruby declares a variable by assigning to it, so the keyword is noise:
 * `const x = 1` reads as `x = 1`, and `for (const x of xs)` as
 * `for (x of xs)`. The keyword sits in the declaration list's own range,
 * so claiming the list covers both places, and the statement around it
 * stays with the fallback, which keeps its `export` and drops its `;`.
 *
 * Whether it was `const`, `let` or `var` is not lost: the Reading mark
 * carries the node as written, and the page shows it on hover.
 */
export function RubyVariables({ node, ctx }: NodeProps<ts.VariableDeclarationList>) {
  return <Join nodes={node.declarations} sep=", " ctx={ctx} />
}

export const rubyVariables = claim(ts.isVariableDeclarationList, RubyVariables, '`const x = 1` and `let x = 1` read as `x = 1`')
