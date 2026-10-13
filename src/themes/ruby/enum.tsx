import ts from 'typescript'
import { Indent, Line, Lines, Render, claim, type NodeProps } from '../../core'
import { Modifiers } from './modifiers'

/**
 * An enum laid out like a class: header line, members in an Indent, one
 * per line, `end`. Ruby has no enum; the word stays, since a module of
 * constants would hide what it was, and the shape takes the `end` every
 * other body does. The members are the node's; the commas between them
 * are tokens of the enum, not of a member, so they are not written, and
 * a comment after one, `A = 1, // c`, trails the member and stays on its
 * line.
 */
export function RubyEnum({ node, ctx }: NodeProps<ts.EnumDeclaration>) {
  return (
    <>
      <span class="header">
        <Modifiers nodes={node.modifiers} ctx={ctx} />
        enum <Render node={node.name} ctx={ctx} />
      </span>
      <Indent>
        <Lines nodes={node.members} within={node} ctx={ctx} />
      </Indent>
      <Line>end</Line>
    </>
  )
}

export const rubyEnum = claim(ts.isEnumDeclaration, RubyEnum, '`enum E { A, B }` reads as `enum E ... end`, a member per line')
