import ts from 'typescript'

export interface Comment {
  pos: number
  text: string
  /** True for `/* ... *​/`, false for `// ...`. */
  block: boolean
}

function toComments(text: string, ranges: ts.CommentRange[] | undefined): Comment[] {
  return (ranges ?? []).map((r) => ({
    pos: r.pos,
    text: text.slice(r.pos, r.end),
    block: r.kind === ts.SyntaxKind.MultiLineCommentTrivia,
  }))
}

/**
 * Comments between the previous token and this node, JSDoc included.
 * The semantic AST does not hold ordinary comments, so a component that
 * lays out nodes itself has to ask for them. A comment on the same line as
 * the previous node counts as trailing for that node, not leading for this.
 */
export function leadingComments(node: ts.Node, sourceFile: ts.SourceFile): Comment[] {
  return toComments(sourceFile.text, ts.getLeadingCommentRanges(sourceFile.text, node.pos))
}

/** Comments on the same line after this node. */
export function trailingComments(node: ts.Node, sourceFile: ts.SourceFile): Comment[] {
  return toComments(sourceFile.text, ts.getTrailingCommentRanges(sourceFile.text, node.end))
}
