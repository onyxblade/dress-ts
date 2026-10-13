import ts from 'typescript'
import { NodeSpan, claim, type NodeProps } from '../../core'
import { Braces } from './common'

function TypeScriptBlock({ node, ctx }: NodeProps<ts.Block>) {
  return <NodeSpan node={node}><Braces node={node} nodes={node.statements} ctx={ctx} /></NodeSpan>
}

export const typescriptBlock = claim(ts.isBlock, TypeScriptBlock)
