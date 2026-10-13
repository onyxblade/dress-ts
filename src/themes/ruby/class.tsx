import ts from 'typescript'
import { Indent, Line, Lines, Render, claim, type NodeProps } from '../../core'
import { TypeList } from './generics'
import { Modifiers } from './modifiers'

/**
 * A class or an interface laid out from its fields: header line, members
 * in an Indent, `end`. The two share every field the header needs, so one
 * component covers both; only the keyword is the node's kind.
 */
export function RubyClass({ node, ctx }: NodeProps<ts.ClassLikeDeclaration | ts.InterfaceDeclaration>) {
  return (
    <>
      <span class="header">
        <Modifiers nodes={node.modifiers} ctx={ctx} />
        {ts.isInterfaceDeclaration(node) ? 'interface' : 'class'}
        {node.name && <> <Render node={node.name} ctx={ctx} /></>}
        <TypeList nodes={node.typeParameters} ctx={ctx} />
        {node.heritageClauses?.map((h) => (
          <>
            {' '}
            <Render key={h.pos} node={h} ctx={ctx} />
          </>
        ))}
      </span>
      <Indent>
        <Lines nodes={node.members} within={node} ctx={ctx} />
      </Indent>
      <Line>end</Line>
    </>
  )
}

export const rubyClass = claim(ts.isClassLike, RubyClass, '`class A { ... }` reads as `class A ... end`')
export const rubyInterface = claim(ts.isInterfaceDeclaration, RubyClass, '`interface A { ... }` reads as `interface A ... end`')
