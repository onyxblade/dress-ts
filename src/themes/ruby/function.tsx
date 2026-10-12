import ts from 'typescript'
import { Splice, replaceToken, withTransforms, type NodeProps, type Transform } from '../../core'

const Def = replaceToken('def')

/** Within a function node only: the `function` keyword reads as `def`. */
const keywordAsDef: Transform = (next) => (node, ctx) =>
  node.kind === ts.SyntaxKind.FunctionKeyword ? Def : next(node, ctx)

/**
 * Owns the rendering of a function. For now it keeps the default layout and
 * only changes the keyword, by scoping `keywordAsDef` to its own subtree.
 * Further Ruby-isms (dropping braces for `end`, omitting empty parens) belong
 * here too, at which point this stops delegating to Splice and lays out the
 * children itself.
 */
function RubyFunction({ node, ctx }: NodeProps) {
  return <Splice node={node} ctx={withTransforms(ctx, [keywordAsDef])} />
}

/** `function f()` reads as `def f()`. */
export const rubyFunction: Transform = (next) => (node, ctx) =>
  ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
    ? RubyFunction
    : next(node, ctx)
