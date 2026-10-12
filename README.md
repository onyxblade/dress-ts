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
- No separate intermediate presentation tree. The UI component tree *is* the
  presentation tree: each component receives one `ts.Node`, decides how to
  draw itself, and chooses which children to hand to whom.
- The single extension point is `resolve(node, ctx) => Component`. A
  transform is middleware wrapped around `resolve`: it can claim a node by
  returning its own component, or defer to the next layer.

## Layout

```
src/core/
  types.ts    NodeProps / Ctx / Resolve / Transform
  render.tsx  <Render> dispatches to a component; compose() stacks transforms on a base resolver
  splice.tsx  Splice: default component, text splicing; with no transforms the output equals the input verbatim
  kind.ts     kindName(): readable SyntaxKind names (avoids aliases like FirstStatement)
src/main.tsx  demo page that renders sample.ts verbatim into a <pre>
test/         render-to-string tests asserting "tags stripped == original text"
```

## Why Splice works the way it does

`forEachChild` yields syntax nodes only: no `(`, `,`, `=>` tokens and no
comments. Hand-writing a component per kind just to put the tokens back would
be a lot of work unrelated to the research goal.

So the default component splices text: it takes the node's range `[pos, end)`,
replaces each child's range with a recursive `<Render>`, and emits the text
between children verbatim. Tokens, whitespace and comments all fall into the
"between" and need no special handling. Every node is wrapped in
`<span data-kind="...">`, which gives CSS and later transforms a hook.

Only kinds that a transform wants to intervene on need a dedicated component.

## Shape of a transform

```ts
const foldImports: Transform = next => (node, ctx) =>
  ts.isImportDeclaration(node) ? FoldedImport : next(node, ctx)

const resolve = compose(() => Splice, [foldImports, ...])
```

`transforms[0]` is outermost and gets the first chance to claim a node.
Transforms that span sibling nodes (e.g. collapsing consecutive guards into
one line) need the container component to group children before dispatching
them; that part has not been started.

## Commands

```
pnpm dev        # view sample.ts rendered verbatim
pnpm test       # vitest
pnpm typecheck  # tsc
```
