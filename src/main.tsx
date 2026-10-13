import { render } from 'preact'
import { createMemoryProgram } from './core'
import { App } from './app'
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

render(<App program={program} fileName="sample.ts" />, document.getElementById('app')!)
