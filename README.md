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

## Layout

```
src/core/          building blocks shared by every theme
  types.ts         NodeProps<N> / Ctx / Resolve / Transform / Theme
  render.tsx       <Render> dispatches to a component; compose() stacks transforms on a base resolver;
                   claim(guard, Component) is the usual transform; withTransforms() scopes transforms
                   to one component's subtree
  verbatim.tsx     Verbatim: the fallback for undesigned kinds, shows original text; NodeSpan
  layout.tsx       Line, Indent, Join, Lines: the layout vocabulary
  comments.ts      leadingComments() / trailingComments(), since the semantic AST has none
  kind.ts          kindName(): readable SyntaxKind names (avoids aliases like FirstStatement)
  testing.tsx      renderText() / renderHtml() for tests; not re-exported from index to keep it out of the bundle
src/themes/<name>/ one folder per theme, self-contained, not meant to be merged with other themes
  ruby/            TypeScript read with Ruby's eyes: `def ... end` for functions and methods, `class ... end`,
                   `if ... elsif ... else ... end`
  ruby/test/       the theme's own tests, so the folder can be published as a unit
src/main.tsx       demo page: pick a theme, render sample.ts
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
          <Indent><Lines nodes={node.body.statements} ctx={ctx} /></Indent>
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
  `Verbatim`, or `Lines`, which asks `leadingComments()` and gives each its
  own line.
- Multi-line verbatim text is shown relative to the indentation of its
  first line, so an undesigned `if` block placed under an `Indent` lines up
  with its designed siblings. `Line` and `Indent` reset that scope.

A theme whose output is not text would supply its own fallback, such as a
box showing the source.

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
