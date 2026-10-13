import { render } from 'preact'
import { Render, Verbatim, compose, createCtx, createMemoryProgram } from './core'
import { ruby } from './themes/ruby'
import sampleText from './sample.ts?raw'

// The checker needs the compiler's lib files. Bundle the ES2022 chain as text
// (about half a megabyte next to the compiler's nine); DOM would add two more.
const libText = import.meta.glob(
  [
    '/node_modules/typescript/lib/lib.es5.d.ts',
    '/node_modules/typescript/lib/lib.es20*.d.ts',
    '/node_modules/typescript/lib/lib.decorators*.d.ts',
    '!**/*.full.d.ts',
  ],
  { query: '?raw', import: 'default', eager: true, exhaustive: true },
) as Record<string, string>
const libs = (name: string) => libText[`/node_modules/typescript/lib/${name}`]

const program = createMemoryProgram({ 'sample.ts': sampleText }, libs)

const theme = ruby
const ctx = createCtx(program, 'sample.ts', compose(() => Verbatim, theme.transforms))

render(
  <pre class="code" data-theme={theme.name}>
    <Render node={ctx.sourceFile} ctx={ctx} />
  </pre>,
  document.getElementById('app')!,
)
