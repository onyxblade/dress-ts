import ts from 'typescript'
import { useContext } from 'preact/hooks'
import type { Ctx } from './types'
import { VerbatimScope, childNodes, dedent, lineIndentAt } from './verbatim'

export interface Comment {
  pos: number
  end: number
  text: string
  /** True for `/* ... *​/`, false for `// ...`. */
  block: boolean
}

/**
 * The comments attached to one node. `leading` sit before it, `trailing`
 * after it on the same line, `dangling` inside it after its last child (or
 * inside an empty one): the comment in `function f() { // todo }`.
 */
export interface Attached {
  leading: Comment[]
  trailing: Comment[]
  dangling: Comment[]
}

const NONE: Attached = { leading: [], trailing: [], dangling: [] }

export interface CommentMap {
  /** Every comment in the file, in source order. */
  all: readonly Comment[]
  of(node: ts.Node): Attached
}

/**
 * Every comment in the file. The semantic AST has none, so this walks the
 * tokens: a comment is either in the leading trivia of the token after it
 * or, when it shares a line with the token before it, in that token's
 * trailing trivia. JSDoc nodes are skipped; their text is the leading
 * trivia of the declaration they document.
 */
export function allComments(sourceFile: ts.SourceFile): Comment[] {
  const text = sourceFile.text
  const byPos = new Map<number, Comment>()
  const add = (ranges: ts.CommentRange[] | undefined) => {
    for (const r of ranges ?? []) {
      byPos.set(r.pos, {
        pos: r.pos,
        end: r.end,
        text: text.slice(r.pos, r.end),
        block: r.kind === ts.SyntaxKind.MultiLineCommentTrivia,
      })
    }
  }
  const visit = (node: ts.Node) => {
    if (ts.isJSDoc(node)) return
    const children = node.getChildren(sourceFile)
    if (children.length === 0) {
      add(ts.getLeadingCommentRanges(text, node.pos))
      add(ts.getTrailingCommentRanges(text, node.end))
    }
    children.forEach(visit)
  }
  visit(sourceFile)
  return [...byPos.values()].sort((a, b) => a.pos - b.pos)
}

/** Semantic children for attachment: the end-of-file token is no place to hang a comment. */
const siblings = (node: ts.Node) => childNodes(node).filter((c) => c.kind !== ts.SyntaxKind.EndOfFileToken)

/**
 * Decide, once per file, which node each comment belongs to. A comment is
 * placed among the semantic children of the innermost node enclosing it:
 * on the same line after a child, it trails that child; before a child, it
 * leads that child; after the last child, it dangles from the enclosing
 * node. The component rendering the enclosing node is then responsible
 * for it: `Verbatim` through its gap text, a designed component through
 * `Render`, `Lines` and `Join`, which read this map.
 */
export function attachComments(sourceFile: ts.SourceFile): CommentMap {
  const text = sourceFile.text
  const map = new Map<ts.Node, Attached>()
  const slot = (node: ts.Node) => {
    let a = map.get(node)
    if (!a) map.set(node, (a = { leading: [], trailing: [], dangling: [] }))
    return a
  }
  const all = allComments(sourceFile)
  for (const c of all) {
    let enclosing: ts.Node = sourceFile
    let preceding: ts.Node | undefined
    let following: ts.Node | undefined
    for (;;) {
      let inner: ts.Node | undefined
      preceding = following = undefined
      for (const child of siblings(enclosing)) {
        const start = child.getStart(sourceFile)
        if (child.end <= c.pos) preceding = child
        else if (start >= c.end) {
          following = child
          break
        } else if (start <= c.pos && c.end <= child.end) {
          inner = child
          break
        }
      }
      if (!inner) break
      enclosing = inner
    }
    const sameLine = preceding !== undefined && !/[\r\n]/.test(text.slice(preceding.end, c.pos))
    if (preceding && sameLine) slot(preceding).trailing.push(c)
    else if (following) slot(following).leading.push(c)
    else slot(enclosing).dangling.push(c)
  }
  return { all, of: (node) => map.get(node) ?? NONE }
}

/**
 * A comment's text, shown relative to the indentation of the region it is
 * in, as `Verbatim` shows a node's text: the enclosing verbatim region's,
 * or, in designed layout where there is none, that of the comment's own
 * first line. A multi-line comment under an `Indent` then lines up
 * instead of carrying its source indentation on top of the layout's.
 */
export function CommentText({ comment, ctx }: { comment: Comment; ctx: Ctx }) {
  const width = useContext(VerbatimScope) ?? lineIndentAt(ctx.sourceFile.text, comment.pos)
  return <span class="comment">{dedent(comment.text, width)}</span>
}
