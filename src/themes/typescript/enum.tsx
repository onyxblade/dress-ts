import ts from 'typescript'
import { NodeSpan, claim, type NodeProps } from '../../core'
import { Braces, Child, Modifiers } from './common'

function TypeScriptEnum({ node, ctx }: NodeProps<ts.EnumDeclaration>) {
  return (
    <NodeSpan node={node}>
      <Modifiers nodes={node.modifiers} ctx={ctx} />
      enum <Child node={node.name} ctx={ctx} />{' '}
      <Braces node={node} nodes={node.members} ctx={ctx} />
    </NodeSpan>
  )
}

function TypeScriptEnumMember({ node, ctx }: NodeProps<ts.EnumMember>) {
  const { members } = node.parent
  return (
    <NodeSpan node={node}>
      <Child node={node.name} ctx={ctx} />
      {node.initializer && <> = <Child node={node.initializer} ctx={ctx} /></>}
      {(members[members.length - 1] !== node || members.hasTrailingComma) && ','}
    </NodeSpan>
  )
}

export const typescriptEnum = claim(ts.isEnumDeclaration, TypeScriptEnum)
export const typescriptEnumMember = claim(ts.isEnumMember, TypeScriptEnumMember)
