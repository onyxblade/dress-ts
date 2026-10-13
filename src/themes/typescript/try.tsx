import ts from 'typescript'
import { NodeSpan, claim, type NodeProps } from '../../core'
import { Child, spaceAfter } from './common'

function TypeScriptTry({ node, ctx }: NodeProps<ts.TryStatement>) {
  return (
    <NodeSpan node={node}>
      try <Child node={node.tryBlock} ctx={ctx} />
      {node.catchClause && <>{spaceAfter(node.tryBlock, ctx)}<Child node={node.catchClause} ctx={ctx} /></>}
      {node.finallyBlock && <>{spaceAfter(node.catchClause ?? node.tryBlock, ctx)}finally <Child node={node.finallyBlock} ctx={ctx} /></>}
    </NodeSpan>
  )
}

function TypeScriptCatch({ node, ctx }: NodeProps<ts.CatchClause>) {
  return (
    <NodeSpan node={node}>
      catch{node.variableDeclaration && <> (<Child node={node.variableDeclaration} ctx={ctx} />)</>}
      {' '}<Child node={node.block} ctx={ctx} />
    </NodeSpan>
  )
}

export const typescriptTry = claim(ts.isTryStatement, TypeScriptTry)
export const typescriptCatch = claim(ts.isCatchClause, TypeScriptCatch)
