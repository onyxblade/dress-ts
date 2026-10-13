import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { renderText } from '../../src/core/testing'
import { Verbatim, claim, withTransforms, type NodeProps } from '../../src/core'

// A component that renders its subtree with every identifier shown as `_`.
const blankIdentifiers = claim(ts.isIdentifier, () => <>_</>)

function Redacted({ node, ctx }: NodeProps) {
  return <Verbatim node={node} ctx={withTransforms(ctx, [blankIdentifiers])} />
}

describe('withTransforms', () => {
  it('applies a transform to the component subtree only', () => {
    expect(renderText('function f(a) { b }\nconst c = d', [claim(ts.isFunctionDeclaration, Redacted)])).toBe(
      'function _(_) { _ }\nconst c = d',
    )
  })
})
