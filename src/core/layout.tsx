import type ts from 'typescript'
import { createContext } from 'preact'
import type { Ctx } from './types'
import { Render } from './render'
import { VerbatimScope } from './verbatim'
import { leadingComments, trailingComments, type Comment } from './comments'

/**
 * The layout vocabulary components build from. Layout is HTML structure
 * plus CSS, not whitespace: a Line is a block, an Indent pads its contents.
 * Both start a fresh VerbatimScope so fallback text inside lines up.
 */

/**
 * The node a Line was laid out for, when it was laid out for one. A
 * component rendering that node can tell it has the line to itself (up to
 * trailing comments), which is how the Ruby theme knows a `;` closes a line.
 */
export const LineOwner = createContext<ts.Node | null>(null)

export function Line({
  node = null,
  children,
  ...attrs
}: { node?: ts.Node | null; children?: preact.ComponentChildren } & Record<`data-${string}`, string | undefined>) {
  return (
    <VerbatimScope.Provider value={null}>
      <LineOwner.Provider value={node}>
        <div class="line" {...attrs}>
          {children}
        </div>
      </LineOwner.Provider>
    </VerbatimScope.Provider>
  )
}

export function Indent({ children }: { children?: preact.ComponentChildren }) {
  return (
    <VerbatimScope.Provider value={null}>
      <div class="indent">{children}</div>
    </VerbatimScope.Provider>
  )
}

export function CommentText({ comment }: { comment: Comment }) {
  return <span class="comment">{comment.text}</span>
}

/** Render nodes inline with a separator between them: parameters, type arguments. */
export function Join({ nodes, sep, ctx }: { nodes: readonly ts.Node[] | undefined; sep: string; ctx: Ctx }) {
  return (
    <>
      {(nodes ?? []).map((n, i) => (
        <>
          {i > 0 && sep}
          <Render key={n.pos} node={n} ctx={ctx} />
        </>
      ))}
    </>
  )
}

/**
 * Statement-like nodes, one per Line, with their comments: leading
 * comments get lines of their own, a trailing comment stays on the line.
 * A blank line in the source between two nodes is kept as a gap, since
 * authors use those to group.
 */
export function Lines({ nodes, ctx }: { nodes: readonly ts.Node[]; ctx: Ctx }) {
  const { sourceFile } = ctx
  const lineOf = (pos: number) => sourceFile.getLineAndCharacterOfPosition(pos).line
  return (
    <>
      {nodes.map((n, i) => {
        const prev = nodes[i - 1]
        const comments = leadingComments(n, sourceFile)
        const first = comments[0]?.pos ?? n.getStart(sourceFile)
        const gap = prev !== undefined && lineOf(first) - lineOf(prev.end) > 1
        return (
          <>
            {comments.map((c, j) => (
              <Line key={`c${n.pos}-${j}`} data-gap={gap && j === 0 ? '' : undefined}>
                <CommentText comment={c} />
              </Line>
            ))}
            <Line key={n.pos} node={n} data-gap={gap && comments.length === 0 ? '' : undefined}>
              <Render node={n} ctx={ctx} />
              {trailingComments(n, sourceFile).map((c, j) => (
                <>
                  {' '}
                  <CommentText key={j} comment={c} />
                </>
              ))}
            </Line>
          </>
        )
      })}
    </>
  )
}
