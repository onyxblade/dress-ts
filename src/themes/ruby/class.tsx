import ts from 'typescript'
import { Indent, Line, Lines, Render, claim, type NodeProps } from '../../core'
import { TypeList } from './generics'

/** A class laid out from its fields: header line, members in an Indent, `end`. */
export function RubyClass({ node, ctx }: NodeProps<ts.ClassLikeDeclaration>) {
  return (
    <>
      <span class="header">
        {node.modifiers?.map((m) => (
          <>
            <Render key={m.pos} node={m} ctx={ctx} />{' '}
          </>
        ))}
        class{node.name && <> <Render node={node.name} ctx={ctx} /></>}
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
