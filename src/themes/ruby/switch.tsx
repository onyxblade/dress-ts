import ts from 'typescript'
import { CommentText, Indent, Join, Line, Lines, Reading, Render, claim, withTransforms, type Ctx, type NodeProps } from '../../core'
import { breaksOf, leaves } from './return'

type Clause = ts.CaseOrDefaultClause

/**
 * A run of clauses sharing one body: the empty labels and the clause with
 * the statements after them, `case 'a': case 'b': body`, which Ruby
 * writes as `when 'a', 'b'`. Ruby's empty `when` does nothing rather than
 * run on into the next, so the labels have to be joined.
 */
interface Group {
  clauses: Clause[]
  /** The body's statements, the sole block's when the body is one block; a closing `break` left out. */
  statements: ts.Statement[]
  /** The node the statements are the body of, for the comments dangling in it. */
  within: ts.Node
  /** The `break` closing the body, which Ruby's `when` does without, not written. */
  closing?: ts.BreakStatement
  /** Whether control runs on into the next clause: a body that does not end in a jump. */
  fallsThrough: boolean
}

/** The statements that leave a clause: a jump out of the function, or out of the switch. */
const exitsClause = (s: ts.Statement): boolean =>
  ts.isReturnStatement(s) || ts.isThrowStatement(s) || ts.isBreakStatement(s) || ts.isContinueStatement(s)

function groupsOf(node: ts.SwitchStatement): Group[] {
  const clauses = node.caseBlock.clauses
  const groups: Group[] = []
  let run: Clause[] = []
  clauses.forEach((clause, i) => {
    run.push(clause)
    const isLast = i === clauses.length - 1
    if (clause.statements.length === 0 && !isLast) return
    const sole = clause.statements.length === 1 ? clause.statements[0] : undefined
    const block = sole && ts.isBlock(sole) ? sole : undefined
    let statements = [...(block ? block.statements : clause.statements)]
    const last = statements[statements.length - 1]
    const closing = last && ts.isBreakStatement(last) && !last.label ? last : undefined
    if (closing) statements = statements.slice(0, -1)
    groups.push({
      clauses: run,
      statements,
      within: block ?? clause,
      closing,
      fallsThrough: last !== undefined && !isLast && !leaves(last, exitsClause),
    })
    run = []
  })
  return groups
}

const FALLS_THROUGH = 'the body runs on into the next clause, as a Ruby `when` never does'

/**
 * One `when` of the case: the labels joined after `when`, or `else` for
 * a run with a `default` in it, since `default` takes whatever the labels
 * beside it would; the body in an Indent. A body that runs on into the
 * next clause gets a `fallthrough` line of the theme's own at its end,
 * tinted and marked like the `undefined` of a body (see return.tsx),
 * since Ruby's `when` never does and the reader would take the `else`
 * for unreached. The comments trailing the labels, `case 'a': // c`, go
 * on the `when` line, where `Lines` leaves a group's trailing comments
 * to the component; a closing `break`'s comments, and the body's
 * dangling ones after it, are given lines at the end so they are not
 * lost with it.
 */
function RubyWhen({ group, ctx }: { group: Group; ctx: Ctx }) {
  const labels = group.clauses.filter(ts.isCaseClause).map((c) => c.expression)
  const last = group.clauses[group.clauses.length - 1]
  const dropped = group.closing && ctx.comments.of(group.closing)
  const afterwards = dropped ? [...dropped.leading, ...dropped.trailing, ...ctx.comments.of(group.within).dangling] : []
  return (
    <>
      {group.clauses.some(ts.isDefaultClause) ? (
        'else'
      ) : (
        <>
          when <Join nodes={labels} sep=", " ctx={ctx} />
        </>
      )}
      {group.clauses.flatMap((c) => ctx.comments.of(c).trailing).map((c) => (
        <>
          {' '}
          <CommentText key={c.pos} comment={c} ctx={ctx} />
        </>
      ))}
      <Indent>
        <Lines nodes={group.statements} within={dropped ? undefined : group.within} ctx={ctx} />
        {afterwards.map((c) => (
          <Line key={c.pos}>
            <CommentText comment={c} ctx={ctx} />
          </Line>
        ))}
        {group.fallsThrough && (
          <Line>
            <Reading node={last} note={FALLS_THROUGH}>
              fallthrough
            </Reading>
          </Line>
        )}
      </Indent>
    </>
  )
}

/**
 * A `break` that leaves the switch from inside a body, `if (x) break`.
 * Ruby's `break` in a `case` would leave the loop around it instead, so
 * the word stays, as the file has it, but marked as one the reading
 * cannot take at face value.
 */
function RubyCaseBreak(_: NodeProps<ts.BreakStatement>) {
  return <span class="caution">break</span>
}

const WHEN_NOTE = '`case a: case b: ... break` reads as `when a, b ...`, the closing `break` not written; `default:` as `else`'
const BREAK_NOTE = 'this `break` leaves the `switch`; in a Ruby `case` it would leave the loop around it'

/**
 * A switch laid out from its clauses: `case x`, a `when` per run of
 * labels at the same depth as the `case`, as Ruby writes them, `end`.
 * The runs are the component's grouping, so each is handed to `Lines`
 * as one entry, and a claim scoped to this switch renders the run from
 * its first clause; the `break` statements that leave the switch from
 * inside a body get a scoped claim too.
 */
export function RubySwitch({ node, ctx }: NodeProps<ts.SwitchStatement>) {
  const groups = groupsOf(node)
  const byHead = new Map<ts.Node, Group>(groups.map((g) => [g.clauses[0], g]))
  const closing = new Set<ts.Node>(groups.map((g) => g.closing).filter((b) => b !== undefined))
  const early = new Set<ts.Node>(breaksOf(node).filter((b) => !closing.has(b)))
  const scoped = withTransforms(ctx, [
    claim(
      (n): n is Clause => byHead.has(n),
      ({ node, ctx }) => <RubyWhen group={byHead.get(node)!} ctx={ctx} />,
      WHEN_NOTE,
    ),
    claim((n): n is ts.BreakStatement => early.has(n), RubyCaseBreak, BREAK_NOTE),
  ])
  return (
    <>
      <span class="header">
        case <Render node={node.expression} ctx={ctx} />
      </span>
      <Lines nodes={groups.map((g) => g.clauses)} within={node.caseBlock} ctx={scoped} />
      <Line>end</Line>
    </>
  )
}

export const rubySwitch = claim(ts.isSwitchStatement, RubySwitch, '`switch (x) { ... }` reads as `case x ... end`')
