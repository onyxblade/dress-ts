import ts from 'typescript'
import { Line, Reading, Render, claim, type Ctx, type NodeProps } from '../../core'

/**
 * Ruby reads a method's value off its last line. The kinds of function
 * the theme reads that way: a declaration, a function expression, a
 * method. Not a constructor, whose `new` returns the object whatever the
 * body says; not an arrow function or an accessor, which the theme shows
 * as written, braces and all.
 */
const readsLastLine = (n: ts.Node): n is ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration =>
  ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isMethodDeclaration(n)

const lastOf = (block: ts.Block): ts.Statement | undefined => block.statements[block.statements.length - 1]

/** The body this statement closes, when it is the last statement of one Ruby reads the value off. */
function bodyClosedBy(statement: ts.Statement): ts.Block | undefined {
  const block = statement.parent
  return ts.isBlock(block) && readsLastLine(block.parent) && lastOf(block) === statement ? block : undefined
}

const isLastReturn = (n: ts.Node): n is ts.ReturnStatement & { expression: ts.Expression } =>
  ts.isReturnStatement(n) && n.expression !== undefined && bodyClosedBy(n) !== undefined

/**
 * The last `return x` of a body reads as `x`: Ruby returns the value of
 * the last line, so the keyword is noise there. Only there. A `return`
 * earlier in the body, or inside an `if` block, leaves early and keeps
 * its word; a bare `return` has no value to leave behind and stays too.
 */
export function RubyLastReturn({ node, ctx }: NodeProps<ts.ReturnStatement & { expression: ts.Expression }>) {
  return <Render node={node.expression} ctx={ctx} />
}

export const rubyLastReturn = claim(isLastReturn, RubyLastReturn, '`return x` as the last line reads as `x`, the value of the line')

/** A `return` or a `throw`: the statements that leave the function. */
const exitsFunction = (s: ts.Statement): boolean => ts.isReturnStatement(s) || ts.isThrowStatement(s)

/**
 * Whether a statement leaves, on every path through it, the construct
 * whose exits `exits` names: the function, for a `return` or a `throw`;
 * a `switch` clause, for those and a `break` or `continue` too (see
 * switch.tsx). An exit, a block ending in one, an `if` whose both
 * branches do, a `try` whose `finally` does or whose block and `catch`
 * both do, a `switch` with a `default` whose last clause does and that
 * no `break` of its own leaves early. The syntax alone says this much;
 * the checker's flow analysis is not public.
 */
export function leaves(s: ts.Statement, exits: (s: ts.Statement) => boolean = exitsFunction): boolean {
  if (exits(s)) return true
  if (ts.isBlock(s)) {
    const last = lastOf(s)
    return last !== undefined && leaves(last, exits)
  }
  if (ts.isIfStatement(s)) return s.elseStatement !== undefined && leaves(s.thenStatement, exits) && leaves(s.elseStatement, exits)
  if (ts.isTryStatement(s)) {
    if (s.finallyBlock && leaves(s.finallyBlock, exits)) return true
    return leaves(s.tryBlock, exits) && (s.catchClause === undefined || leaves(s.catchClause.block, exits))
  }
  if (ts.isSwitchStatement(s)) {
    const clauses = s.caseBlock.clauses
    const last = clauses[clauses.length - 1]?.statements.at(-1)
    if (!clauses.some(ts.isDefaultClause) || last === undefined) return false
    return breaksOf(s).length === 0 && leaves(last, exits)
  }
  return false
}

/**
 * The `break` statements that leave this switch: the unlabeled ones in
 * its clauses outside any loop, switch or function nested in them, which
 * a `break` would leave instead.
 */
export function breaksOf(node: ts.SwitchStatement): ts.BreakStatement[] {
  const found: ts.BreakStatement[] = []
  const visit = (n: ts.Node) => {
    if (ts.isBreakStatement(n)) {
      if (!n.label) found.push(n)
      return
    }
    if (ts.isIterationStatement(n, false) || ts.isSwitchStatement(n) || ts.isFunctionLike(n) || ts.isClassLike(n)) return
    n.forEachChild(visit)
  }
  node.caseBlock.clauses.forEach((c) => c.statements.forEach(visit))
  return found
}

const NOTE = 'a last line that is not a `return` gets `undefined` after it: the function returns that, where Ruby would return the line'

/**
 * The line a body needs after its last statement when that statement is
 * not a `return`: Ruby would read the statement's value as the
 * function's, and the function returns `undefined` instead, so the theme
 * puts `undefined` on a last line of its own, the value where Ruby reads
 * it, with no `return`, the same as the last `return x` loses its. The
 * mark is the last statement's, since that is the line the reader would
 * have misread.
 *
 * An empty body gets no line: Ruby's `nil` and this `undefined` say the
 * same nothing. A body whose last statement leaves on every path (see
 * `leaves`) gets none either, since the end is never reached.
 */
export function UndefinedReturn({ fn, ctx }: { fn: ts.SignatureDeclaration; ctx: Ctx }) {
  const body = readsLastLine(fn) ? fn.body : undefined
  const last = body && lastOf(body)
  if (!last || leaves(last)) return null
  return (
    <Line>
      <Reading node={last} note={NOTE}>
        undefined
      </Reading>
    </Line>
  )
}
