import ts from 'typescript'
import { CommentText, Render, claim, type NodeProps } from '../../core'

/** The modifiers the instance-variable reading has a word for: none. */
const isAbsorbed = (m: ts.ModifierLike) =>
  m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ReadonlyKeyword

/**
 * A field declared as the receiver's instance variable: `private readonly
 * seen = new Set()` reads as `@seen = Set.new()`. The `@` says what
 * `private` said, an instance variable is the object's own; `readonly`
 * has no word in Ruby and is left out. Name, `?` or `!`, type and
 * initializer are the node's own.
 *
 * Only a field with no modifier beyond `private` and `readonly`. A
 * `public`, `protected` or `static` field, an `abstract` or `declare`
 * one, an `accessor`, a decorated one and a `#private` or computed name
 * say something `@x` would hide, so they stay with the fallback as
 * written. The modifiers are not rendered, so a comment attached to one,
 * `private /* c *​/ x`, goes before the `@`.
 */
export function RubyField({ node, ctx }: NodeProps<ts.PropertyDeclaration>) {
  const comments = (node.modifiers ?? []).flatMap((m) => {
    const { leading, trailing } = ctx.comments.of(m)
    return [...leading, ...trailing]
  })
  return (
    <>
      {comments.map((c) => (
        <>
          <CommentText key={c.pos} comment={c} ctx={ctx} />{' '}
        </>
      ))}
      @<Render node={node.name} ctx={ctx} />
      {node.questionToken && '?'}
      {node.exclamationToken && '!'}
      {node.type && (
        <>
          : <Render node={node.type} ctx={ctx} />
        </>
      )}
      {node.initializer && (
        <>
          {' '}
          = <Render node={node.initializer} ctx={ctx} />
        </>
      )}
    </>
  )
}

const isPlainField = (node: ts.Node): node is ts.PropertyDeclaration =>
  ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name) && (node.modifiers ?? []).every(isAbsorbed)

export const rubyField = claim(isPlainField, RubyField, '`private readonly x = v` reads as `@x = v`')
