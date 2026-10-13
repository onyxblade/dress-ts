import ts from 'typescript'
import { Indent, Join, Line, Lines, Render, claim, type NodeProps } from '../../core'
import { TypeList } from './generics'
import { Modifiers } from './modifiers'

/** Function declarations, function expressions, class methods and constructors share the `def` shape. */
export type DefLike = ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration | ts.ConstructorDeclaration

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
 * A constructor has no name node, its `constructor` is a token, so the
 * word is this component's: `def constructor(...)`. Not `initialize`,
 * since the file's own calls say `new`.
 */
export function RubyFunction({ node, ctx }: NodeProps<DefLike>) {
  return (
    <>
      <span class="header">
        <Modifiers nodes={node.modifiers} ctx={ctx} />
        def {node.asteriskToken && '*'}
        {ts.isConstructorDeclaration(node) ? 'constructor' : node.name && <Render node={node.name} ctx={ctx} />}
        {node.questionToken && '?'}
        <TypeList nodes={node.typeParameters} ctx={ctx} />
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
            <Lines nodes={node.body.statements} within={node.body} ctx={ctx} />
          </Indent>
          <Line>end</Line>
        </>
      )}
    </>
  )
}

const isDefLike = (n: ts.Node): n is DefLike =>
  ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n) || ts.isConstructorDeclaration(n)

export const rubyFunction = claim(
  isDefLike,
  RubyFunction,
  '`function f() { ... }`, `m() { ... }` and `constructor() { ... }` read as `def f() ... end`',
)
