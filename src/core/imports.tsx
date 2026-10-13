import ts from 'typescript'

export type StaticImport = ts.ImportDeclaration | ts.ImportEqualsDeclaration

export const isStaticImport = (node: ts.Node): node is StaticImport =>
  ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node)

/** Source order includes side-effect and unused imports, which have no use-site hover. */
export const importsOf = (file: ts.SourceFile): StaticImport[] => file.statements.filter(isStaticImport)

function bindingOf(node: ts.Identifier, checker: ts.TypeChecker): { declaration: StaticImport; namespace: boolean } | undefined {
  const parent = node.parent
  const symbol = ts.isShorthandPropertyAssignment(parent) && parent.name === node
    ? checker.getShorthandAssignmentValueSymbol(parent)
    : ts.isExportSpecifier(parent)
      ? checker.getExportSpecifierLocalTargetSymbol(parent)
      : checker.getSymbolAtLocation(node)
  // Keep the local alias: resolving it would discard which module this file imported from.
  for (const declaration of symbol?.declarations ?? []) {
    if (ts.isImportEqualsDeclaration(declaration)) return { declaration, namespace: true }
    const imported = ts.isImportSpecifier(declaration) ? declaration.parent.parent.parent
      : ts.isImportClause(declaration) ? declaration.parent
      : ts.isNamespaceImport(declaration) ? declaration.parent.parent
      : undefined
    if (imported && ts.isImportDeclaration(imported)) return { declaration: imported, namespace: ts.isNamespaceImport(declaration) }
  }
}

/** Find an identifier's own import, respecting aliases, shadowing, and unresolved modules. */
export function importOf(node: ts.Node, checker: ts.TypeChecker): StaticImport | undefined {
  if (!ts.isIdentifier(node)) return undefined
  const own = bindingOf(node, checker)
  if (own) return own.declaration

  // `fs.readFile` and the type `fs.Dirent` also expose the namespace's import on the member.
  let qualifier: ts.Node = node
  const parent = node.parent
  if (ts.isPropertyAccessExpression(parent) && parent.name === node) qualifier = parent.expression
  if (ts.isQualifiedName(parent) && parent.right === node) qualifier = parent.left
  if (qualifier === node) return undefined
  while (ts.isPropertyAccessExpression(qualifier) || ts.isQualifiedName(qualifier)) {
    qualifier = ts.isPropertyAccessExpression(qualifier) ? qualifier.expression : qualifier.left
  }
  const root = ts.isIdentifier(qualifier) ? bindingOf(qualifier, checker) : undefined
  return root?.namespace ? root.declaration : undefined
}

/** The original declarations preserve module paths, aliases, type-only flags, and attributes. */
export function ImportInfo({ imports }: { imports: readonly StaticImport[] }) {
  return (
    <div class="import-info">
      <p class="label">{imports.length === 1 ? 'Import' : 'Imports'}</p>
      {imports.map((node) => <pre key={node.pos} class="import-declaration">{node.getText(node.getSourceFile())}</pre>)}
    </div>
  )
}
