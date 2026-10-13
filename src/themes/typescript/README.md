# The TypeScript theme

TypeScript laid out from its AST, with imports moved to hover, supported
switches read as independent arms, and strict comparisons shortened in files
without loose equality. An opt-in ESLint preset enforces the reading contracts;
the renderer also checks the source independently.

Choose `typescript` in either demo pane, or open
`?file=lru.ts&left=source&right=typescript` to compare it with the source.
The default right-hand view is this theme. `source` preserves the original
text; `typed` adds semantic identifier roles to that text; `typescript`
also owns the layout of declarations and control flow.

## Layout

| Component | Owns |
| --- | --- |
| `sourceFile.tsx` | Statements, file comments, blank-line groups, and the shebang |
| `imports.ts` | Omitting top-level imports while preserving their comments |
| `block.tsx` | Block statements and function bodies, including standalone scopes and static blocks' bodies |
| `function.tsx` | Function declarations and expressions, methods, constructors, accessors, and arrows |
| `class.tsx` | Classes, class expressions, and interfaces, including modifiers and heritage clauses |
| `if.tsx` | Conditions, braced or braceless branches, and `else if` chains |
| `loop.tsx` | `while`, `do`, three-clause `for`, `for in`, `for of`, and `for await of` |
| `switch.tsx` | Independent switch arms, with ordinary TS layout for unsupported switches |
| `switchAnalysis.ts` | The switch contract shared by the theme and lint rule |
| `equality.tsx` | Shortened strict comparisons, guarded by a scan of the entire source file |
| `eslint.ts` | The opt-in `dress/switch-reading` rule, `eqeqeq`, and flat configs |
| `try.tsx` | Try, catch with or without a binding, and finally |
| `enum.tsx` | Enums, member initializers, and comma separators |
| Core `Verbatim` | Everything else, with semantic children still dispatched through the theme |

Each statement or member gets a `Line`; bodies use `Indent` and `Lines`
with `within` so dangling comments survive. Nonempty bodies expand even
when the original was on one line. An empty body stays `{}`, unless it
contains comments. Opening and closing braces remain visible. Closing
braces stay inline with continuations, so `} else {`, `} catch`, `});`,
and a function expression's following punctuation stay together.

```ts
// Source
function f(x: number) { if (x === 0) { return 1; } return x; }

// TypeScript theme
function f(x: number) {
  if (x == 0) {
    return 1;
  }
  return x;
}
```

Headers use consistent spaces. Arrow parameters always have parentheses;
`do ... while` gets its terminating semicolon. Parameter and type-parameter
lists retain a source trailing comma, as do enum members. Existing
statement and member terminators stay with their nodes. Overload,
ambient, and abstract signatures without bodies use `Verbatim`, preserving
their original terminators. These are formatting decisions, without a
translation mark or a new reading rule.

## Imports on hover

Top-level static imports, including `import type`, side-effect imports,
empty binding lists, and `import x = require(...)`, take no code lines.
Hover an imported identifier to see its original import declaration below
the usual quick info. The checker follows the local binding, so aliases and
shadowed names are handled correctly; module resolution is not required to
show where a binding came from. Namespace members such as `fs.readFile`
and `fs.Dirent` also show the namespace's import.

Each demo pane's header has a small imports count. Hover or focus it to see
the whole file's import list in source order, including imports with no
use-site target. Click to pin the card for scrolling or copying; Escape
dismisses it. This shared inspection feature is available in every view;
only this theme hides declarations from the code. The original declaration
keeps aliases, type-only markers, attributes, and internal comments intact.

Comments belonging to hidden declarations remain visible, in order, before
the next surviving statement or at the end of the file. File documentation
does not disappear with the first import. Dynamic `import()` expressions,
`import('module').Type`, re-exports, and nested namespace import aliases
stay in the code. Hiding declarations is a reading decision: the displayed
text is no longer a standalone, equivalent TypeScript program. The program
and checker still use the original, unchanged AST.

## Strict equality reading

When a source file contains no native `==` or `!=` operators, the theme reads
`===` as `==` and `!==` as `!=`, including comparisons with `null` and
`undefined`. These displayed operators retain strict TypeScript semantics.
Hover an operator to see the reading and its original spelling.

```ts
// Source (a file with no loose equality)
a === b && c !== d
```

```text
// TypeScript theme
a == b && c != d
```

If even one native `==` or `!=` occurs anywhere in the file, every comparison
in that file keeps its original spelling. This includes strict operators
before the loose comparison, inside other functions, and in nested bodies.
For example, a file containing `a === b; c != d;` displays both unchanged.
Imports, switch readings, and the rest of the theme continue to work.

The guard walks the original semantic AST once per source-file object and
caches the result without changing the tree. Comments, string and regex
literals, and template text cannot trigger it; actual comparisons inside
template expressions can. It does not assume lint has run or respect lint
disable comments, so unfamiliar files still have unambiguous comparisons.

The combined lint preset enables ESLint's built-in
`eqeqeq: ['error', 'always', { null: 'always' }]`. There are no `smart` or
null exceptions. Lint checks the original TS; the shortened display is a
reading, not source to compile or lint.

## Switch reading

Supported switches keep `switch` and `default`, combine adjacent empty
labels with `|`, replace `case ...:` with `... =>`, and omit a final
unlabelled `break` that exits that switch. A short, uncommented body fits
on the label's line; other bodies use braces. A sole source block uses the
arm's braces, keeping its scope without adding another indentation level.

```ts
// Source
switch (token.kind) {
  case 'space':
  case 'newline':
    skip()
    break
  case 'number': {
    const value = parse(token)
    return value
  }
  default:
    throw new Error('unexpected token')
}
```

```text
switch (token.kind) {
  'space' | 'newline' => skip()
  'number' => {
    const value = parse(token)
    return value
  }
  default => throw new Error('unexpected token')
}
```

These are statement arms: `return`, `throw`, and `continue` stay explicit.
There is no implicit return value and no promise of exhaustiveness. If no
label matches and there is no default, execution continues after the switch.
Hover the switch header or an arm's `=>` to see the reading and source.
Comments on labels, blocks, and omitted breaks remain visible in order.

The first contract is deliberately syntactic:

- Labels must be string, number, bigint, boolean, or null literals, including
  constant templates, signed numbers, and parenthesized literals. Names,
  enum members, calls, property accesses, and other expressions use fallback.
- A `default` must be last and cannot share a body with preceding empty labels.
- Declarations directly in a case must be wrapped in a block. This also
  includes `var` and type declarations; `var` retains its TS function scope.
- Each nonfinal group must end in an explicit exit: `break`, `return`,
  `throw`, `continue`, a block ending in an exit, or an `if` whose two branches
  exit. This is a conservative proof, not a complete control-flow analysis.
  A nested switch or a call returning `never` is not itself proof of exit.
- Only a top-level final unlabelled break, or the final break inside a sole
  case block, can be hidden. Earlier breaks of this switch and labelled
  breaks are rejected. Breaks of nested loops or switches are left to those
  constructs; nested functions are analyzed independently.

If any condition fails, that whole switch keeps its ordinary TS labels and
jumps. Nested switches can still simplify independently. Rendering always
checks the contract, even when lint has not run or has been disabled. The
source AST is never changed.

### ESLint

`eslint.ts` exports a plugin with `dress/switch-reading`, a switch-only
`switchReadingConfig`, and the combined `typescriptReadingConfig` that also
enables `eqeqeq`. Both flat configs include `@typescript-eslint/parser`.
It uses parser node maps to call the same `analyzeSwitch()` function as the
theme, with no type-aware project setup. Each failure points at the
unsupported label, declaration, break, or case group. Intentional
`falls through` comments do not exempt a branch. There is no autofix:
inserting a break into intentional fallthrough would change the program.

This repository opts the demo samples into the contract:

```js
// eslint.config.mjs (Node 26 loads the .ts module directly)
import { typescriptReadingConfig } from './src/themes/typescript/eslint.ts'

export default [{ ...typescriptReadingConfig, files: ['src/samples/**/*.ts'] }]
```

Run `pnpm lint`; CI runs it as well. Change `files` to opt in a different
set of files. The renderer and other themes can continue accepting arbitrary
TS. Exhaustiveness checking can be configured separately with
`@typescript-eslint/switch-exhaustiveness-check`; this preset does not enable
it or require the corresponding plugin.

## What stays visible

Outside the import, switch, and equality readings, keywords, modifiers, decorators, types, generic arguments
and constraints, receivers, operators, and jumps retain their TypeScript
meaning and spelling. `const` and `let`, `of` and `in`,
`return` and a final expression remain distinct. Unsupported switches keep
their separate labels, breaks, and fallthrough in ordinary TS form.
Standalone blocks keep their braces and scope.

Expressions, variable and field declarations, exports, type
expressions, namespaces, and other undesigned kinds use the source
fallback. It preserves their text while dispatching children, so an arrow
inside a call or a method inside an object literal can still get designed
layout. There are no fallback text edits. This is a complete selectable
theme with coverage through fallback, not a replacement TypeScript printer
with a bespoke component for every syntax kind.

The theme depends only on core, not on Ruby's components or rules. All
identifiers carry core's semantic roles. Designed nodes carry `NodeSpan`
identity so hover and matching-node highlighting continue to work.

## Comments and tests

Children normally go through `Render`. `common.tsx` supplies `Child` for
inline headers: if a child's attached comments include `//`, it dispatches
the child and writes the comments with terminating newlines. Reflowing a
parameter list must not let a line comment swallow a comma, parameter, or
closing parenthesis. Blocks are rendered as children, so comments attached
to the blocks themselves are kept as well as the comments inside them.

`test/layout.test.tsx` checks visible layout, fallback, identity, and
semantic roles. `test/preservation.test.tsx` renders all demo samples and
additional syntax/comment cases with the switch and equality readings disabled,
reparses the result, and checks syntax
structure (excluding omitted file imports), literal values, declaration
kinds, and the ordered comments.
The full theme is checked for missing, duplicated, or reordered comments.
`test/switch.test.tsx` checks the shared contract against both rendering and
ESLint, precise diagnostics, fallback, nested control flow, scope, comments,
node identity, and the absence of unsafe autofixes. The original AST is
never modified. `test/imports.test.tsx` covers omitted declarations,
retained comments, fallback behavior, and the header entry point; core's
import tests cover symbol lookup and the hover content.
`test/equality.test.tsx` checks the whole-file guard, nested expressions,
comments and literal text, hover identity, independent files, and the combined
lint preset, including the absence of null exceptions and lint-disable fallback.
