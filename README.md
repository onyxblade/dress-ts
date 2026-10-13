# dress-ts

An exploration of how a TypeScript AST can be *re-presented* to be easier to
read and less noisy, for code review and for getting to know an unfamiliar
codebase.

This is not a ready-to-use tool. The goal is to make "how a given reading
effect is implemented" clear enough that someone can follow the idea and
build their own variant.

## Principles

- One-way AST -> HTML only. Rendering never mutates the AST. The AST comes
  from the official `typescript` compiler API.
- Components render from the **semantic** AST: a node's fields (`name`,
  `parameters`, `body`), never its tokens. `function`, `(`, `{` are not in
  the semantic tree, and a component that wants a keyword or a bracket
  writes it out itself. This keeps the door open to renderings that are not
  text at all.
- Layout is HTML structure plus CSS, not preserved whitespace. A line is a
  block, an indent is padding. Designed components discard the original
  line breaks; what a reader sees is the component's decision.
- No separate intermediate presentation tree. The UI component tree *is* the
  presentation tree: each component receives one `ts.Node`, decides how to
  draw itself, and dispatches the children it does not care about.
- The single extension point is `resolve(node, ctx) => Component`. A
  transform is middleware wrapped around `resolve`: it can claim a node by
  returning its own component, or defer to the next layer.
- The file is one file of a `ts.Program`, and `ctx.checker` is its type
  checker, so a component can ask what a name refers to and what type it
  has. The checker reads the same AST; it is the semantic layer the syntax
  tree does not carry, the way `ctx.comments` is for comments.

## Layout

```
src/core/          building blocks shared by every theme
  types.ts         NodeProps<N> / Ctx / Resolve / Transform / Theme
  render.tsx       <Render> dispatches to a component, with the child's comments; <Dispatch> without;
                   compose() stacks transforms on a base resolver; claim(guard, Component) is the usual
                   transform; withTransforms() scopes transforms to one component's subtree
  verbatim.tsx     Verbatim: the fallback for undesigned kinds, shows original text; NodeSpan
  layout.tsx       Line, Indent, Join, Lines: the layout vocabulary; LineOwner says which node a Line is for
  comments.tsx     attachComments(): where each comment of the file belongs, since the semantic AST has none
  program.ts       createMemoryProgram(): a ts.Program over files given as text, libs supplied by the caller
  semantic.tsx     semanticIdentifiers: every identifier tagged with its role from the checker, its type as a title
  kind.ts          kindName(): readable SyntaxKind names (avoids aliases like FirstStatement)
  testing.tsx      renderText() / renderHtml() / lostComments() for tests; not re-exported from index to keep
                   it out of the bundle
src/themes/<name>/ one folder per theme, self-contained, not meant to be merged with other themes
  ruby/            TypeScript read with Ruby's eyes: `def ... end` for functions and methods, `class ... end`,
                   `if ... elsif ... else ... end`, guards as `return 0 if x`, no line-ending `;`
  ruby/test/       the theme's own tests, so the folder can be published as a unit
src/main.tsx       demo page: bundle the lib files, build a program over sample.ts, pick a theme, render
test/core/         tests for the core building blocks
```

A theme is `{ name, transforms }`. It owns its components and its transform
order; the only things it shares with other themes are the core building
blocks. Mixing themes is deliberately not a goal: a theme is a coherent set
of reading decisions, and the way to get a different set is to copy a folder
and change it.

## A designed component

```tsx
// src/themes/ruby/function.tsx
export function RubyFunction({ node, ctx }: NodeProps<DefLike>) { // function declaration/expression or method
  return (
    <>
      <span class="header">
        {modifiers} def {node.asteriskToken && '*'}
        {node.name && <Render node={node.name} ctx={ctx} />}
        (<Join nodes={node.parameters} sep=", " ctx={ctx} />)
        {node.type && <>: <Render node={node.type} ctx={ctx} /></>}
      </span>
      {node.body && (
        <>
          <Indent><Lines nodes={node.body.statements} within={node.body} ctx={ctx} /></Indent>
          <Line>end</Line>
        </>
      )}
    </>
  )
}

export const rubyFunction = claim(isFunction, RubyFunction)

// src/themes/ruby/index.ts
export const ruby: Theme = { name: 'ruby', transforms: [rubySourceFile, rubyFunction, rubyClass, rubyIf] }
```

`def`, the parens, the separator and `end` are the component's own output.
It reads `node.parameters` and `node.body.statements`, hands each child to
`<Render>`, and never asks where the `function` keyword was. The header is
inline rather than a `Line`, so the same component works as a statement
(where the parent's `Lines` already gives it a line) and as an expression
(where it continues the line it appears on).

## The fallback

TypeScript has well over a hundred node kinds, and a theme designs only a
few. Everything else is rendered by `Verbatim`: the node's original text,
with its semantic children rendered recursively so a designed component can
still take over deep inside. Tokens, whitespace and comments between
children are emitted as they were. With no transforms at all, the whole file
renders to exactly its source, and the tests check that.

Two details make the fallback coexist with designed layout:

- A node's verbatim text starts *after* its leading trivia. Comments before
  a node belong to whoever lays the node out: the parent's gap text in
  `Verbatim`, or `Lines`, which gives each its own line (see Comments).
- Multi-line verbatim text is shown relative to the indentation of its
  first line, so an undesigned `if` block placed under an `Indent` lines up
  with its designed siblings. `Line` and `Indent` reset that scope.

A theme can also vary the fallback for kinds it has not designed. The Ruby
theme's `WithoutSemicolon` shows a statement's text like `Verbatim` but
stops before a `;` that closes the line, since Ruby ends a statement with
the line. Whether the `;` closes a line is a layout question, answered by
layout: the node owns a `Line` (the `LineOwner` context set by `Lines`),
or, inside a verbatim region, nothing but a trailing comment follows it in
the source. A designed component for `return` would never write the `;` in
the first place; the variant covers the kinds nobody has designed yet.

A theme whose output is not text would supply its own fallback, such as a
box showing the source.

## Comments

A reader can only trust a rendering that keeps every comment, and the
semantic AST keeps none: comments are trivia, found by position queries
around tokens. A designed component writes its own tokens, so a comment
that sat next to a `{` or a `)` in the source has nothing to follow unless
someone owns it.

`attachComments()` decides ownership once per file, the way Prettier does.
Every comment is placed among the semantic children of the innermost node
enclosing it: on the same line after a child it *trails* that child, before
a child it *leads* that child, and after the last child (or in a node with
no children, `function f() { // todo }`) it *dangles* from the enclosing
node. The result is `ctx.comments`.

The rule that follows is: the component rendering the enclosing node emits
the comments attached to its children.

- `Verbatim` does so already: its gap text holds them. It dispatches
  children bare, through `Dispatch`.
- `Render` emits the leading and trailing comments of the child it is
  handed, inline, so a designed component that puts a child somewhere keeps
  the child's comments without asking.
- `Lines` gives leading comments lines of their own, keeps a trailing one on
  the statement's line, and, given the node the list is the body of
  (`within`), ends with that node's dangling comments.

What a designed component can still get wrong is skipping a node (rendering
its grandchildren directly, so nobody renders the comments attached to the
child) or leaving out `within`. `lostComments()` in `testing.tsx` lists the
comments of a source that its rendering does not show, and each theme's
tests assert it is empty over the sample and over its own inputs. The Ruby
theme's `if` is the one place with such a skipped node, the branch blocks,
and puts their comments on the `else`/`elsif` line.

A `//` comment attached to a node that `Join` renders inline, as in a
multi-line parameter list, is shown inline too: nothing is lost, but the
line layout for such lists is still to be designed.

## Types

The syntax tree cannot tell `Options` the interface from `options` the
parameter, or say what `await readFile(path)` evaluates to. The type
checker can, and it is the compiler's own: `ts.createProgram` over the file
plus the compiler's `lib.*.d.ts`, then `program.getTypeChecker()`. Nothing
is written to the tree a component sees; the binder keeps its symbols in
fields of its own.

`createMemoryProgram(files, libs)` in `program.ts` is the whole bridge: a
`CompilerHost` that answers from a map of file texts and asks the caller
for lib text by name. Where lib text comes from is the environment's
business. Tests read it from the installed `typescript` package;
`main.tsx` bundles the ES2022 chain with `import.meta.glob` (about half a
megabyte next to the compiler's nine; DOM would add two more). Lib
SourceFiles are parsed once per process, so a program per test costs a
few milliseconds. `createCtx(program, fileName, resolve)` takes the file
from the program, since the checker only knows the nodes it bound.

Imports the program cannot see (`node:fs` in the sample) are diagnostics,
and what they bring in is typed `any`. The checker answers everything else
around them, so a component treats `any` as "unknown", never as a fact.

`semanticIdentifiers` in `semantic.tsx` is the first reading effect built
on it: a transform that claims every identifier and tags it with its role
(`class`, `type`, `namespace`, `function`, `value`, `unresolved`, resolved
through imports), with the type of a value as a hover title. Since the
checker answers at the point of use, the title of `x` after `if (x ===
null) return` is already narrowed. The transform never changes the text a
reader sees, so a theme opts in by adding it to its list, as the Ruby theme
does. A transform that *decides* by type, say rendering a call differently
when it returns a `Promise`, has `ctx` in hand already: `(next) => (node,
ctx) => ...`.

Further effects the same ingredients make possible: inferred types shown
inline where an annotation is missing; a link from each use to its
declaration (`symbol.declarations`); the resolved signature of a call among
its overloads; the file's semantic diagnostics placed on the statement
that owns the line. For references across a project or quick info, the
next layer up is `ts.createLanguageService`, which takes a similar in-memory
host and exposes the same program.

## Scoping

A component influences what is rendered below it in two ways, differing
only in scope:

- Direct composition: it renders a child with a specific component, as
  `RubyFunction` does with `Lines` for its body, or through `<Render>` to
  let the resolver decide.
- `withTransforms(ctx, transforms)` stacks transforms onto the ctx it passes
  down, so they apply to the whole subtree. Global and local decisions use
  the same mechanism.

`transforms[0]` is outermost and gets the first chance to claim a node.
Transforms that span sibling nodes (e.g. collapsing consecutive guards into
one line) are a container's job: `Lines` is where grouping would go.

## Commands

```
pnpm dev        # view sample.ts through the current theme
pnpm test       # vitest
pnpm typecheck  # tsc
```

