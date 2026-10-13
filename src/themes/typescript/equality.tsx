import ts from 'typescript'
import { claim, type NodeProps } from '../../core'

type StrictEquality = ts.Token<ts.SyntaxKind.EqualsEqualsEqualsToken | ts.SyntaxKind.ExclamationEqualsEqualsToken>

function containsLooseEquality(node: ts.Node): boolean {
  if (ts.isBinaryExpression(node)
    && (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken
      || node.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsToken)) return true
  return !!ts.forEachChild(node, (child) => containsLooseEquality(child) || undefined)
}

// Source files are immutable for rendering. Scan the entire AST once per file,
// including later statements and nested bodies, before shortening any operator.
const eligibleFiles = new WeakMap<ts.SourceFile, boolean>()

function canSimplify(file: ts.SourceFile): boolean {
  let eligible = eligibleFiles.get(file)
  if (eligible === undefined) {
    eligible = !containsLooseEquality(file)
    eligibleFiles.set(file, eligible)
  }
  return eligible
}

function TypeScriptEquality({ node }: NodeProps<StrictEquality>) {
  return <>{node.kind === ts.SyntaxKind.EqualsEqualsEqualsToken ? '==' : '!='}</>
}

export const typescriptEquality = claim(
  (node, ctx): node is StrictEquality =>
    (node.kind === ts.SyntaxKind.EqualsEqualsEqualsToken || node.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken)
    && canSimplify(ctx.sourceFile),
  TypeScriptEquality,
  'Strict comparison: `===` reads as `==`, `!==` as `!=`. This file contains no loose equality operators; TypeScript semantics are unchanged.',
)
