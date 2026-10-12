import ts from 'typescript'

// `ts.SyntaxKind[k]` returns whichever name was assigned last for a value,
// which for marker-aliased kinds is e.g. "FirstStatement" rather than
// "VariableStatement". Build a table that prefers the real names.
const names = new Map<number, string>()
for (const [name, value] of Object.entries(ts.SyntaxKind)) {
  if (typeof value !== 'number') continue
  if (/^(First|Last)[A-Z]/.test(name)) continue
  if (!names.has(value)) names.set(value, name)
}

/** Human-readable SyntaxKind name, e.g. "VariableStatement". */
export function kindName(kind: ts.SyntaxKind): string {
  return names.get(kind) ?? ts.SyntaxKind[kind]
}
