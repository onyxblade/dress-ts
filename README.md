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
src/core/          building blocks shared by every theme
  testing.tsx      renderText() / renderHtml() for tests; not re-exported from index to keep it out of the bundle
  types.ts         NodeProps / Ctx / Resolve / Transform / Theme
  render.tsx       <Render> dispatches to a component; compose() stacks transforms on a base resolver;
                   withTransforms() scopes extra transforms to one component's subtree
  splice.tsx       spliceChildren(node, ctx, pick?): the text-splicing building block, where `pick` lets
                   a parent choose the component for specific direct children; NodeSpan: the kind-tagged
                   span; Splice: default component, with no transforms the output equals the input verbatim
  token.tsx        replaceToken(): render a token as different text; OmitToken: render a token as nothing
  kind.ts          kindName(): readable SyntaxKind names (avoids aliases like FirstStatement)
src/themes/<name>/ one folder per theme, self-contained, not meant to be merged with other themes
  ruby/            TypeScript read with Ruby's eyes: `def`, and `end` instead of braces on functions and classes
  ruby/test/       the theme's own tests, so the folder can be published as a unit
src/main.tsx       demo page: pick a theme, render sample.ts into a <pre>
test/core/         tests for the core building blocks
```

A theme is `{ name, transforms }`. It owns its components and its transform
order; the only things it shares with other themes are the core building
blocks. Mixing themes is deliberately not a goal: a theme is a coherent set
of reading decisions, and the way to get a different set is to copy a folder
and change it.

## Why Splice works the way it does

The compiler's `forEachChild` yields syntax nodes only: `function`, `(`, `,`,
`=>` and other tokens are invisible to it, and so are comments. Hand-writing a
component per kind just to put the tokens back would be a lot of work
unrelated to the research goal, and tokens that are not nodes can never be
claimed by a transform.

So children come from the services-layer `node.getChildren(sourceFile)`,
which lazily scans the node's range and materialises tokens (and `SyntaxList`
wrappers around node arrays) as real `ts.Node`s. The AST is still not
mutated; this is the same view the language service uses. JSDoc nodes are
dropped from the child list because their range overlaps the leading trivia
of the following token.

The default component then splices text: it takes the node's range
`[pos, end)`, replaces each child's range with a recursive `<Render>`, and
emits anything between children verbatim. Whitespace and comments live in
each token's leading trivia, so they need no special handling. Every node is
wrapped in `<span data-kind="...">`, which gives CSS and later transforms a
hook.

Only kinds that a transform wants to intervene on need a dedicated component.

## Shape of a transform

A transform claims the node that *owns* a decision and hands it to a
component. The component decides the layout of its subtree, then dispatches
the children it does not care about through the normal machinery.

```tsx
// src/themes/ruby/function.tsx
const Def = replaceToken('def')

const pickFunctionChild: PickChild = child => {
  if (child.kind === ts.SyntaxKind.FunctionKeyword) return Def
  if (ts.isBlock(child)) return RubyBody
  return undefined
}

function RubyFunction({ node, ctx }: NodeProps) {
  return <NodeSpan node={node}>{spliceChildren(node, ctx, pickFunctionChild)}</NodeSpan>
}

export const rubyFunction: Transform = next => (node, ctx) =>
  ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)
    ? RubyFunction
    : next(node, ctx)

// src/themes/ruby/index.ts
export const ruby: Theme = { name: 'ruby', transforms: [rubyFunction, rubyClass] }
```

There are two ways for a component to influence what is rendered below it,
and the difference is scope:

- `spliceChildren(node, ctx, pick)` lets it choose the component for
  specific *direct* children. Grandchildren are untouched. This is how
  `RubyFunction` hands its body to `RubyBody`, which in turn drops its own
  `{` and renders its own `}` as `end` without affecting the `if` blocks and
  object literals inside.
- `withTransforms(ctx, transforms)` stacks transforms onto the ctx passed
  down, so they apply to the *whole subtree*. Global and local decisions use
  the same mechanism; only the scope differs. Use it for things like "every
  identifier in here", not for structural rewrites.

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
