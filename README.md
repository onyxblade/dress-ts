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
                   compose() stacks transforms on a base resolver; claim(guard, Component, note?) is the
                   usual transform, and with a note marks the output as a Reading, a form the source never
                   had; withTransforms() scopes transforms to one component's subtree
  identity.ts      nodeId(): a node's identity, the same in any reading of the file; parseNodeId() and
                   nodeById() take a page from the DOM back to the node
  verbatim.tsx     Verbatim: the fallback for undesigned kinds, shows original text, with a theme's edits to
                   the text between children; NodeSpan tags every node with its kind and identity
  layout.tsx       Line, Indent, Join, Lines: the layout vocabulary; LineOwner says which node a Line is for,
                   and the line carries that node's identity, so designed components need not
  comments.tsx     attachComments(): where each comment of the file belongs, since the semantic AST has none
  program.ts       createMemoryService(): a ts.LanguageService over files given as text, libs supplied by the
                   caller; createMemoryProgram() is its program, for a caller that only renders
  semantic.tsx     semanticIdentifiers: every identifier tagged with its role from the checker
  quickInfo.tsx    quickInfoAt(): what an editor shows on hover, from the service; QuickInfo lays it out
  kind.ts          kindName(): readable SyntaxKind names (avoids aliases like FirstStatement)
  testing.tsx      renderText() / renderHtml() / lostComments() for tests; not re-exported from index to keep
                   it out of the bundle
src/themes/<name>/ one folder per theme, self-contained, not meant to be merged with other themes
  ruby/            TypeScript read with Ruby's eyes: `def ... end`, `class A < B ... end`, `interface ... end`, `def constructor`, `return 0 if x`,
                   `Foo.new(a)`, `Set[string]`, `self` and `@x`, no `const`, no `private`, no line-ending `;`
  ruby/README.md   the theme's readings and the decision behind each; this file covers only the core
  ruby/test/       the theme's own tests, so the folder can be published as a unit
src/themes/index.ts the list of themes the demo page offers; a new theme folder adds itself here
src/app.tsx        demo page: sample.ts twice, side by side, each pane choosing a view; the two views that are
                   not themes are the baselines `source` (Verbatim only) and `typed` (Verbatim plus the checker);
                   hovering a node on one side marks the same node on the other, by nodeId, and shows a card
                   at once: the quick info of the token under the pointer, or the reading that node is shown
                   in and the node as written; a click pins the card, Escape lets it go
src/main.tsx       bundle the lib files, build a program over sample.ts, mount the page
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

export const rubyFunction = claim(isFunction, RubyFunction, '`function f() { ... }` reads as `def f() ... end`')

// src/themes/ruby/index.ts
export const ruby: Theme = { name: 'ruby', transforms: [rubySourceFile, rubyFunction, rubyClass, rubyIf] }
```

`def`, the parens, the separator and `end` are the component's own output.
It reads `node.parameters` and `node.body.statements`, hands each child to
`<Render>`, and never asks where the `function` keyword was. The header is
inline rather than a `Line`, so the same component works as a statement
(where the parent's `Lines` already gives it a line) and as an expression
(where it continues the line it appears on).

The note on the `claim` is the reading's own description, and it marks the
component's output: `claim` wraps it in a `Reading`, a span with no box of
its own (`display: contents`) carrying the note and the node's identity.
A reader should be able to tell what a theme rewrote from what the file
says, and the mark is where that comes from. The stylesheet tints the
words inside a mark that are not inside a node span, which is exactly the
theme's own words: `def`, `end`, `.new`, since every word of the source
sits in a node span and takes the ink colour back. The page shows the note
and the node as written when the pointer is on those words. A transform
that only tags the source text, like `semanticIdentifiers`, has no note and
leaves no mark. An edit to verbatim text (see The fallback) is a reading
too, and `Verbatim` marks the node the same way.

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
  `Verbatim`, or `Lines`, which gives each a line of its own, or the
  node's line when it was there (see Comments).
- Multi-line verbatim text is shown relative to the indentation of its
  first line, so an undesigned `if` block placed under an `Indent` lines up
  with its designed siblings. `Line` and `Indent` reset that scope.

A theme can also supply its own fallback for the kinds it has not
designed: `Verbatim` with *edits*, replacements of source ranges in the
text between children, which is the text no child's component owns. An
edit is `{ from, to, text, note }`; a theme's fallback computes the edits
for the node it is given and hands them to `Verbatim`, which applies them
all, since a node can need several at once. The Ruby theme's fallback
drops a `;` that closes a line and respells `Set<string>` as
`Set[string]` this way; its README has the rules.

Each edit carries a note, and a node an edit applied to is wrapped in a
`Reading` mark with the notes of its edits, like a designed component's
output: the pointer on `[` in `Set[string]` gets the card with
`` `Set<string>` reads as `Set[string]` `` and the node as written. The
text an edit wrote is tinted like the theme's own words, through a span
of its own, since inside a node span the ink is the source's. An edit
that writes nothing, a dropped `;`, leaves no word to tint or to point
at; the mark on the node still answers, on its keyword or the end of its
line.

A designed component would never write the token an edit removes in the
first place; the rules cover the kinds nobody has designed yet.

A theme whose output is not text would supply a fallback of its own kind,
such as a box showing the source.

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
- `Lines` lays its list out as one flat sequence of lines: a leading
  comment above the statement gets a line of its own, one on the
  statement's line stays there with the trailing ones, and, given the node
  the list is the body of (`within`), the sequence ends with that node's
  dangling comments. A blank line in the source between any two of these
  lines is kept as a gap, so the grouping an author did with blank lines
  survives, between comments as much as between statements.

What a designed component can still get wrong is skipping a node (rendering
its grandchildren directly, so nobody renders the comments attached to the
child) or leaving out `within`. `lostComments()` in `testing.tsx` lists the
comments of a source that its rendering does not show, and each theme's
tests assert it is empty over the sample and over its own inputs. A
component that does skip a node, as the Ruby theme's `if` does with its
branch blocks and its `@x` with the `this`, emits that node's comments
itself, with `CommentText`, at the nearest place it writes.

A `//` comment attached to a node that `Join` renders inline, as in a
multi-line parameter list, is shown inline too: nothing is lost, but the
line layout for such lists is still to be designed.

## Types

The syntax tree cannot tell `Options` the interface from `options` the
parameter, or say what `await readFile(path)` evaluates to. The type
checker can, and it is the compiler's own: a program over the file plus
the compiler's `lib.*.d.ts`, then `program.getTypeChecker()`. Nothing is
written to the tree a component sees; the binder keeps its symbols in
fields of its own.

`createMemoryService(files, libs)` in `program.ts` is the whole bridge: a
`LanguageServiceHost` that answers from a map of file texts and asks the
caller for lib text by name. The service builds the program components
render from (`createMemoryProgram` is that program, for a caller that
needs nothing else) and answers the editor-level questions that take a
file *and* a position, quick info first. Where lib text comes from is the
environment's business. Tests read it from the installed `typescript`
package; `main.tsx` bundles the ES2022 chain with `import.meta.glob` (about
half a megabyte next to the compiler's nine; DOM would add two more). A
shared `DocumentRegistry` parses each lib once per process, so a service
per test costs a few milliseconds. `createCtx(program, fileName, resolve)`
takes the file from the program, since the checker only knows the nodes it
bound.

Imports the program cannot see (`node:fs` in the sample) are diagnostics,
and what they bring in is typed `any`. The checker answers everything else
around them, so a component treats `any` as "unknown", never as a fact.

A claim can depend on the checker too: `claim`'s guard gets the ctx, so
a theme can claim `this.x` only when the checker says `x` is a field, as
the Ruby theme does for `@x`, and leave a method call to the next layer.

`semanticIdentifiers` in `semantic.tsx` is the first reading effect built
on it: a transform that claims every identifier and tags it with its role
(`class`, `type`, `namespace`, `function`, `value`, `unresolved`, resolved
through imports). The transform never changes the text a reader sees, so
a theme opts in by adding it to its list, as the Ruby theme does. A
transform that *decides* by type, say rendering a call differently when it
returns a `Promise`, has `ctx` in hand already: `(next) => (node, ctx) =>
...`.

What a token *is* belongs to the hover, and that is the service's quick
info, the same answer an editor shows: the declaration form, `(method)
Walker<T>.walk(path?: string): AsyncGenerator<string>`, then the JSDoc and
its tags. Since the service answers at a position, `x` after `if (x ===
null) return` is already narrowed. `quickInfoAt(service, fileName, range)`
in `quickInfo.tsx` asks for the token filling `range`, so a hover over
`return x` is not answered with `x`, and the page gets the range from the
hovered span's `nodeId`, so the rendering carries nothing but identity:
the card is composed when the pointer arrives, on either side, and
`QuickInfo` lays it out with each display part tagged by kind for the
stylesheet.

Further effects the same ingredients make possible: inferred types shown
inline where an annotation is missing; a link from each use to its
declaration (`symbol.declarations`); the resolved signature of a call among
its overloads; the file's semantic diagnostics placed on the statement
that owns the line; references across the files the service is given.

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
pnpm dev        # sample.ts side by side; ?left=source&right=ruby picks the views
pnpm test       # vitest
pnpm typecheck  # tsc
```

The same page is published at https://onyxblade.github.io/dress-ts/ by
`.github/workflows/pages.yml` on every push to `main` (typecheck, tests,
build, deploy). `GITHUB_PAGES=1` makes the build use `/dress-ts/` as its base.
