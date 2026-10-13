import { describe, expect, it } from 'vitest'
import ts from 'typescript'
import { lostComments, renderText } from '../../src/core/testing'
import { Indent, Line, Lines, Render, allComments, attachComments, claim, type NodeProps } from '../../src/core'

const parse = (text: string) => ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true)
const texts = (sf: ts.SourceFile) => allComments(sf).map((c) => c.text)

describe('allComments', () => {
  it('finds every comment once, wherever it sits between tokens', () => {
    const sf = parse(
      [
        '/** doc */',
        'function f(/* a */ x) { // b',
        '  // c',
        '  return x; /* d */ // e',
        '  // f',
        '}',
        '// g',
      ].join('\n'),
    )
    expect(texts(sf)).toEqual(['/** doc */', '/* a */', '// b', '// c', '/* d */', '// e', '// f', '// g'])
  })

  it('includes a comment at the very start of the file', () => {
    expect(texts(parse('// first\na()'))).toEqual(['// first'])
  })
})

describe('attachComments', () => {
  const attach = (text: string) => {
    const sf = parse(text)
    return { sf, map: attachComments(sf) }
  }
  const strings = (cs: { text: string }[]) => cs.map((c) => c.text)

  it('leads the next sibling, trails the previous one on the same line', () => {
    const { sf, map } = attach('// lead\na(); // trail\nb()')
    const [a, b] = sf.statements
    expect(strings(map.of(a).leading)).toEqual(['// lead'])
    expect(strings(map.of(a).trailing)).toEqual(['// trail'])
    expect(map.of(b)).toEqual({ leading: [], trailing: [], dangling: [] })
  })

  it('dangles from the enclosing node after its last child, or in an empty one', () => {
    const { sf, map } = attach('function f() {\n  a();\n  // after\n}\nfunction g() { /* only */ }')
    const [f, g] = sf.statements as unknown as ts.FunctionDeclaration[]
    expect(strings(map.of(f.body!).dangling)).toEqual(['// after'])
    expect(strings(map.of(g.body!).dangling)).toEqual(['/* only */'])
  })

  it('dangles end-of-file comments from the file, not the end-of-file token', () => {
    const { sf, map } = attach('a()\n// bye')
    expect(strings(map.of(sf).dangling)).toEqual(['// bye'])
    expect(map.of(sf.endOfFileToken)).toEqual({ leading: [], trailing: [], dangling: [] })
  })

  it('places a comment among the children of the innermost node around it', () => {
    const { sf, map } = attach('if (/* c */ x) y()')
    const stmt = sf.statements[0] as ts.IfStatement
    expect(strings(map.of(stmt.expression).leading)).toEqual(['/* c */'])
    expect(map.of(stmt).leading).toEqual([])
  })

  it('treats a JSDoc comment as leading the declaration', () => {
    const { sf, map } = attach('/** doc */\nfunction f() {}')
    expect(strings(map.of(sf.statements[0]).leading)).toEqual(['/** doc */'])
  })
})

// A designed block: its statements as lines in an indent, trailing comments kept.
function LaidOutBlock({ node, ctx }: NodeProps<ts.Block>) {
  return (
    <>
      <Line>{'{'}</Line>
      <Indent>
        <Lines nodes={node.statements} within={node} ctx={ctx} />
      </Indent>
      <Line>{'}'}</Line>
    </>
  )
}
// A designed call: writes its own parens, hands the callee to Render.
function LaidOutCall({ node, ctx }: NodeProps<ts.CallExpression>) {
  return (
    <>
      <Render node={node.expression} ctx={ctx} />
      {'()'}
    </>
  )
}
const designed = [claim(ts.isBlock, LaidOutBlock), claim(ts.isCallExpression, LaidOutCall)]

describe('comments in designed layout', () => {
  it('Lines gives dangling comments lines after the last statement, keeping the gap', () => {
    const src = '{\n  a()\n\n  // after\n}'
    expect(renderText(src, designed)).toBe('{\n  a()\n\n  // after\n}\n')
  })

  it('Lines shows the comment of an otherwise empty block', () => {
    expect(renderText('{\n  // only\n}', designed)).toBe('{\n  // only\n}\n')
  })

  it('Render emits the comments attached to the child inline', () => {
    expect(renderText('/* a */ f /* b */ ()', designed)).toBe('/* a */ f /* b */()')
  })
})

describe('lostComments', () => {
  const src = [
    '/** doc */',
    'function f(/* a */ x) { // b',
    '  // c',
    '  return x; /* d */ // e',
    '  // f',
    '}',
    '// g',
  ].join('\n')

  it('is empty for the verbatim rendering', () => {
    expect(lostComments(src)).toEqual([])
  })

  it('is empty for the designed layout', () => {
    expect(lostComments(src, designed)).toEqual([])
  })

  it('names what a careless component drops', () => {
    const Dropper = ({ node, ctx }: NodeProps<ts.Block>) => (
      <Indent>
        <Lines nodes={node.statements} ctx={ctx} />
      </Indent>
    )
    expect(lostComments(src, [claim(ts.isBlock, Dropper)])).toEqual(['// f'])
  })
})
