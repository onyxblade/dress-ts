import ts from 'typescript'
import { useContext } from 'preact/hooks'
import { LineOwner, Verbatim, claim, type NodeProps } from '../../core'

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

/**
 * Ruby ends a statement with the line, so a `;` that closes a line is
 * noise. This is a variant of the fallback, not a designed component: it
 * shows the node's text like Verbatim but stops before a line-ending
 * semicolon. A designed component for the same node would simply never
 * write one; this covers the many kinds nobody has designed yet.
 *
 * "Closes a line" is judged where the line comes from: the node owns a
 * Line from `Lines`, or, inside a verbatim region, it ends its source
 * line. The `;` between members of a one-line type literal is neither and
 * stays, since there it separates rather than terminates.
 */
export function WithoutSemicolon({ node, ctx }: NodeProps) {
  const { sourceFile } = ctx
  const ownsLine = useContext(LineOwner) === node
  const closes = sourceFile.text[node.end - 1] === ';' && (ownsLine || endsSourceLine(node, sourceFile))
  return <Verbatim node={node} ctx={ctx} end={closes ? node.end - 1 : node.end} />
}

/** The kinds a `;` can terminate: statements, class members, interface and type-literal members. */
const canEndInSemicolon = (n: ts.Node): n is ts.Statement | ts.ClassElement | ts.TypeElement =>
  ts.isStatement(n) || ts.isClassElement(n) || ts.isTypeElement(n)

/** `return 0;` reads as `return 0`. Goes last, so designed components claim first. */
export const rubySemicolons = claim(canEndInSemicolon, WithoutSemicolon)
