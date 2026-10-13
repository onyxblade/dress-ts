import ts from 'typescript'
import { render } from 'preact-render-to-string'
import { describe, expect, it, vi } from 'vitest'
import { App } from '../../../app'
import { allComments, createMemoryService } from '../../../core'
import { lostComments, nodeLibs, renderHtml, renderText } from '../../../core/testing'
import { ruby } from '../../ruby'
import { typescript } from '..'

const show = (source: string) => renderText(source, typescript.transforms)
const comments = (source: string) => allComments(ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true)).map((c) => c.text)

describe('typescript hidden imports', () => {
  it('removes static imports without leaving empty lines, keeping their identifiers at use sites', () => {
    const source = "import Foo from './foo';\nimport type { Item } from './item';\nimport './setup';\nimport {} from './register';\nimport legacy = require('./legacy');\n\nconst value: Item = new Foo();\nlegacy(value);"
    expect(show(source)).toBe('const value: Item = new Foo();\nlegacy(value);\n')
    expect(renderHtml(source, typescript.transforms)).toContain('data-kind="Identifier"')
  })

  it('keeps dynamic imports, import types, exports, and nested import aliases visible', () => {
    const source = "export { run } from './lib';\nconst lazy = import('./lib');\ntype Item = import('./lib').Item;\nnamespace N { import T = Outer.T; }"
    expect(show(source)).toBe(source + '\n')
  })

  it.each([
    '/** file doc */\nimport {\n  // binding\n  x, /* inline */\n} from "x"; // trailing\n\n// code doc\nx();\n// end',
    'import /* before */ { x /* name */ } /* after */ from /* module */ "x" /* attributes */ with { type: "json" };\nx',
    '// import only\nimport "setup"; // trailing\n\n// end',
    '#!/usr/bin/env node\n// first\nimport "setup";\n// second\nimport "more";',
    'f();\n// later import\nimport "setup"; // import trailing\n\ng();',
    'f();\nimport "setup"; // last',
  ])('preserves every comment when hiding imports: %s', (source) => {
    expect(lostComments(source, typescript.transforms)).toEqual([])
    expect(comments(show(source))).toEqual(comments(source))
    expect(show(source)).not.toContain('import "setup"')
  })

  it('keeps import-associated comments visible without showing the declaration', () => {
    expect(show('/** file doc */\nimport { x /* name */ } from "x"; // why\nx()')).toBe(
      '/** file doc */\n/* name */\n// why\nx()\n',
    )
    expect(show('import "setup";')).toBe('')
  })

  it('leaves source and Ruby import declarations visible', () => {
    const source = 'import { x } from "x";\nx()'
    expect(renderText(source)).toBe(source)
    expect(renderText(source, ruby.transforms)).toContain('import { x } from "x"')
  })

  it('provides a header hover target even for an import-only file', () => {
    const service = createMemoryService({ 'x.ts': 'import "setup";' }, nodeLibs)
    vi.stubGlobal('location', { search: '?file=x.ts&left=source&right=typescript' })
    try {
      const html = render(<App service={service} fileNames={['x.ts']} />)
      expect(html).toMatch(/class="imports-summary"[^>]*data-imports/)
      expect(html).toContain('aria-label="Show 1 import">1 import</button>')
      expect(html).toContain('<pre class="code" data-theme="typescript"></pre>')
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
