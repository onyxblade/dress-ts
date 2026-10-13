import ts from 'typescript'
import { NodeSpan, claim, type NodeProps } from '../../core'
import { Child, spaceAfter } from './common'

function TypeScriptIf({ node, ctx }: NodeProps<ts.IfStatement>) {
  return (
    <NodeSpan node={node}>
      if (<Child node={node.expression} ctx={ctx} />) <Child node={node.thenStatement} ctx={ctx} />
      {node.elseStatement && <>{spaceAfter(node.thenStatement, ctx)}else <Child node={node.elseStatement} ctx={ctx} /></>}
    </NodeSpan>
  )
}

export const typescriptIf = claim(ts.isIfStatement, TypeScriptIf)
