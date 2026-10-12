import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { renderText } from '../../src/core/testing'
import { Splice, replaceToken, withTransforms, type NodeProps, type Transform } from '../../src/core'

// A component that renders its subtree with every identifier shown as `_`.
const Blank = replaceToken('_')
const blankIdentifiers: Transform = (next) => (node, ctx) =>
  node.kind === ts.SyntaxKind.Identifier ? Blank : next(node, ctx)

function Redacted({ node, ctx }: NodeProps) {
  return <Splice node={node} ctx={withTransforms(ctx, [blankIdentifiers])} />
}

const redactFunctions: Transform = (next) => (node, ctx) =>
  ts.isFunctionDeclaration(node) ? Redacted : next(node, ctx)

describe('withTransforms', () => {
  it('applies a transform to the component subtree only', () => {
    expect(renderText('function f(a) { b }\nconst c = d', [redactFunctions])).toBe(
      'function _(_) { _ }\nconst c = d',
    )
  })
})
