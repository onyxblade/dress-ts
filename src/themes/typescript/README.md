# The TypeScript theme

TypeScript's syntax, laid out from its AST, with imports moved to hover.
The first subtraction removes top-level import declarations from the code
while keeping their information available at use sites and in the header.

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
| `switch.tsx` | Switch bodies and individual case/default clauses |
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
  if (x === 0) {
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

## What stays visible

Outside those import declarations, keywords, modifiers, decorators, types, generic arguments
and constraints, receivers, operators, and jumps retain their TypeScript
meaning and spelling. `const` and `let`, `===` and `==`, `of` and `in`,
`return` and a final expression remain distinct. Switch labels stay
separate; breaks and fallthrough retain their ordinary TS representation.
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
additional syntax/comment cases, reparses the result, and checks syntax
structure (excluding omitted file imports), literal values, declaration
kinds, and the ordered comments.
It also checks `lostComments()` for missing comments. The original AST is
never modified. `test/imports.test.tsx` covers omitted declarations,
retained comments, fallback behavior, and the header entry point; core's
import tests cover symbol lookup and the hover content.
