import ts from 'typescript'

export const switchIssues = {
  label: 'Use a literal case label for the simplified switch reading; computed labels keep their TypeScript form.',
  defaultPosition: 'Put default last for the simplified switch reading.',
  defaultGroup: 'Give default its own body instead of sharing it with case labels.',
  declaration: 'Put case-level declarations inside a block so their scope is explicit.',
  break: 'Only a final, unlabelled break that exits this switch can be omitted; rewrite this earlier or labelled break explicitly.',
  fallthrough: 'This case group may run into the next one. End it with break, return, throw, or continue, or rewrite the shared work explicitly.',
} as const

export interface SwitchIssue {
  kind: keyof typeof switchIssues
  node: ts.Node
}

export interface SwitchGroup {
  clauses: ts.CaseOrDefaultClause[]
  /** A sole block keeps its scope, but uses the arm's braces. */
  block?: ts.Block
  statements: readonly ts.Statement[]
  closing?: ts.BreakStatement
}

export type SwitchAnalysis =
  | { supported: true; groups: SwitchGroup[] }
  | { supported: false; issues: SwitchIssue[] }

function literal(node: ts.Expression): boolean {
  if (ts.isParenthesizedExpression(node)) return literal(node.expression)
  if (ts.isPrefixUnaryExpression(node)) {
    return (node.operator === ts.SyntaxKind.MinusToken || node.operator === ts.SyntaxKind.PlusToken)
      && (ts.isNumericLiteral(node.operand) || (node.operator === ts.SyntaxKind.MinusToken && ts.isBigIntLiteral(node.operand)))
  }
  return ts.isStringLiteral(node) || ts.isNumericLiteral(node) || ts.isBigIntLiteral(node)
    || ts.isNoSubstitutionTemplateLiteral(node)
    || node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword
    || node.kind === ts.SyntaxKind.NullKeyword
}

/** A deliberately small proof: unknown control flow keeps the ordinary TS reading. */
function exits(node: ts.Statement | undefined): boolean {
  if (!node) return false
  if (ts.isReturnStatement(node) || ts.isThrowStatement(node) || ts.isContinueStatement(node)) return true
  if (ts.isBreakStatement(node)) return !node.label
  if (ts.isBlock(node)) return exits(node.statements.at(-1))
  return ts.isIfStatement(node) && exits(node.thenStatement) && exits(node.elseStatement)
}

function declaration(node: ts.Statement): boolean {
  return ts.isVariableStatement(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)
    || ts.isEnumDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)
    || ts.isModuleDeclaration(node) || ts.isImportEqualsDeclaration(node)
}

/** Find breaks of this switch without confusing them with nested loops, switches, or functions. */
function checkBreaks(node: ts.Node, closing: ts.BreakStatement | undefined, issues: SwitchIssue[], nested = 0): void {
  if (ts.isFunctionLike(node)) return
  if (ts.isBreakStatement(node)) {
    if (node.label || (nested === 0 && node !== closing)) issues.push({ kind: 'break', node })
    return
  }
  const boundary = ts.isSwitchStatement(node) || ts.isForStatement(node) || ts.isForInStatement(node)
    || ts.isForOfStatement(node) || ts.isWhileStatement(node) || ts.isDoStatement(node)
  ts.forEachChild(node, (child) => checkBreaks(child, closing, issues, nested + Number(boundary)))
}

/** Shared by the renderer and ESLint. Reads semantic fields and never changes the AST. */
export function analyzeSwitch(node: ts.SwitchStatement): SwitchAnalysis {
  const issues: SwitchIssue[] = []
  const groups: SwitchGroup[] = []
  const clauses = node.caseBlock.clauses
  let run: ts.CaseOrDefaultClause[] = []
  for (const [index, clause] of clauses.entries()) {
    if (ts.isCaseClause(clause) && !literal(clause.expression)) issues.push({ kind: 'label', node: clause.expression })
    if (ts.isDefaultClause(clause) && index !== clauses.length - 1) issues.push({ kind: 'defaultPosition', node: clause })
    for (const statement of clause.statements) {
      if (declaration(statement)) issues.push({ kind: 'declaration', node: statement })
    }
    run.push(clause)
    if (clause.statements.length === 0 && index !== clauses.length - 1) continue
    if (run.length > 1 && run.some(ts.isDefaultClause)) issues.push({ kind: 'defaultGroup', node: clause })
    const sole = clause.statements.length === 1 ? clause.statements[0] : undefined
    const block = sole && ts.isBlock(sole) ? sole : undefined
    const statements = block?.statements ?? clause.statements
    const last = statements.at(-1)
    const closing = last && ts.isBreakStatement(last) && !last.label ? last : undefined
    for (const statement of clause.statements) checkBreaks(statement, closing, issues)
    if (index !== clauses.length - 1 && !exits(last)) issues.push({ kind: 'fallthrough', node: clause })
    groups.push({ clauses: run, block, statements: closing ? statements.slice(0, -1) : statements, closing })
    run = []
  }
  return issues.length ? { supported: false, issues } : { supported: true, groups }
}
