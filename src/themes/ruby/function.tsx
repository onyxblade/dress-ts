import ts from 'typescript'
import { Indent, Join, Line, Lines, Render, claim, type NodeProps } from '../../core'

/** Function declarations, function expressions and class methods share the `def` shape. */
export type DefLike = ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration

/**
 * A function laid out from its semantic fields: the keyword is `def`, the
 * body sits in an Indent and closes with `end`. Nothing here looks at
 * tokens; `def`, the parens and `end` are this component's own output.
 *
 * The header is inline, not a Line: as a statement or class member it
 * already sits in a Line from the parent's `Lines`, and as an expression it
 * continues the line it appears on.
 *
 * A method is the same shape with a `?` for optional members; TypeScript
 * keeps `name` and `questionToken` on the node, so one component covers both.
 */
export function RubyFunction({ node, ctx }: NodeProps<DefLike>) {
  return (
    <>
      <span class="header">
        {node.modifiers?.map((m) => (
          <>
            <Render key={m.pos} node={m} ctx={ctx} />{' '}
          </>
        ))}
        def {node.asteriskToken && '*'}
        {node.name && <Render node={node.name} ctx={ctx} />}
        {node.questionToken && '?'}
        {node.typeParameters && (
          <>
            {'<'}
            <Join nodes={node.typeParameters} sep=", " ctx={ctx} />
            {'>'}
          </>
        )}
        (<Join nodes={node.parameters} sep=", " ctx={ctx} />)
        {node.type && (
          <>
            : <Render node={node.type} ctx={ctx} />
          </>
        )}
      </span>
      {node.body && (
        <>
          <Indent>
            <Lines nodes={node.body.statements} ctx={ctx} />
          </Indent>
          <Line>end</Line>
        </>
      )}
    </>
  )
}

const isDefLike = (n: ts.Node): n is DefLike =>
  ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n)

/** `function f() { ... }` and `m() { ... }` read as `def f() ... end`. */
export const rubyFunction = claim(isDefLike, RubyFunction)
