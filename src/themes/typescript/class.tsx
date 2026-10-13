import ts from 'typescript'
import { NodeSpan, claim, type NodeProps } from '../../core'
import { Braces, Child, Modifiers, TypeParameters } from './common'

type ClassLike = ts.ClassLikeDeclaration | ts.InterfaceDeclaration

function TypeScriptClass({ node, ctx }: NodeProps<ClassLike>) {
  return (
    <NodeSpan node={node}>
      <Modifiers nodes={node.modifiers} ctx={ctx} />
      {ts.isInterfaceDeclaration(node) ? 'interface' : 'class'}
      {node.name && <> <Child node={node.name} ctx={ctx} /></>}
      <TypeParameters nodes={node.typeParameters} ctx={ctx} />
      {node.heritageClauses?.map((clause) => <> <Child key={clause.pos} node={clause} ctx={ctx} /></>)}
      {' '}<Braces node={node} nodes={node.members} ctx={ctx} />
    </NodeSpan>
  )
}

const isClassLike = (node: ts.Node): node is ClassLike => ts.isClassLike(node) || ts.isInterfaceDeclaration(node)

export const typescriptClass = claim(isClassLike, TypeScriptClass)
