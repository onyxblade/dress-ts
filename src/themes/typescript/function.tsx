import ts from 'typescript'
import { NodeSpan, claim, type NodeProps } from '../../core'
import { Child, List, Modifiers, TypeParameters } from './common'
import { TypeScriptVerbatim } from './bindings'

type FunctionLike = ts.FunctionDeclaration | ts.FunctionExpression | ts.MethodDeclaration |
  ts.ConstructorDeclaration | ts.GetAccessorDeclaration | ts.SetAccessorDeclaration

function TypeScriptFunction({ node, ctx }: NodeProps<FunctionLike>) {
  // Signatures keep their original terminator and trivia.
  if (!node.body) return <TypeScriptVerbatim node={node} ctx={ctx} />
  const fn = ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
  return (
    <NodeSpan node={node}>
      <Modifiers nodes={node.modifiers} ctx={ctx} />
      {fn && 'function'}
      {'asteriskToken' in node && node.asteriskToken && <Child node={node.asteriskToken} ctx={ctx} />}
      {fn && ' '}
      {ts.isGetAccessorDeclaration(node) && 'get '}
      {ts.isSetAccessorDeclaration(node) && 'set '}
      {ts.isConstructorDeclaration(node) ? 'constructor' : node.name && <Child node={node.name} ctx={ctx} />}
      {'questionToken' in node && node.questionToken && <Child node={node.questionToken} ctx={ctx} />}
      <TypeParameters nodes={node.typeParameters} ctx={ctx} />
      (<List nodes={node.parameters} ctx={ctx} />)
      {node.type && <>: <Child node={node.type} ctx={ctx} /></>}
      {' '}<Child node={node.body} ctx={ctx} />
    </NodeSpan>
  )
}

function TypeScriptArrow({ node, ctx }: NodeProps<ts.ArrowFunction>) {
  return (
    <NodeSpan node={node}>
      <Modifiers nodes={node.modifiers} ctx={ctx} />
      <TypeParameters nodes={node.typeParameters} ctx={ctx} />
      (<List nodes={node.parameters} ctx={ctx} />)
      {node.type && <>: <Child node={node.type} ctx={ctx} /></>}
      {' '}<Child node={node.equalsGreaterThanToken} ctx={ctx} />{' '}
      <Child node={node.body} ctx={ctx} />
    </NodeSpan>
  )
}

const isFunctionLike = (node: ts.Node): node is FunctionLike =>
  ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node) ||
  ts.isConstructorDeclaration(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)

export const typescriptFunction = claim(isFunctionLike, TypeScriptFunction)
export const typescriptArrow = claim(ts.isArrowFunction, TypeScriptArrow)
