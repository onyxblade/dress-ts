import { describe, expect, it } from 'vitest'
import { lostComments, renderHtml, renderText } from '../../../core/testing'
import { rubyVariables } from '../variables'
import { rubyFallback } from '../fallback'

const transforms = [rubyVariables, rubyFallback]
const show = (text: string) => renderText(text, transforms)

describe('rubyVariables', () => {
  it('drops the declaration keyword', () => {
    expect(show('const x = 1;')).toBe('x = 1')
    expect(show('let x = 1')).toBe('x = 1')
    expect(show('var x = 1')).toBe('x = 1')
  })

  it('keeps the statement modifiers, the type and the ! as written', () => {
    expect(show('export const x = 1')).toBe('export x = 1')
    expect(show('declare const x: number')).toBe('declare x: number')
    expect(show('let x: number')).toBe('x: number')
    expect(show('let x!: number')).toBe('x!: number')
  })

  it('joins several declarations and keeps a destructuring pattern', () => {
    expect(show('const a = 1, b = 2')).toBe('a = 1, b = 2')
    expect(show('const a = 1,\n  b = 2')).toBe('a = 1, b = 2')
    expect(show('const { a, b } = o')).toBe('{ a, b } = o')
    expect(show('const [a, b] = p')).toBe('[a, b] = p')
  })

  it('reads the list of a for loop the same way', () => {
    expect(show('for (const x of xs) {}')).toBe('for (x of xs) {}')
    expect(show('for (let i = 0; i < n; i++) {}')).toBe('for (i = 0; i < n; i++) {}')
  })

  it('keeps comments around the declarations', () => {
    expect(show('const /* c */ x = 1')).toBe('/* c */ x = 1')
    expect(show('const x = 1 /* c */, y = 2')).toBe('x = 1 /* c */, y = 2')
    expect(lostComments('const x = 1, // c\n  y = 2', transforms)).toEqual([])
  })

  it('marks the reading on the list, with the keyword in the node as written', () => {
    expect(renderHtml('const x = 1', transforms)).toContain(
      'data-reading="`const x = 1` and `let x = 1` read as `x = 1`" data-node="VariableDeclarationList@0-11"><span',
    )
  })
})
