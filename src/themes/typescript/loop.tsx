import ts from 'typescript'
import { NodeSpan, claim, type NodeProps } from '../../core'
import { Child, spaceAfter } from './common'

function TypeScriptWhile({ node, ctx }: NodeProps<ts.WhileStatement>) {
  return (
    <NodeSpan node={node}>
      while (<Child node={node.expression} ctx={ctx} />) <Child node={node.statement} ctx={ctx} />
    </NodeSpan>
  )
}

function TypeScriptDoWhile({ node, ctx }: NodeProps<ts.DoStatement>) {
  return (
    <NodeSpan node={node}>
      do <Child node={node.statement} ctx={ctx} />{spaceAfter(node.statement, ctx)}while (<Child node={node.expression} ctx={ctx} />);
    </NodeSpan>
  )
}

function TypeScriptFor({ node, ctx }: NodeProps<ts.ForStatement>) {
  return (
    <NodeSpan node={node}>
      for ({[node.initializer, node.condition, node.incrementor].map((part, i) => (
        <>
          {i > 0 && ';'}
          {part && <>{i > 0 && ' '}<Child node={part} ctx={ctx} /></>}
        </>
      ))}) <Child node={node.statement} ctx={ctx} />
    </NodeSpan>
  )
}

function TypeScriptForEach({ node, ctx }: NodeProps<ts.ForOfStatement | ts.ForInStatement>) {
  return (
    <NodeSpan node={node}>
      for {ts.isForOfStatement(node) && node.awaitModifier && <><Child node={node.awaitModifier} ctx={ctx} />{' '}</>}
      (<Child node={node.initializer} ctx={ctx} /> {ts.isForOfStatement(node) ? 'of' : 'in'}{' '}
      <Child node={node.expression} ctx={ctx} />) <Child node={node.statement} ctx={ctx} />
    </NodeSpan>
  )
}

const isForEach = (node: ts.Node): node is ts.ForOfStatement | ts.ForInStatement => ts.isForOfStatement(node) || ts.isForInStatement(node)

export const typescriptWhile = claim(ts.isWhileStatement, TypeScriptWhile)
export const typescriptDoWhile = claim(ts.isDoStatement, TypeScriptDoWhile)
export const typescriptFor = claim(ts.isForStatement, TypeScriptFor)
export const typescriptForEach = claim(isForEach, TypeScriptForEach)
