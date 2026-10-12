import { render } from 'preact'
import ts from 'typescript'
import { Render, Splice, compose, createCtx } from './core'
import { ruby } from './themes/ruby'
import sampleText from './sample.ts?raw'

const sourceFile = ts.createSourceFile('sample.ts', sampleText, ts.ScriptTarget.Latest, true)

const theme = ruby
const ctx = createCtx(sourceFile, compose(() => Splice, theme.transforms))

render(
  <pre data-theme={theme.name}>
    <Render node={sourceFile} ctx={ctx} />
  </pre>,
  document.getElementById('app')!,
)
