import ts from 'typescript'
import { CommentText, Indent, Lines, NodeSpan, Reading, Render, claim, withTransforms, type Comment, type Ctx, type NodeProps } from '../../core'
import { Braces, Child } from './common'
import { analyzeSwitch, type SwitchGroup } from './switchAnalysis'

function SwitchLayout({ node, ctx }: NodeProps<ts.SwitchStatement>) {
  return (
    <NodeSpan node={node}>
      switch (<Child node={node.expression} ctx={ctx} />) <Child node={node.caseBlock} ctx={ctx} />
    </NodeSpan>
  )
}

const SWITCH_READING = 'Independent switch arms: adjacent empty labels share a body, and a final break is implicit. return, throw, and continue keep their TypeScript meaning; exhaustiveness is not implied.'

function Comments({ comments, ctx }: { comments: readonly Comment[]; ctx: Ctx }) {
  return <>{comments.map((comment) => <>{' '}<CommentText key={comment.pos} comment={comment} ctx={ctx} />{!comment.block && '\n'}</>)}</>
}

function hasComments(node: ts.Node, ctx: Ctx): boolean {
  const { leading, trailing, dangling } = ctx.comments.of(node)
  return leading.length + trailing.length + dangling.length > 0
    || !!ts.forEachChild(node, (child) => hasComments(child, ctx) || undefined)
}

function SwitchArm({ group, ctx }: { group: SwitchGroup; ctx: Ctx }) {
  const last = group.clauses[group.clauses.length - 1]
  const within = group.block ?? last
  const dropped = group.closing ? ctx.comments.of(group.closing) : undefined
  const bodyCtx: Ctx = dropped ? {
    ...ctx,
    comments: {
      ...ctx.comments,
      of: (node) => node === within ? {
        ...ctx.comments.of(node),
        dangling: [...dropped.leading, ...dropped.trailing, ...dropped.dangling, ...ctx.comments.of(node).dangling].sort((a, b) => a.pos - b.pos),
      } : ctx.comments.of(node),
    },
  } : ctx
  const single = group.statements.length === 1 ? group.statements[0] : undefined
  const inline = single && (ts.isReturnStatement(single) || ts.isThrowStatement(single)
    || ts.isContinueStatement(single) || ts.isExpressionStatement(single))
    && !group.clauses.some((clause) => hasComments(clause, ctx))
  const Body = () => inline
    ? <Render node={single} ctx={bodyCtx} />
    : <Braces node={within} nodes={group.statements} ctx={bodyCtx} />
  return (
    <Reading node={group.clauses[0]} note={SWITCH_READING}>
      {group.clauses.map((clause, index) => (
        <NodeSpan key={clause.pos} node={clause}>
          <Reading node={clause} note={SWITCH_READING}>
            {index > 0 && <>{' |'}<Comments comments={ctx.comments.of(clause).leading} ctx={ctx} />{' '}</>}
            {ts.isCaseClause(clause) ? <Child node={clause.expression} ctx={ctx} /> : 'default'}
            {clause !== last && <Comments comments={[...ctx.comments.of(clause).dangling, ...ctx.comments.of(clause).trailing]} ctx={ctx} />}
          </Reading>
        </NodeSpan>
      ))}
      {' => '}
      {group.block ? (
        <NodeSpan node={group.block}>
          <Child node={group.block} ctx={withTransforms(bodyCtx, [(next) => (node, ctx) => node === group.block ? Body : next(node, ctx)])} />
        </NodeSpan>
      ) : <Body />}
      {group.block && <Comments comments={ctx.comments.of(last).dangling} ctx={ctx} />}
      <Comments comments={ctx.comments.of(last).trailing} ctx={ctx} />
    </Reading>
  )
}

function SwitchArms({ groups, node, ctx }: NodeProps<ts.CaseBlock> & { groups: SwitchGroup[] }) {
  const byFirst = new Map(groups.map((group) => [group.clauses[0], group]))
  const clauses = new Set(groups.flatMap((group) => group.clauses))
  // Lines owns the first label's leading comments. Later labels keep theirs
  // beside the label, so comments stay in source order after grouping.
  const linesCtx: Ctx = {
    ...ctx,
    comments: {
      ...ctx.comments,
      of: (node) => clauses.has(node as ts.CaseOrDefaultClause) ? {
        ...ctx.comments.of(node),
        leading: byFirst.has(node as ts.CaseOrDefaultClause) ? ctx.comments.of(node).leading : [],
        trailing: [],
      } : ctx.comments.of(node),
    },
  }
  const scoped = withTransforms(linesCtx, [(next) => (node, childCtx) => {
    const group = byFirst.get(node as ts.CaseOrDefaultClause)
    return group ? () => <SwitchArm group={group} ctx={ctx} /> : next(node, childCtx)
  }])
  return <NodeSpan node={node}>{'{'}<Indent><Lines nodes={groups.map((group) => group.clauses)} within={node} ctx={scoped} /></Indent>{'}'}</NodeSpan>
}

function TypeScriptSwitch({ node, ctx }: NodeProps<ts.SwitchStatement>) {
  const analysis = analyzeSwitch(node)
  if (!analysis.supported || analysis.groups.length === 0) return <SwitchLayout node={node} ctx={ctx} />
  const scoped = withTransforms(ctx, [(next) => (child, childCtx) => child === node.caseBlock
    ? () => <SwitchArms node={node.caseBlock} groups={analysis.groups} ctx={ctx} />
    : next(child, childCtx)])
  return (
    <Reading node={node} note={SWITCH_READING}>
      switch (<Child node={node.expression} ctx={ctx} />) <Child node={node.caseBlock} ctx={scoped} />
    </Reading>
  )
}

function TypeScriptCaseBlock({ node, ctx }: NodeProps<ts.CaseBlock>) {
  return <NodeSpan node={node}><Braces node={node} nodes={node.clauses} ctx={ctx} /></NodeSpan>
}

function TypeScriptCase({ node, ctx }: NodeProps<ts.CaseOrDefaultClause>) {
  return (
    <NodeSpan node={node}>
      {ts.isCaseClause(node) ? <>case <Child node={node.expression} ctx={ctx} /></> : 'default'}:
      <Indent><Lines nodes={node.statements} within={node} ctx={ctx} /></Indent>
    </NodeSpan>
  )
}

export const typescriptSwitch = claim(ts.isSwitchStatement, TypeScriptSwitch)
/** The syntax-preserving layout, also used to verify the theme's other formatting. */
export const typescriptSwitchLayout = claim(ts.isSwitchStatement, SwitchLayout)
export const typescriptCaseBlock = claim(ts.isCaseBlock, TypeScriptCaseBlock)
export const typescriptCase = claim(ts.isCaseOrDefaultClause, TypeScriptCase)
