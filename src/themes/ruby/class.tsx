import ts from 'typescript'
import { Indent, Join, Line, Lines, Render, claim, type NodeProps } from '../../core'

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
        {node.typeParameters && (
          <>
            {'<'}
            <Join nodes={node.typeParameters} sep=", " ctx={ctx} />
            {'>'}
          </>
        )}
        {node.heritageClauses?.map((h) => (
          <>
            {' '}
            <Render key={h.pos} node={h} ctx={ctx} />
          </>
        ))}
      </span>
      <Indent>
        <Lines nodes={node.members} ctx={ctx} />
      </Indent>
      <Line>end</Line>
    </>
  )
}

/** `class A { ... }` reads as `class A ... end`. */
export const rubyClass = claim(ts.isClassLike, RubyClass)
