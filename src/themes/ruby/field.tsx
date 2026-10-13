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

/**
 * A parameter property is a field declared in the constructor's
 * signature, `constructor(private readonly tokens: Token[]) {}`, and the
 * modifier is what makes it one: without `@` the body would read as empty
 * and `@tokens` later in the class would come from nowhere. So it reads as
 * `@tokens: Token[]` in the parameter list, `def constructor(@tokens:
 * Token[])`, the way Crystal writes it; the `def` stays, being what `new`
 * takes. Name, `?`, type and default are the node's, and an `override` or
 * a decorator, which are not noise, stay in front.
 */
export function RubyParameterProperty({ node, ctx }: NodeProps<ts.ParameterPropertyDeclaration>) {
  return (
    <>
      <Modifiers nodes={node.modifiers} ctx={ctx} />
      @<Render node={node.name} ctx={ctx} />
      {node.questionToken && '?'}
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

const isParameterProperty = (node: ts.Node): node is ts.ParameterPropertyDeclaration =>
  ts.isParameter(node) && ts.isParameterPropertyDeclaration(node, node.parent)

export const rubyParameterProperty = claim(isParameterProperty, RubyParameterProperty, '`constructor(private x: T)` reads as `constructor(@x: T)`, a field declared in the signature')
