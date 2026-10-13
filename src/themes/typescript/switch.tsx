import ts from 'typescript'
import { Indent, Lines, NodeSpan, claim, type NodeProps } from '../../core'
import { Braces, Child } from './common'

function TypeScriptSwitch({ node, ctx }: NodeProps<ts.SwitchStatement>) {
  return (
    <NodeSpan node={node}>
      switch (<Child node={node.expression} ctx={ctx} />) <Child node={node.caseBlock} ctx={ctx} />
    </NodeSpan>
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
export const typescriptCaseBlock = claim(ts.isCaseBlock, TypeScriptCaseBlock)
export const typescriptCase = claim(ts.isCaseOrDefaultClause, TypeScriptCase)
