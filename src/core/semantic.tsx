import ts from 'typescript'
import type { NodeProps } from './types'
import { NodeSpan } from './verbatim'
import { claim } from './render'

/**
 * What an identifier names, as the checker sees it. The parser cannot tell
 * `Options` the interface from `options` the parameter, or an import that
 * resolves from one that does not; the symbol can.
 */
export type Role = 'class' | 'type' | 'namespace' | 'function' | 'value' | 'unresolved'

export function roleOf(node: ts.Identifier, checker: ts.TypeChecker): Role | undefined {
  let symbol = checker.getSymbolAtLocation(node)
  if (!symbol) return undefined
  // An import names whatever it imports; follow it. An import of a module
  // the program cannot see resolves to a symbol with no declarations.
  if (symbol.flags & ts.SymbolFlags.Alias) {
    symbol = checker.getAliasedSymbol(symbol)
    if (!symbol.declarations?.length) return 'unresolved'
  }
  const { flags } = symbol
  // A symbol can merge several meanings (class + interface, function +
  // namespace); the first match below is the one the reader cares about.
  if (flags & ts.SymbolFlags.Class) return 'class'
  if (flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias | ts.SymbolFlags.TypeParameter | ts.SymbolFlags.Enum))
    return 'type'
  if (flags & ts.SymbolFlags.Module) return 'namespace'
  if (flags & (ts.SymbolFlags.Function | ts.SymbolFlags.Method)) return 'function'
  return 'value'
}

/**
 * An identifier tagged with its role: the smallest reading effect the
 * checker buys. The text is the source's own, so a file with no other
 * transform still renders to itself. What the identifier's type is belongs
 * to the hover, see quickInfo.tsx; the tag is what the page can colour.
 */
export function SemanticIdentifier({ node, ctx }: NodeProps<ts.Identifier>) {
  const { checker, sourceFile } = ctx
  return (
    <NodeSpan node={node} data-role={roleOf(node, checker)}>
      {sourceFile.text.slice(node.getStart(sourceFile), node.end)}
    </NodeSpan>
  )
}

/** Every identifier, wherever it is, carries its role. A theme opts in by listing this transform. */
export const semanticIdentifiers = claim(ts.isIdentifier, SemanticIdentifier)
