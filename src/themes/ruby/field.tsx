import ts from 'typescript'
import { Render, claim, type NodeProps } from '../../core'
import { Modifiers, isNoiseModifier } from './modifiers'

/**
 * A field declared as the receiver's instance variable: `private readonly
 * seen = new Set()` reads as `@seen = Set.new()`. The visibility and
 * `readonly` are noise here as everywhere in the theme (see
 * modifiers.tsx), and the `@` says the variable is the object's own.
 * Name, `?` or `!`, type and initializer are the node's own.
 *
 * Only a field with no modifier beyond those. A `static` field, an
 * `abstract` or `declare` one, an `accessor`, a decorated one and a
 * `#private` or computed name say something `@x` would hide, so they
 * stay with the fallback as written, minus the noise.
 */
export function RubyField({ node, ctx }: NodeProps<ts.PropertyDeclaration>) {
  return (
    <>
      <Modifiers nodes={node.modifiers} ctx={ctx} />
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
  ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name) && (node.modifiers ?? []).every(isNoiseModifier)

export const rubyField = claim(isPlainField, RubyField, '`private readonly x = v` reads as `@x = v`')
