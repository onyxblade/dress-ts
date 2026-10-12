import { render } from 'preact'
import ts from 'typescript'
import { Render, Splice, compose, createCtx, type Transform } from './core'
import sampleText from './sample.ts?raw'

const sourceFile = ts.createSourceFile('sample.ts', sampleText, ts.ScriptTarget.Latest, true)

// No transforms yet: everything falls through to the faithful splicer.
const transforms: Transform[] = []
const ctx = createCtx(sourceFile, compose(() => Splice, transforms))

render(
  <pre>
    <Render node={sourceFile} ctx={ctx} />
  </pre>,
  document.getElementById('app')!,
)
