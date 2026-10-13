import ts from 'typescript'
import { Reading, Verbatim, claim, withTransforms, type Ctx, type Edit, type NodeProps } from '../../core'
import './bindings.css'

const constNote = 'Solid underline: const binding; the name cannot be reassigned, but its value may still be mutable.'
const readonlyNote = 'Dotted underline: readonly property; assignments are restricted by TypeScript, without making the value deeply immutable.'

/** Destructuring marks local bindings, never property keys or default values. */
function boundNames(name: ts.BindingName): ts.Identifier[] {
  return ts.isIdentifier(name) ? [name] : name.elements.flatMap((element) =>
    ts.isBindingElement(element) ? boundNames(element.name) : [],
  )
}

/** Preserve the name's normal component, identity, and semantic color. */
function markNames(ctx: Ctx, names: readonly ts.Node[], declaration: ts.Node, kind: 'const' | 'readonly', note: string): Ctx {
  const targets = new Set(names)
  return withTransforms(ctx, [(next) => (node, context) => {
    const Name = next(node, context)
    return targets.has(node) ? (props) => (
      <Reading node={declaration} note={note} detail>
        <span class="ts-binding" data-binding-kind={kind}><Name {...props} /></span>
      </Reading>
    ) : Name
  }])
}

/** Remove only whitespace after a hidden keyword, leaving every comment in its source gap. */
function afterKeyword(end: number, ctx: Ctx): number {
  const text = ctx.sourceFile.text
  while (end < text.length && /\s/.test(text[end])) end++
  return end
}

function ConstBindings({ node, ctx }: NodeProps<ts.VariableDeclarationList>) {
  const names = node.declarations.flatMap((declaration) => boundNames(declaration.name))
  // Empty destructuring has no name on which to retain the declaration kind.
  if (names.length === 0) return <Verbatim node={node} ctx={ctx} />
  const from = node.getStart(ctx.sourceFile)
  const edit: Edit = { from, to: afterKeyword(from + 'const'.length, ctx), text: '', note: constNote }
  return <Verbatim node={node} ctx={markNames(ctx, names, node, 'const', constNote)} edits={[edit]} />
}

export const typescriptConst = claim(
  (node): node is ts.VariableDeclarationList => ts.isVariableDeclarationList(node) &&
    (node.flags & ts.NodeFlags.BlockScoped) === ts.NodeFlags.Const,
  ConstBindings,
)

type ReadonlyDeclaration = ts.PropertyDeclaration | ts.PropertySignature | ts.ParameterDeclaration

function readonlyModifier(node: ReadonlyDeclaration) {
  return ts.getModifiers(node)?.find((modifier) => modifier.kind === ts.SyntaxKind.ReadonlyKeyword)
}

function isReadonlyDeclaration(node: ts.Node): node is ReadonlyDeclaration {
  if (!ts.isPropertyDeclaration(node) && !ts.isPropertySignature(node) &&
      !(ts.isParameter(node) && ts.isConstructorDeclaration(node.parent))) return false
  // Computed expressions and invalid parameter patterns have no single declared name.
  return (ts.isIdentifier(node.name) || ts.isPrivateIdentifier(node.name) ||
    ts.isStringLiteral(node.name) || ts.isNumericLiteral(node.name)) && !!readonlyModifier(node)
}

function ReadonlyBinding({ node, ctx }: NodeProps<ReadonlyDeclaration>) {
  const modifier = readonlyModifier(node)!
  const note = ts.isParameter(node)
    ? `${readonlyNote} This constructor parameter also declares and initializes a property.`
    : readonlyNote
  const marked = markNames(ctx, [node.name], node, 'readonly', note)
  const scoped = withTransforms(marked, [(next) => (child, context) => child === modifier ? () => null : next(child, context)])
  const edit: Edit = { from: modifier.end, to: afterKeyword(modifier.end, ctx), text: '', note }
  return <Verbatim node={node} ctx={scoped} edits={[edit]} />
}

export const typescriptReadonly = claim(isReadonlyDeclaration, ReadonlyBinding)
