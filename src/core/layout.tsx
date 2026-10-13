import type ts from 'typescript'
import { createContext } from 'preact'
import type { Ctx } from './types'
import { Dispatch, Render } from './render'
import { VerbatimScope } from './verbatim'
import { CommentText, type Comment } from './comments'

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

/** Comments on lines of their own, with a gap before the first when asked. */
export function CommentLines({ comments, gap = false }: { comments: readonly Comment[]; gap?: boolean }) {
  return (
    <>
      {comments.map((c, j) => (
        <Line key={c.pos} data-gap={gap && j === 0 ? '' : undefined}>
          <CommentText comment={c} />
        </Line>
      ))}
    </>
  )
}

/**
 * Statement-like nodes, one per Line, with their comments: leading
 * comments get lines of their own, a trailing comment stays on the line.
 * A blank line in the source between two nodes is kept as a gap, since
 * authors use those to group.
 *
 * `within` is the node the list is the body of (a block, a class, the
 * file). Comments after its last child dangle from it, in the AST's terms
 * from nothing, and are given lines at the end so they are not lost.
 */
export function Lines({ nodes, within, ctx }: { nodes: readonly ts.Node[]; within?: ts.Node; ctx: Ctx }) {
  const { sourceFile, comments } = ctx
  const lineOf = (pos: number) => sourceFile.getLineAndCharacterOfPosition(pos).line
  const gapBefore = (pos: number, prev: ts.Node | undefined) => prev !== undefined && lineOf(pos) - lineOf(prev.end) > 1
  const dangling = within ? comments.of(within).dangling : []
  const last = nodes[nodes.length - 1]
  return (
    <>
      {nodes.map((n, i) => {
        const { leading, trailing } = comments.of(n)
        const first = leading[0]?.pos ?? n.getStart(sourceFile)
        const gap = gapBefore(first, nodes[i - 1])
        return (
          <>
            <CommentLines comments={leading} gap={gap} />
            <Line key={n.pos} node={n} data-gap={gap && leading.length === 0 ? '' : undefined}>
              <Dispatch node={n} ctx={ctx} />
              {trailing.map((c) => (
                <>
                  {' '}
                  <CommentText key={c.pos} comment={c} />
                </>
              ))}
            </Line>
          </>
        )
      })}
      {dangling.length > 0 && <CommentLines comments={dangling} gap={gapBefore(dangling[0].pos, last)} />}
    </>
  )
}
