import ts from 'typescript'
import { Indent, Join, Line, Lines, Render, claim, type NodeProps } from '../../core'
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

/**
 * Ruby writes the superclass after `<`: `class A < B`. The `extends` is a
 * token, not a node, so the `<` is this component's word and the types are
 * the node's. An interface's `extends B, C` takes the same `<`; an
 * `implements` has no Ruby form and stays with the fallback.
 */
export function RubyExtends({ node, ctx }: NodeProps<ts.HeritageClause>) {
  return (
    <>
      {'< '}
      <Join nodes={node.types} sep=", " ctx={ctx} />
    </>
  )
}

const isExtends = (n: ts.Node): n is ts.HeritageClause => ts.isHeritageClause(n) && n.token === ts.SyntaxKind.ExtendsKeyword

export const rubyExtends = claim(isExtends, RubyExtends, '`extends B` reads as `< B`')
