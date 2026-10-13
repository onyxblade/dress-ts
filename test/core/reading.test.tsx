import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { claim, nodeById, nodeId, type NodeProps } from '../../src/core'
import { programFor, renderHtml, renderText } from '../../src/core/testing'

/** A reading: `throw x` shown as `raise x`. */
function Raise({ node, ctx }: NodeProps<ts.ThrowStatement>) {
  return <>raise {ctx.sourceFile.text.slice(node.expression.getStart(ctx.sourceFile), node.expression.end)}</>
}
const raise = claim(ts.isThrowStatement, Raise, '`throw x` reads as `raise x`')

describe('a claim with a reading note', () => {
  it('marks what the component shows with the note and the node identity', () => {
    expect(renderHtml('throw e', [raise])).toContain(
      '<span class="reading" data-reading="`throw x` reads as `raise x`" data-node="ThrowStatement@0-7">raise e</span>',
    )
  })

  it('changes nothing a reader sees', () => {
    expect(renderText('throw e', [raise])).toBe('raise e')
  })

  it('leaves a claim without a note unmarked', () => {
    expect(renderHtml('throw e', [claim(ts.isThrowStatement, Raise)])).not.toContain('reading')
  })
})

describe('nodeById', () => {
  it('finds the node an identity came from', () => {
    const sf = programFor('const a = f(1)').getSourceFile('x.ts')!
    const call = (sf.statements[0] as ts.VariableStatement).declarationList.declarations[0].initializer!
    expect(nodeById(sf, nodeId(call))).toBe(call)
    expect(nodeById(sf, nodeId(sf))).toBe(sf)
  })

  it('answers nothing for an identity the file has no node for', () => {
    const sf = programFor('const a = f(1)').getSourceFile('x.ts')!
    expect(nodeById(sf, 'CallExpression@0-5')).toBeUndefined()
    expect(nodeById(sf, 'not an id')).toBeUndefined()
  })
})
