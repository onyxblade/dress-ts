import { describe, expect, it } from 'vitest'
import { lostComments, renderHtml, renderText } from '../../../core/testing'
import { rubyEquality } from '../equality'
import { rubyFallback } from '../fallback'

const transforms = [rubyEquality, rubyFallback]
const show = (text: string) => renderText(text, transforms)

describe('rubyEquality', () => {
  it('reads === as == and !== as !=', () => {
    expect(show('a === b && c !== d')).toBe('a == b && c != d')
  })

  it('leaves a loose == and other operators alone', () => {
    expect(show('a == b || c != d || e <= f')).toBe('a == b || c != d || e <= f')
  })

  it('keeps comments around the operator', () => {
    expect(show('a /* l */ === /* r */ b')).toBe('a /* l */ == /* r */ b')
    expect(lostComments('a /* l */ === /* r */ b', transforms)).toEqual([])
  })

  it('marks the operator', () => {
    expect(renderHtml('a === b', transforms)).toContain(
      'data-reading="`===` reads as `==`, `!==` as `!=`" data-node="EqualsEqualsEqualsToken@1-5"',
    )
  })
})
