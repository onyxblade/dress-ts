import ts from 'typescript'
import { useContext } from 'preact/hooks'
import { LineOwner, type Ctx, type Edit } from '../../core'

/**
 * Whether nothing but a trailing comment follows the node on its source
 * line. In a verbatim region the output lines are the source lines, so this
 * is what "at the end of the line" means there.
 */
function endsSourceLine(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  const text = sourceFile.text
  let p = node.end
  for (const c of ts.getTrailingCommentRanges(text, p) ?? []) p = c.end
  while (text[p] === ' ' || text[p] === '\t') p++
  return p >= text.length || text[p] === '\n' || text[p] === '\r'
}

/** The kinds a `;` can terminate: statements, class members, interface and type-literal members. */
const canEndInSemicolon = (n: ts.Node): n is ts.Statement | ts.ClassElement | ts.TypeElement =>
  ts.isStatement(n) || ts.isClassElement(n) || ts.isTypeElement(n)

/** The terminator the node ends in, if any: `;`, or the `,` an interface or type-literal member may use instead. */
function terminatorOf(node: ts.Node, text: string): string | undefined {
  const last = text[node.end - 1]
  if (last === ';' && canEndInSemicolon(node)) return last
  if (last === ',' && ts.isTypeElement(node)) return last
  return undefined
}

/**
 * Ruby ends a statement with the line, so a `;` that closes a line is
 * noise. This is a rule of the theme's fallback (see fallback.tsx), not a
 * designed component: the node's text is shown as written, minus a
 * line-ending semicolon. A designed component for the same node would
 * simply never write one; this covers the many kinds nobody has designed
 * yet.
 *
 * "Closes a line" is judged where the line comes from: the node owns a
 * Line from `Lines`, or, inside a verbatim region, it ends its source
 * line. The `;` between members of a one-line type literal is neither and
 * stays, since there it separates rather than terminates. A type member
 * may end in `,` instead, which is the same noise.
 *
 * Runs in the fallback's render, which is how it can read `LineOwner`.
 */
export function closingSemicolon(node: ts.Node, { sourceFile }: Ctx): Edit[] {
  const ownsLine = useContext(LineOwner) === node
  const terminator = terminatorOf(node, sourceFile.text)
  const closes = terminator !== undefined && (ownsLine || endsSourceLine(node, sourceFile))
  if (!closes) return []
  const note = terminator === ';' ? '`f();` reads as `f()`' : '`a: T,` reads as `a: T`'
  return [{ from: node.end - 1, to: node.end, text: '', note }]
}
