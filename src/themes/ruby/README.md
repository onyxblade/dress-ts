# The Ruby theme

TypeScript read with Ruby's eyes. The file keeps its names, types and
expressions; the shapes around them, keywords, brackets, the receiver,
take the form a Ruby reader expects. The theme is one folder: its
components, its fallback rules, its transform order and its tests, built
only on `src/core`. The core README explains the building blocks; this one
lists the readings and the decisions behind each.

```ts
// index.ts
transforms: [rubySourceFile, rubyFunction, rubyLastReturn, rubyClass, rubyInterface, rubyExtends, rubyIf, rubyNew, rubyVariables, rubyField, rubyParameterProperty, rubyInstanceVariable, rubyThis, rubyThisType, rubyModifier, rubyTypeParameter, rubyEquality, semanticIdentifiers, rubyFallback]
```

The order is outermost first. The designed components claim their kinds;
`semanticIdentifiers` (from core) tags every identifier with its role;
`rubyFallback` takes everything else.

## The readings

| file | reads | as |
| --- | --- | --- |
| `sourceFile.tsx` | the file | its statements one per line, comments and blank-line groups kept |
| `function.tsx` | `function f() { ... }`, a function expression, a method `m() { ... }`, `constructor() { ... }` | `def f() ... end`, `def constructor() ... end` |
| `return.tsx` | `return x` as the last line of a body | `x` |
| `return.tsx` | a last line that is not a `return` | the line, then `undefined` |
| `class.tsx` | `class A<T> extends B { ... }` | `class A[T] < B ... end` |
| `class.tsx` | `interface A<T> extends B { ... }` | `interface A[T] < B ... end` |
| `class.tsx` | `extends B` | `< B`, the `implements` left as written |
| `if.tsx` | `if (x) { ... } else if (y) { ... } else { ... }` | `if x ... elsif y ... else ... end` |
| `if.tsx` | `if (x) return 0` | `return 0 if x` |
| `new.tsx` | `new Foo<T>(a)` | `Foo[T].new(a)` |
| `variables.tsx` | `const x = 1`, `let x = 1`, `for (const x of xs)` | `x = 1`, `for (x of xs)` |
| `field.tsx` | `private readonly x = v` | `@x = v` |
| `field.tsx` | `constructor(private x: T)` | `constructor(@x: T)` |
| `this.tsx` | `this.x` on a field | `@x` |
| `this.tsx` | `this`, and the `this` type `f(): this` | `self`, `f(): self` |
| `modifiers.tsx` | `private readonly x`, `public m()`, `readonly root: string` | `x`, `def m()`, `root: string` |
| `generics.tsx` | `Set<string>`, `type Pair<T>`, `f<T>(x)` | `Set[string]`, `type Pair[T]`, `f[T](x)` |
| `generics.tsx` | `T extends object = {}` | `T < object = {}` |
| `equality.tsx` | `a === b`, `a !== b` | `a == b`, `a != b` |
| `semicolon.tsx` | `f();` at the end of a line, `a: T,` in an interface | `f()`, `a: T` |

Every reading is marked: `claim`'s note, or an edit's, is what the page
shows when the pointer is on the theme's own words.

### Functions and classes

`RubyFunction` writes `def`, the parens, `: type` and `end`; the
modifiers, name, `*`, `?`, type parameters, parameters, return type and
body are the node's. One component covers declarations, expressions,
methods and constructors, since TypeScript keeps the same fields on all
four; a constructor's `constructor` is a token, not a name node, so the
word is the component's, `def constructor(o: T)`, not `initialize`, since
the file's own calls say `new`. The header
is inline, not a `Line`, so the component works as a statement, where the
parent's `Lines` gives it a line, and as an expression, where it
continues the line it appears on. `RubyClass` is the same shape with
`class`, and with `interface`: an interface declaration carries the same
fields a class does, modifiers, name, type parameters, heritage clauses,
members, so the one component covers both and two claims name them. The
members are the node's, each on a line, so a member's closing `;` or `,`
goes the way a statement's does (see The fallback).

Ruby writes the superclass after `<`, `class A < B`, so `RubyExtends`
claims the `extends` heritage clause and writes `< ` before its types,
and an interface's `extends B, C` reads as `< B, C` the same way. An
`implements` clause has no Ruby form and stays as written. A type
parameter's constraint, `A<T extends B>`, is not a heritage clause and
keeps its `extends` in that test; through the whole theme it reads as `<`
too, by `rubyTypeParameter` (see Generics).

### The value of a body

Ruby returns the value of a method's last line, so the `return` of a
last `return x` is noise: `rubyLastReturn` claims that one statement and
shows its expression, `x`. Only the last statement of a function
declaration, a function expression or a method; a `return` earlier in
the body or inside an `if` block leaves early and keeps its word, a bare
`return` has no value to leave behind, and a constructor's body says
nothing about what `new` returns. An arrow function and an accessor are
shown as written, braces and all, so their `return` stays with them.

The same Ruby eye misreads a body whose last line is not a `return`: it
takes the line's value for the function's, and the function returns
`undefined`. So `RubyFunction` writes `undefined` on a last line of its
own, the value where Ruby reads it, with no `return`, as the last `return
x` has none; the mark is the last statement's, since that is the line
the reader would have misread. An empty body gets no such line,
Ruby's `nil` and this `undefined` saying the same nothing; neither does a
body whose last statement leaves on every path, a `throw`, a block
ending in a jump, an `if` whose both branches do. That much the syntax
says; the checker's flow analysis is not public, so an `if` chain that
returns from every branch without an `else` gets the line though the end
is unreachable.

### If

A guard, `if (x) return 0` with no `else` and no braces, reads in Ruby's
modifier form, `return 0 if x`, on the one line it has. The braces are
the author's signal: `if (x) { return 0 }` keeps the block form. A jump
(`return`, `throw`, `break`, `continue`) or a plain expression is a guard
body; anything else keeps the block form too.

`else if` is not a nested `if` with an `end` of its own but an `elsif`
line of the same construct, so `RubyIf` flattens the chain itself instead
of handing the nested statement to the resolver. The branch blocks are
never rendered as nodes, so the comments attached to them, `} // a`
before an `else`, go on the `else`/`elsif` line.

### Construction

`new Foo(a)` is a message to the class, `Foo.new(a)`. Type arguments stay
on the class, `Set[string].new()`, since they describe what is made rather
than the call. `new Foo` with no argument list reads as `Foo.new`, parens
left out as Ruby would.

### Variables

Ruby declares a variable by assigning to it, so `const`, `let` and `var`
are noise: `const x = 1` reads as `x = 1`. The keyword sits in the
`VariableDeclarationList`'s own range, so `rubyVariables` claims the
list and joins its declarations; the statement around it stays with the
fallback, which keeps an `export` or `declare` and drops the `;`, and a
`for (const x of xs)` reads as `for (x of xs)` by the same claim. Which
keyword it was is in the node as written, on hover.

### Fields and the receiver

`this` reads as `self`, and so does the `this` type of `set(k, v): this`,
since RBS names the receiver's type `self` as well, `def set: (K, V) ->
self`; the parser gives the type its own kind, so `rubyThisType` is a
second claim on the same word. A field of the receiver is an instance variable:
`this.seen` reads as `@seen`, and its declaration `private readonly seen
= new Set()` as `@seen = Set.new()`, the modifiers left out as everywhere
(see Modifiers) and the `@` saying the variable is the object's own.

A parameter property declares a field in the constructor's signature,
and the modifier is what makes it one, so there the modifier is not
noise but the `@`: `constructor(private readonly tokens: Token[]) {}`
reads as `def constructor(@tokens: Token[])`, the way Crystal writes it.
Without the `@` the constructor would read as empty and the `@tokens`
later in the class would come from nowhere. The `def` stays, being what
`new` takes; an `override` stays in front, as a field's `static` would.

Whether `this.x` is a field is the checker's answer, not the syntax's:
`rubyInstanceVariable`'s guard asks `ctx.checker` for the symbol of `x`
and claims the node only for a `Property`, a declared field or a
parameter property. A method or an accessor is not claimed, so
`this.walk(p)` and `this.size` read as `self.walk(p)` and `self.size`
through the fallback, since Ruby's `@walk(p)` is not a call. So does a
`this` the checker cannot place, outside any class.

Left as written on purpose, because `@x` would hide what they say:

- `this?.x` and `this.#p`, and a `#p = 1` declaration. Ruby's instance
  variables are private already, so `@p` would read well, but it would
  collide with a `this.p` in the same class.
- A field with a `static`, `abstract`, `declare` or `accessor` modifier,
  a decorated one, and a computed or string name. A `static x` could read
  as `@@x` later.

The `this` is not rendered, so a comment attached to it, `this./* c */x`,
goes before the `@`.

### Modifiers

Ruby says visibility apart from the method, `private` on a line of its
own, and has no `readonly`, so `public`, `private`, `protected` and
`readonly` are noise: `private readonly x = v` reads as `@x = v`,
`public m()` as `def m()`, an interface's `readonly root: string` as
`root: string`. Which modifiers a declaration had is in the node as
written, on hover. The one place the modifier says something is a
parameter property, where it reads as `@` (see Fields and the receiver);
with `rubyModifier` alone, `constructor(public readonly o: T)` reads as
`constructor(o: T)`. `static`, `abstract`, `override`, `async`, `export` and the rest
say something a reader wants in the text and stay; so does the `readonly`
of a type, `readonly string[]` or `{ readonly [K in T]: V }`, which is an
operator on the type, not a modifier of a declaration: `rubyModifier`
claims a modifier only from its parent's modifier list, and a mapped
type keeps its `readonly` in a slot of its own.

A designed component writes its modifiers through `Modifiers`, which
skips the noise and keeps the comments attached to it. A node shown
verbatim has the modifier as a child node, which no edit can reach, so
the reading is in two parts that go together: `rubyModifier` claims the
modifier itself and renders nothing, and the fallback rule
`droppedModifiers` drops the space that followed it, the only part in
the parent's gap text. A transform list with the fallback but without
`rubyModifier` would drop the space and keep the word.

### Equality

Ruby's `==` is already the strict one, so `===` reads as `==` and `!==`
as `!=`. The operator of a binary expression is a node of its own, so
`rubyEquality` claims the token and nothing else; the expression around
it stays with whoever has it. A TypeScript `==` is left as written, and
looks the same, but it carries no mark, where the read `==` says `===`
on hover.

### Generics

Ruby's type syntax writes a generic in square brackets, `Array[String]`,
`class Stack[T]`, so every type parameter or argument list is shown that
way, in two places. A designed component writes its own tokens, so it
writes the brackets: `TypeList` is what `RubyFunction`, `RubyClass` and
`RubyNew` put where the source had `<...>`. An undesigned node shown
verbatim gets them from the fallback rule `squareTypeLists` instead, see
below.

RBS writes a parameter's upper bound after `<`, `[T < Numeric]`, the same
`<` as a superclass, so `rubyTypeParameter` reads `T extends object = {}`
as `T < object = {}`, modifiers (`in`, `out`, `const`) and default kept.
A bare `T` is not claimed, since it reads as itself. The `U extends
string` of an `infer U extends string` is a type parameter to the parser
too, but it narrows a match rather than bounding a parameter, so it stays
as written; so does the `K in T` of a mapped type, whose constraint is
the keys `K` ranges over, and the `extends` of a conditional type, which
is no parameter at all.

## The fallback

`RubyVerbatim` is the core `Verbatim` with the theme's *edits*:
replacements of source ranges in the text between children, which is the
text no child's component owns. Each edit is a rule answering for one
node, and the one fallback applies every rule, since a node can need
several at once (`type Pair<T> = [T, T];` loses its `;` and respells its
`<T>`, `readonly x: T;` loses two words):

- `closingSemicolon` drops a `;` that closes the line, since Ruby ends a
  statement with the line, and likewise the `,` an interface or type
  literal member may end in instead. Whether it closes a line is a layout question,
  answered by layout: the node owns a `Line` (the `LineOwner` context set
  by `Lines`), or, inside a verbatim region, nothing but a trailing
  comment follows it in the source. The `;` between the members of a
  one-line type literal is neither and stays, since there it separates
  rather than terminates.
- `droppedModifiers` drops the space after a noise modifier, see
  Modifiers; the modifier itself is `rubyModifier`'s.
- `squareTypeLists` swaps the two delimiters of each type parameter or
  argument list the node carries. The parser leaves a list's range
  between its delimiters, so the `<` before it and the `>` after it sit
  in the gaps, where an edit can reach them; a nested list belongs to a
  nested node, which handles its own.

A designed component for `return` or for a type reference would never
write the `;` or the `<` in the first place; the rules cover the kinds
nobody has designed yet.

## Tests

`test/` holds one file per component or rule, plus `comments.test.tsx`,
which renders the samples and the theme's own inputs through the whole
theme and asserts `lostComments()` is empty. A test renders with the
transforms it is about and the fallback, `renderText(text, [rubyField,
rubyFallback])`, so the expected text shows only that reading.
