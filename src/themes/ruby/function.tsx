import ts from 'typescript'
import { NodeSpan, replaceToken, spliceChildren, type NodeProps, type PickChild, type Transform } from '../../core'
import { RubyBody } from './braces'

const Def = replaceToken('def')

/**
 * Owns the rendering of a function. It lays out its direct children itself:
 * the `function` keyword reads as `def`, and the body block gets `end`
 * instead of braces. Everything else (name, parameters, return type) is
 * dispatched normally.
 */
const pickFunctionChild: PickChild = (child) => {
  if (child.kind === ts.SyntaxKind.FunctionKeyword) return Def
  if (ts.isBlock(child)) return RubyBody
  return undefined
}

function RubyFunction({ node, ctx }: NodeProps) {
  return <NodeSpan node={node}>{spliceChildren(node, ctx, pickFunctionChild)}</NodeSpan>
}

/** `function f() { ... }` reads as `def f() ... end`. */
export const rubyFunction: Transform = (next) => (node, ctx) =>
  ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
    ? RubyFunction
    : next(node, ctx)
