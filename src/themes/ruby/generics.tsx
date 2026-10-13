import ts from 'typescript'
import { Join, Render, claim, type Ctx, type Edit, type NodeProps } from '../../core'
import { Modifiers } from './modifiers'

/**
 * Ruby's type syntax writes a generic in square brackets, `Array[String]`,
 * `class Stack[T]`, so the theme shows every type parameter or argument
 * list that way. There are two kinds of places a list appears, and each
 * gets the brackets its own way.
 *
 * A designed component writes its own tokens, so it writes the brackets:
 * `TypeList` is what it puts where the source had `<...>`, and renders
 * nothing for a node without a list.
 */
export function TypeList({ nodes, ctx }: { nodes: ts.NodeArray<ts.Node> | undefined; ctx: Ctx }) {
  return (
    nodes && (
      <>
        [<Join nodes={nodes} sep=", " ctx={ctx} />]
      </>
    )
  )
}

/**
 * RBS writes a type parameter's upper bound after `<`, `[T < Numeric]`,
 * the same `<` as a superclass, so `T extends object` reads as `T <
 * object`. The modifiers (`in`, `out`, `const`), name, constraint and
 * default are the node's; the `<` and `=` are this component's. Only a
 * parameter with a constraint is claimed, since a bare `T` reads as
 * itself. The `U extends string` of an `infer U extends string` is a
 * type parameter to the parser too, but it narrows a match rather than
 * bounding a parameter, so it stays as written; so does the `K in T` of a
 * mapped type, `{ [K in T]: V }`, whose constraint is the set of keys `K`
 * ranges over, not a bound.
 */
export function RubyTypeParameter({ node, ctx }: NodeProps<ts.TypeParameterDeclaration>) {
  return (
    <>
      <Modifiers nodes={node.modifiers} ctx={ctx} />
      <Render node={node.name} ctx={ctx} />
      {node.constraint && (
        <>
          {' < '}
          <Render node={node.constraint} ctx={ctx} />
        </>
      )}
      {node.default && (
        <>
          {' = '}
          <Render node={node.default} ctx={ctx} />
        </>
      )}
    </>
  )
}

const isBounded = (n: ts.Node): n is ts.TypeParameterDeclaration =>
  ts.isTypeParameterDeclaration(n) && n.constraint !== undefined && !ts.isInferTypeNode(n.parent) && !ts.isMappedTypeNode(n.parent)

export const rubyTypeParameter = claim(isBounded, RubyTypeParameter, '`T extends U` reads as `T < U`')

/** Where the first token at or after `pos` starts, past whitespace and comments. */
function tokenAfter(text: string, pos: number): number {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, /* skipTrivia */ true, ts.LanguageVariant.Standard, text, undefined, pos)
  scanner.scan()
  return scanner.getTokenStart()
}

/** The lists of a node that the parser delimited with `<` and `>`, on the kinds that carry them. */
function typeLists(node: ts.Node): ts.NodeArray<ts.Node>[] {
  const { typeParameters, typeArguments } = node as { typeParameters?: ts.NodeArray<ts.Node>; typeArguments?: ts.NodeArray<ts.Node> }
  return [typeParameters, typeArguments].filter((l): l is ts.NodeArray<ts.Node> => l !== undefined)
}

/**
 * The other kind of place: an undesigned node shown verbatim, `Set<string>`
 * as a type reference, `type Pair<T> = ...`, a call `f<T>(x)`. This rule of
 * the theme's fallback (see fallback.tsx) swaps the two delimiters of each
 * list the node carries. A list's range starts after its `<` and ends
 * before its `>`, past any trivia, so the delimiters sit in the gaps
 * around the list's elements, where an edit can reach them. A nested list
 * belongs to a nested node, which handles its own.
 */
export function squareTypeLists(node: ts.Node, { sourceFile: { text } }: Ctx): Edit[] {
  return typeLists(node).flatMap((list) => {
    const open = list.pos - 1
    const close = tokenAfter(text, list.end)
    if (text[open] !== '<' || text[close] !== '>') return []
    const note = '`Set<string>` reads as `Set[string]`'
    return [
      { from: open, to: open + 1, text: '[', note },
      { from: close, to: close + 1, text: ']', note },
    ]
  })
}
