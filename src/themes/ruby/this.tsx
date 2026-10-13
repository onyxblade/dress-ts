import ts from 'typescript'
import { CommentText, Render, claim, type NodeProps } from '../../core'

const isThis = (node: ts.Node): node is ts.ThisExpression => node.kind === ts.SyntaxKind.ThisKeyword

/**
 * The receiver's own name: `this` reads as `self`. So does the `this`
 * type, `set(k, v): this`, since RBS names the receiver's type `self`
 * too, `def set: (K, V) -> self`; the parser gives it a kind of its own,
 * so it is a second claim on the same word. A parameter named `this`,
 * `function f(this: A)`, is an identifier and stays as written.
 */
export function RubyThis(_: NodeProps<ts.ThisExpression | ts.ThisTypeNode>) {
  return <>self</>
}

export const rubyThis = claim(isThis, RubyThis, '`this` reads as `self`')
export const rubyThisType = claim(ts.isThisTypeNode, RubyThis, 'the `this` type reads as `self`, the type RBS gives the receiver')

/**
 * Whether `this.name` reaches a field of the object, as the checker sees
 * it, rather than a method or an accessor. A parameter property,
 * `constructor(public readonly options)`, is a field too.
 */
function isFieldAccess(node: ts.PropertyAccessExpression, checker: ts.TypeChecker): boolean {
  if (!isThis(node.expression) || node.questionDotToken || !ts.isIdentifier(node.name)) return false
  const symbol = checker.getSymbolAtLocation(node.name)
  return symbol !== undefined && (symbol.flags & ts.SymbolFlags.Property) !== 0
}

/**
 * A field of the receiver is an instance variable: `this.seen` reads as
 * `@seen`. The `@` is this component's word, the name is the node's own.
 * The `this` is not rendered, so a comment attached to it, `this./* c *​/x`,
 * goes before the `@`.
 *
 * Only a field. Ruby's `@walk(p)` is not a call, so `this.walk(p)` on a
 * method, and `this.size` on an accessor, are not claimed and read as
 * `self.walk(p)` through the fallback and `RubyThis`; so does a `this`
 * the checker cannot place, outside any class.
 */
export function RubyInstanceVariable({ node, ctx }: NodeProps<ts.PropertyAccessExpression>) {
  const { leading, trailing } = ctx.comments.of(node.expression)
  return (
    <>
      {[...leading, ...trailing].map((c) => (
        <>
          <CommentText key={c.pos} comment={c} ctx={ctx} />{' '}
        </>
      ))}
      @<Render node={node.name} ctx={ctx} />
    </>
  )
}

export const rubyInstanceVariable = claim(
  (node, ctx): node is ts.PropertyAccessExpression => ts.isPropertyAccessExpression(node) && isFieldAccess(node, ctx.checker),
  RubyInstanceVariable,
  '`this.x` reads as `@x`',
)
