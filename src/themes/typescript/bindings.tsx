import ts from 'typescript'
import { Reading, Verbatim, withTransforms, type Ctx, type Edit, type NodeProps, type Transform } from '../../core'
import './bindings.css'

type BindingKind = 'const' | 'let' | 'var'

interface FoldedDeclaration {
  names: readonly ts.Node[]
  modifiers: readonly ts.Modifier[]
  labels: string[]
  original: ts.Node
  binding?: BindingKind
}

/** Resource-management declarations keep their keywords, including await using. */
function bindingKind(node: ts.VariableDeclarationList): BindingKind | undefined {
  switch (node.flags & ts.NodeFlags.BlockScoped) {
    case ts.NodeFlags.Const: return 'const'
    case ts.NodeFlags.Let: return 'let'
    case ts.NodeFlags.None: return 'var'
    default: return undefined
  }
}

/** Destructuring marks local bindings, never property keys or default values. */
function boundNames(name: ts.BindingName): ts.Identifier[] {
  return ts.isIdentifier(name) ? [name] : name.elements.flatMap((element) =>
    ts.isBindingElement(element) ? boundNames(element.name) : [],
  )
}

function variableNames(node: ts.VariableDeclarationList): ts.Identifier[] {
  return node.declarations.flatMap((declaration) => boundNames(declaration.name))
}

/** Static changes whether the member belongs to the class or each instance; keep it visible. */
function foldableModifiers(node: ts.Node): readonly ts.Modifier[] {
  return ts.canHaveModifiers(node)
    ? (ts.getModifiers(node) ?? []).filter((modifier) => modifier.kind !== ts.SyntaxKind.StaticKeyword)
    : []
}

/** Type operators, type parameters, computed names, and nameless declarations stay explicit. */
function declarationName(node: ts.Node): ts.Node | undefined {
  if (!(ts.isClassLike(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node) ||
    ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node) ||
    ts.isMethodSignature(node) || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node) ||
    ts.isPropertyDeclaration(node) || ts.isPropertySignature(node) || ts.isEnumDeclaration(node) ||
    ts.isModuleDeclaration(node) || (ts.isParameter(node) && ts.isConstructorDeclaration(node.parent)))) return
  const name = node.name
  if (name && (ts.isIdentifier(name) || ts.isPrivateIdentifier(name) ||
    ts.isStringLiteral(name) || ts.isNumericLiteral(name))) return name
}

function foldedDeclaration(node: ts.Node, ctx: Ctx): FoldedDeclaration | undefined {
  if (ts.isVariableDeclarationList(node)) {
    const binding = bindingKind(node)
    const names = variableNames(node)
    if (!binding || names.length === 0) return
    const original = ts.isVariableStatement(node.parent) ? node.parent : node
    const modifiers = foldableModifiers(original)
    return { names, modifiers: [], labels: [...modifiers.map((m) => m.getText(ctx.sourceFile)), binding], original, binding }
  }
  const modifiers = foldableModifiers(node)
  if (modifiers.length === 0) return
  const labels = modifiers.map((modifier) => modifier.getText(ctx.sourceFile))
  if (ts.isVariableStatement(node)) {
    const binding = bindingKind(node.declarationList)
    if (!binding || variableNames(node.declarationList).length === 0) return
    // The list below owns all name marks, including these statement modifiers.
    return { names: [], modifiers, labels: [...labels, binding], original: node, binding }
  }
  const name = declarationName(node)
  return name ? { names: [name], modifiers, labels, original: node } : undefined
}

function foldingNote(fold: FoldedDeclaration): string {
  const notes = [`Folded declaration: ${fold.labels.join(' ')}.`]
  if (fold.binding === 'const') notes.push('The binding cannot be reassigned; its value may still be mutable.')
  if (fold.binding === 'let') notes.push('A reassignable, block-scoped binding.')
  if (fold.binding === 'var') notes.push('A reassignable, hoisted binding scoped to its function, module, or script, rather than its block.')
  if (fold.labels.includes('readonly')) notes.push('Readonly restricts property assignment in TypeScript; it does not make the value deeply immutable.')
  if (ts.isParameter(fold.original)) notes.push('This constructor parameter also declares and initializes a property.')
  return notes.join(' ')
}

function HiddenModifier() { return null }

/** Shared by designed headers and the fallback; only this scoped resolver can hide a modifier. */
export function isFoldedModifier(node: ts.Node, ctx: Ctx): boolean {
  return ctx.resolve(node, ctx) === HiddenModifier
}

/** Remove only whitespace after a hidden keyword, leaving comments in their source gaps. */
function afterKeyword(end: number, ctx: Ctx): number {
  const text = ctx.sourceFile.text
  while (end < text.length && /\s/.test(text[end])) end++
  return end
}

/** Signatures and other fallback declarations retain all punctuation and trivia. */
export function TypeScriptVerbatim({ node, ctx }: NodeProps) {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) ?? [] : []
  const hidden = modifiers.filter((modifier) => isFoldedModifier(modifier, ctx))
  const note = `Folded declaration modifiers: ${hidden.map((modifier) => modifier.getText(ctx.sourceFile)).join(' ')}.`
  const edits: Edit[] = hidden.map((modifier) => ({
    from: modifier.end, to: afterKeyword(modifier.end, ctx), text: '', note,
  }))
  return <Verbatim node={node} ctx={ctx} edits={edits} />
}

/** One name mark and one ordered metadata list, regardless of how many details were folded. */
export const typescriptBindings: Transform = (next) => (node, ctx) => {
  const fold = foldedDeclaration(node, ctx)
  if (!fold) return next(node, ctx)
  const Original = next(node, ctx)
  const names = new Set(fold.names)
  const modifiers = new Set<ts.Node>(fold.modifiers)
  const note = foldingNote(fold)
  return (props) => {
    const scoped = withTransforms(props.ctx, [(resolve) => (child, context) => {
      if (modifiers.has(child)) return HiddenModifier
      const Name = resolve(child, context)
      return names.has(child) ? (nameProps) => (
        <Reading node={fold.original} note={note} detail>
          <span class="ts-binding" data-folded-modifiers={fold.labels.join(' ')}><Name {...nameProps} /></span>
        </Reading>
      ) : Name
    }])
    if (ts.isVariableDeclarationList(node) && fold.binding) {
      const from = node.getStart(ctx.sourceFile)
      const edit: Edit = { from, to: afterKeyword(from + fold.binding.length, ctx), text: '', note }
      return <Verbatim node={node} ctx={scoped} edits={[edit]} />
    }
    return <Original {...props} ctx={scoped} />
  }
}
