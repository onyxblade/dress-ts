import { render } from 'preact'
import { createMemoryService } from './core'
import { App } from './app'

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

// The samples, each a small program of its own, keyed by file name; one
// program holds them all, so an import between two would resolve.
const samples = Object.fromEntries(
  Object.entries(import.meta.glob('./samples/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>).map(
    ([path, text]) => [path.slice(path.lastIndexOf('/') + 1), text],
  ),
)
const service = createMemoryService(samples, libs)

render(<App service={service} fileNames={Object.keys(samples).sort()} />, document.getElementById('app')!)
